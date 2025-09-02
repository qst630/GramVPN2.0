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
  const calculatePrice = (originalPrice: number) => {
    if (promoValidation?.valid && promoValidation.promo_code) {
      const discount = promoValidation.promo_code.discount_percent;
      return Math.round(originalPrice * (1 - discount / 100));
    }
    return originalPrice;
  };

  // Get discount percentage
  const getDiscountPercent = () => {
    if (promoValidation?.valid && promoValidation.promo_code) {
      return promoValidation.promo_code.discount_percent;
    }
    return 0;
  };

  const handlePayment = () => {
    const validPromoCode = promoValidation?.valid ? promoCode : undefined;
    onShowPayment(selectedPlan, validPromoCode);
  };

  // Update plans with current prices
  const plansWithPrices = subscriptionPlans.map(plan => ({
    ...plan,
    currentPrice: calculatePrice(plan.price),
    originalPrice: plan.price,
    hasDiscount: promoValidation?.valid && getDiscountPercent() > 0
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
                    {plan.title} - 
                    {plan.hasDiscount && (
                      <span className="original-price">{plan.originalPrice} ₽</span>
                    )}
                    <span className={plan.hasDiscount ? 'discounted-price' : ''}> {plan.price} ₽</span>
                  </span>
                  {plan.hasDiscount && (
                    <span className="discount-badge">-{getDiscountPercent()}%</span>
                  )}
                </div>
                {plan.monthlyPrice && (
                  <span className="plan-monthly">{plan.monthlyPrice} ₽/мес</span>
                )}
              </div>
              {(plan.popular || plan.id === '365days') && (
                <div className="plan-badge">
                  {plan.popular ? 'Популярный' : 'Выгодный'}
                </div>
              )}
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
          <div className="promo-input-container">
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
        Оформить подписку
        {selectedPlanData?.hasDiscount && (
          <span className="button-discount"> (со скидкой {getDiscountPercent()}%)</span>
        )}
      </button>

      <div className="stats-section">
        <div className="stats-title">Приведи друзей и получи бонусы!</div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{referralStats.invited}</div>
            <div className="stat-label">приглашено</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{referralStats.daysEarned}</div>
            <div className="stat-label">дней получено</div>
          </div>
        </div>
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