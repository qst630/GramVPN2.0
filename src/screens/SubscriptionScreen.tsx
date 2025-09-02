import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useMarketing } from '../hooks/useMarketing';
import { PromoCodeValidation } from '../types/user';

interface SubscriptionPlan {
  type: string;
  name: string;
  days: number;
  price: number;
  monthlyPrice?: number;
  popular?: boolean;
  discount?: string;
}

interface SubscriptionScreenProps {
  subscriptionPlans: SubscriptionPlan[];
  onShowPayment: (planType: string, promoCode?: string) => void;
  onValidatePromoCode: (code: string) => Promise<{ valid: boolean; promo_code?: any; error?: string }>;
  user: any;
  referralStats: { invited: number; daysEarned: number };
}

type PlanType = '30days' | '90days' | '365days';

interface Plan {
  id: PlanType;
  title: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  monthlyPrice?: number;
  features: string;
  discount?: string;
  popular?: boolean;
  savings?: string;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ 
  subscriptionPlans,
  onShowPayment,
  onValidatePromoCode,
  user,
  referralStats 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('90days');
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [copied, setCopied] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);

  const referralCode = user?.referral_code || 'LOADING...';

  const handlePromoChange = async (value: string) => {
    setPromoCode(value);
    setPromoValidation(null);
    
    if (value.length >= 3) {
      setPromoLoading(true);
      try {
        const validation = await onValidatePromoCode(value);
        setPromoValidation(validation);
      } catch (error) {
        setPromoValidation({ valid: false, error: 'Ошибка проверки промокода' });
      } finally {
        setPromoLoading(false);
      }
    }
  };

  // Calculate price with discount
  const calculatePrice = (originalPrice: number, planType: string) => {
    if (promoValidation?.valid && promoValidation.promo_code && isPromoValidForPlan(planType)) {
      const discount = promoValidation.promo_code.discount_percent;
      const discountedPrice = Math.round(originalPrice * (1 - discount / 100));
      return Math.max(0, discountedPrice); // Ensure price doesn't go below 0
    }
    return originalPrice;
  };

  // Get discount percentage
  const getDiscountPercent = (planType?: string) => {
    if (promoValidation?.valid && promoValidation.promo_code && (!planType || isPromoValidForPlan(planType))) {
      return promoValidation.promo_code.discount_percent;
    }
    return 0;
  };

  // Check if promo code is valid for specific plan
  const isPromoValidForPlan = (planType: string) => {
    if (!promoValidation?.valid || !promoValidation.promo_code) {
      return false;
    }
    
    const validFor = promoValidation.promo_code.valid_for;
    
    // If valid_for is 'all', applies to all plans
    if (validFor === 'all') {
      return true;
    }
    
    // If valid_for contains the specific plan type
    if (validFor === planType) {
      return true;
    }
    
    // If valid_for contains multiple plans separated by comma
    if (validFor && validFor.includes(',')) {
      const validPlans = validFor.split(',').map(plan => plan.trim());
      return validPlans.includes(planType);
    }
    
    return false;
  };

  const handlePayment = () => {
    const validPromoCode = promoValidation?.valid && isPromoValidForPlan(selectedPlan) ? promoCode : undefined;
    onShowPayment(selectedPlan, validPromoCode);
  };

  // Update plans with current prices
  const plansWithPrices = subscriptionPlans.map(plan => ({
    ...plan,
    currentPrice: calculatePrice(plan.price, plan.type),
    originalPrice: plan.price,
    hasDiscount: promoValidation?.valid && isPromoValidForPlan(plan.type) && getDiscountPercent(plan.type) > 0
  }));

  const selectedPlanData = plansWithPrices.find(p => p.type === selectedPlan);

  const plans: Plan[] = [
    {
      id: '30days',
      title: '30 дней',
      price: plansWithPrices.find(p => p.type === '30days')?.currentPrice || 150,
      originalPrice: plansWithPrices.find(p => p.type === '30days')?.originalPrice || 150,
      hasDiscount: plansWithPrices.find(p => p.type === '30days')?.hasDiscount || false,
      features: 'Базовая защита'
    },
    {
      id: '90days',
      title: '90 дней',
      price: plansWithPrices.find(p => p.type === '90days')?.currentPrice || 350,
      originalPrice: plansWithPrices.find(p => p.type === '90days')?.originalPrice || 350,
      hasDiscount: plansWithPrices.find(p => p.type === '90days')?.hasDiscount || false,
      monthlyPrice: Math.round((plansWithPrices.find(p => p.type === '90days')?.currentPrice || 350) / 3),
      features: 'Премиум защита + скидка',
      popular: true
    },
    {
      id: '365days',
      title: '365 дней',
      price: plansWithPrices.find(p => p.type === '365days')?.currentPrice || 1100,
      originalPrice: plansWithPrices.find(p => p.type === '365days')?.originalPrice || 1100,
      hasDiscount: plansWithPrices.find(p => p.type === '365days')?.hasDiscount || false,
      monthlyPrice: Math.round((plansWithPrices.find(p => p.type === '365days')?.currentPrice || 1100) / 12),
      features: 'Максимальная выгода + бонусы'
    }
  ];

  const togglePromoInput = () => {
    setShowPromoInput(!showPromoInput);
    if (!showPromoInput) {
      setPromoCode('');
      setPromoValidation(null);
    }
  };

  const copyReferralCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralCode);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = referralCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      console.log('✅ Referral code copied:', referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="screen active">
      <div className="header">
        <h1>GramVPN</h1>
        <p>Выберите тариф для безопасного интернета</p>
      </div>

      <div className="plans-container">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-option ${plan.popular ? 'popular' : ''} ${
              selectedPlan === plan.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <div className={`plan-radio ${selectedPlan === plan.id ? 'selected' : ''}`}>
              {selectedPlan === plan.id && <div className="radio-dot" />}
            </div>
            <div className="plan-info">
              <div className="plan-main">
                <div className="plan-name-container">
                  <span className="plan-name">
                    {plan.title} - {
                      plan.hasDiscount && plan.price === 0 ? (
                        <>
                          <span className="original-price">{plan.originalPrice} ₽</span>
                          <span className="free-price"> Бесплатно</span>
                        </>
                      ) : plan.hasDiscount && plan.price > 0 ? (
                        <>
                          <span className="original-price">{plan.originalPrice} ₽</span>
                          <span className="discounted-price"> {plan.price} ₽</span>
                  {plan.hasDiscount && plan.price === 0 ? (
                    <span className="free-badge">
                      Бесплатно
                    </span>
                  ) : plan.hasDiscount && plan.price > 0 ? (
                    <span className="discount-badge">
                      -{getDiscountPercent(plan.id)}%
                    </span>
                  ) : null}
                  {plan.monthlyPrice && (
                    <span className="plan-monthly">
                      {plan.price === 0 ? 'Бесплатно' : `${plan.monthlyPrice} ₽/мес`}
                    </span>
                  )}
                </div>
                {(plan.popular || plan.id === '365days') && (
                  <div className="plan-badge">
                    {plan.popular ? 'Популярный' : 'Выгодный'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="promo-section">
        <div className="promo-checkbox-container" onClick={togglePromoInput}>
          <div className="promo-checkbox">
            <div className={`checkbox-square ${showPromoInput ? 'checked' : ''}`}>
              {showPromoInput && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path 
                    d="M10 3L4.5 8.5L2 6" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="promo-text">Есть промокод</span>
          </div>
        </div>
        
        {showPromoInput && (
          <div className="promo-input-container" style={{ marginBottom: promoValidation?.error ? '40px' : '16px' }}>
            <input
              type="text"
              className="promo-input"
              placeholder="Введите промокод"
              value={promoCode}
              onChange={(e) => handlePromoChange(e.target.value)}
            />
            {promoValidation?.valid && (
              <div className="promo-check valid">
                <Check size={12} />
              </div>
            )}
            {promoValidation?.error && (
              <div className="promo-check error">
                <X size={12} />
              </div>
            )}
            {promoValidation?.error && (
              <div className="promo-error-message">
                Промокод не найден или истек срок его действия
              </div>
            )}
          </div>
        )}
      </div>

      <button className="primary-button" onClick={handlePayment}>
        {selectedPlanData?.currentPrice === 0 ? 'Получить бесплатно' : 'Оформить подписку'}
        {selectedPlanData?.hasDiscount && selectedPlanData?.currentPrice > 0 && isPromoValidForPlan(selectedPlan) && (
          <span className="button-discount">
            {` (со скидкой ${getDiscountPercent(selectedPlan)}%)`}
          </span>
        )}
      </button>

      <div className="referral-section">
        <div className="referral-title">Приведи друзей и получи бонусы!</div>
      </div>

      <div className="referral-code">
        <span style={{ color: '#8892b0' }}>Ваш код:</span>
        <span style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          letterSpacing: '2px',
          color: '#6366f1',
          fontFamily: 'monospace'
        }}>
          {referralCode}
        </span>
        <button 
          className={`copy-button ${copied ? 'copied' : ''}`} 
          onClick={copyReferralCode}
        >
          <Copy size={12} />
          {copied ? 'Скопировано!' : 'Копировать'}
        </button>
      </div>
    </div>
  );
};