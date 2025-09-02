import React from 'react';
import { ArrowLeft, Users, Gift, Copy, Check } from 'lucide-react';
import { User } from '../types/vpn';

interface ReferralScreenProps {
  onBack: () => void;
  user: User | null;
  referralStats: { referrals_count: number; bonus_days_earned: number };
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({ 
  onBack, 
  user,
  referralStats 
}) => {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);

  const copyReferralCode = async () => {
    if (!user?.referral_code) return;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(user.referral_code);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = user.referral_code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      console.log('✅ Referral code copied:', user.referral_code);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  return (
    <div className="screen active">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      
      <div className="header" style={{ marginTop: '40px' }}>
        <h1>Реферальная программа</h1>
        <p>Приглашайте друзей и получайте бонусы</p>
      </div>

      <div className="referral-hero">
        <div className="referral-icon-container">
          <Gift className="referral-hero-icon" size={48} />
        </div>
        <h2>Зарабатывайте вместе с друзьями!</h2>
        <p>
          За каждого друга, который оформит подписку по вашей ссылке, 
          вы получите <strong className="bonus-highlight">+7 дней</strong> к своей подписке
        </p>
      </div>

      <div className="stats-section">
        <div className="stats-title">Ваша статистика</div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{referralStats.referrals_count}</div>
            <div className="stat-label">приглашено друзей</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{referralStats.bonus_days_earned}</div>
            <div className="stat-label">бонусных дней</div>
          </div>
        </div>
      </div>

      <div className="referral-code">
        <span style={{ color: '#8892b0' }}>Ваш реферальный код:</span>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          letterSpacing: '3px',
          color: '#6366f1',
          fontFamily: 'monospace'
        }}>
          {user?.referral_code || 'LOADING...'}
        </span>
        <button 
          className={`copy-button ${copied ? 'copied' : ''} ${copyError ? 'error' : ''}`} 
          onClick={copyReferralCode}
          disabled={!user?.referral_code}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Скопировано!' : copyError ? 'Ошибка!' : 'Копировать'}
        </button>
      </div>

      <div className="referral-steps">
        <h3 style={{ marginBottom: '16px', color: '#ffffff' }}>Как это работает:</h3>
        
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Поделитесь ссылкой</h4>
            <p>Отправьте свою реферальную ссылку друзьям в любом мессенджере</p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Друг оформляет подписку</h4>
            <p>Ваш друг переходит по ссылке и покупает любую подписку</p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Получаете бонусы</h4>
            <p>Вам автоматически добавляется <span className="bonus-highlight">7 дней</span> к подписке</p>
          </div>
        </div>
      </div>

      <div className="bonus-info">
        <h3 style={{ marginBottom: '12px', color: '#6366f1' }}>Дополнительные бонусы:</h3>
        <div className="bonus-list">
          <div className="bonus-item">
            <Gift size={16} />
            <span>Ваш друг получает скидку 30% на первую подписку</span>
          </div>
          <div className="bonus-item">
            <Users size={16} />
            <span>Неограниченное количество приглашений</span>
          </div>
          <div className="bonus-item">
            <Check size={16} />
            <span>Бонусы начисляются автоматически</span>
          </div>
        </div>
      </div>

      <div className="referral-tips">
        <h3>Советы для успешных приглашений:</h3>
        <ul>
          <li>Расскажите друзьям о преимуществах VPN</li>
          <li>Поделитесь своим опытом использования</li>
          <li>Упомяните о скидке 30% для новых пользователей</li>
          <li>Отправляйте ссылку в группы и каналы</li>
        </ul>
      </div>
    </div>
  );
};