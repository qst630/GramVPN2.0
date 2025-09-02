import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useMarketing } from '../hooks/useMarketing';
import { PromoCodeValidation } from '../types/user';

interface SubscriptionScreenProps {
  onShowPayment: () => void;
  user: any;
  referralStats: { invited: number; daysEarned: number };
}

type PlanType = '30days' | '90days' | '365days';

interface Plan {
  id: PlanType;
  title: string;
  price: number;
  monthlyPrice?: number;
  features: string;
  discount?: string;
  popular?: boolean;
  savings?: string;
}

const plans: Plan[] = [
  {
    id: '30days',
    title: '30 дней',
    price: 150,
    features: 'Базовая защита'
  },
  {
    id: '90days',
    title: '90 дней',
    price: 350,
    monthlyPrice: 117,
    features: 'Премиум защита + скидка',
    discount: 'Экономия 100 ₽',
    popular: true
  },
  {
    id: '365days',
    title: '365 дней',
    price: 1100,
    monthlyPrice: 92,
    features: 'Максимальная выгода + бонусы',
    discount: 'Экономия 1730 ₽'
  }
];

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ 
  onShowPayment, 
  user,
  referralStats 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('90days');
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const { validatePromoCode, loading: promoLoading } = useMarketing();

  const referralCode = user?.referral_code || 'LOADING...';

  const handlePromoChange = async (value: string) => {
    setPromoCode(value);
    setPromoValidation(null);
    
    if (value.length >= 3) {
      const validation = await validatePromoCode(value);
      setPromoValidation(validation);
    }
  };

  const togglePromoInput = () => {
    setShowPromoInput(!showPromoInput);
    if (!showPromoInput) {
      setPromoCode('');
      setPromoValidation(null);
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
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
                <span className="plan-name">{plan.title} - {plan.price} ₽</span>
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
              <div className="promo-error">
                {promoValidation.error}
              </div>
            )}
            {promoLoading && (
              <div className="promo-loading">
                Проверка...
              </div>
            )}
          </div>
        )}
      </div>

      <button className="primary-button" onClick={onShowPayment}>
        {promoValidation?.valid 
          ? `Оформить со скидкой ${promoValidation.campaign?.value}%` 
          : 'Оформить подписку'
        }
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
        <span>{referralCode}</span>
        <button className="copy-button" onClick={copyReferralCode}>
          <Copy size={12} />
          Копировать
        </button>
      </div>
    </div>
  );
};