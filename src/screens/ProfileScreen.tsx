import React, { useState } from 'react';
import { ArrowLeft, User, Calendar, Crown, Gift, Copy, Check } from 'lucide-react';
import { User as UserType } from '../types/vpn';

interface ProfileScreenProps {
  onBack: () => void;
  user: UserType | null;
  subscriptionType: string | null;
  daysRemaining: number;
  hasActiveSubscription: boolean;
  telegramUser: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  onBack, 
  user, 
  subscriptionType,
  daysRemaining,
  hasActiveSubscription,
  telegramUser 
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  
  // Debug logging
  console.log('🔍 ProfileScreen props:', {
    user: !!user,
    subscriptionType,
    daysRemaining,
    hasActiveSubscription,
    telegramUser: !!telegramUser
  });

  const referralCode = user?.referral_code || 'LOADING...';
  
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getSubscriptionStatus = () => {
    if (subscriptionType === 'trial' && hasActiveSubscription) {
      return {
        status: 'Пробный период',
        color: '#10b981',
        icon: Gift,
        details: `Осталось ${daysRemaining} дн.`
      };
    }
    
    if (hasActiveSubscription) {
      return {
        status: 'Активная подписка',
        color: '#6366f1',
        icon: Crown,
        details: `Осталось ${daysRemaining} дн.`
      };
    }

    return {
      status: 'Нет активной подписки',
      color: '#94a3b8',
      icon: User,
      details: 'Оформите подписку для доступа'
    };
  };

  const subscriptionInfo = getSubscriptionStatus();
  const StatusIcon = subscriptionInfo.icon;

  // If no user data, show loading
  if (!user && !telegramUser) {
    return (
      <div className="screen active">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        
        <div className="header" style={{ marginTop: '40px' }}>
          <h1>Профиль</h1>
          <p>Загрузка данных...</p>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: '#94a3b8'
        }}>
          Загрузка профиля...
        </div>
      </div>
    );
  }

  return (
    <div className="screen active">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      
      <div className="header" style={{ marginTop: '40px' }}>
        <h1>Профиль</h1>
        <p>Информация о вашем аккаунте</p>
      </div>

      <div className="profile-info">
        {/* User Info Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div className="profile-details">
            <h3>
              {telegramUser?.first_name || 'Пользователь'} {telegramUser?.last_name || ''}
            </h3>
            {telegramUser?.username && (
              <p className="profile-username">@{telegramUser.username}</p>
            )}
            <p className="profile-id">ID: {telegramUser?.id || user?.telegram_id || 'N/A'}</p>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="subscription-status">
          <div className="status-header">
            <StatusIcon size={24} style={{ color: subscriptionInfo.color }} />
            <div>
              <h4 style={{ color: subscriptionInfo.color }}>{subscriptionInfo.status}</h4>
              <p>{subscriptionInfo.details}</p>
            </div>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="profile-stats">
          <div className="stat-card">
            <Calendar size={20} />
            <div>
              <span className="stat-label">Дата регистрации</span>
              <span className="stat-value">{formatDate(user?.created_at)}</span>
            </div>
          </div>

          <div className="stat-card">
            <Gift size={20} />
            <div>
              <span className="stat-label">Статус</span>
              <span className="stat-value">
                {hasActiveSubscription ? 'Активный пользователь' : 'Новый пользователь'}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="referral-code">
          <span style={{ color: '#8892b0' }}>Ваш реферальный код:</span>
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
            className={`copy-button ${copied ? 'copied' : ''} ${copyError ? 'error' : ''}`} 
            onClick={copyReferralCode}
            disabled={!user?.referral_code}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Скопировано!' : copyError ? 'Ошибка!' : 'Копировать'}
          </button>
        </div>

        {/* Referral Program Info */}
        <div className="referral-steps">
          <h3 style={{ marginBottom: '16px', color: '#ffffff' }}>Реферальная программа</h3>
          
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Поделитесь кодом</h4>
              <p>Отправьте свой уникальный код друзьям</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Друг оплачивает</h4>
              <p>Ваш друг использует код при оплате подписки</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Получите бонусы</h4>
              <p>Каждому из вас добавляются <span className="bonus-highlight">бесплатные дни</span></p>
            </div>
          </div>
        </div>

        {/* Bonus Info */}
        <div className="bonus-info">
          <h3 style={{ marginBottom: '12px', color: '#6366f1' }}>Бонусы за рефералов:</h3>
          <div className="bonus-list">
            <div className="bonus-item">
              <Gift size={16} />
              <span>+7 дней за каждого друга</span>
            </div>
            <div className="bonus-item">
              <User size={16} />
              <span>Неограниченное количество приглашений</span>
            </div>
            <div className="bonus-item">
              <Check size={16} />
              <span>Бонусы начисляются автоматически</span>
            </div>
          </div>
        </div>

        {/* Profile Actions */}
        <div className="profile-actions">
          <div className="action-item">
            <span>Язык интерфейса</span>
            <span className="action-value">Русский</span>
          </div>
          <div className="action-item">
            <span>Уведомления</span>
            <span className="action-value">Включены</span>
          </div>
          <div className="action-item">
            <span>Версия приложения</span>
            <span className="action-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};