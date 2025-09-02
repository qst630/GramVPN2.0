import React from 'react';
import { ArrowLeft, User, Calendar, Crown, Gift, Copy } from 'lucide-react';
import { User as UserType, FreeTrialStatus } from '../types/user';

interface ProfileScreenProps {
  onBack: () => void;
  user: UserType | null;
  freeTrialStatus: FreeTrialStatus | null;
  telegramUser: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  onBack, 
  user, 
  freeTrialStatus,
  telegramUser 
}) => {
  const referrals = { invited: 0, daysEarned: 0 };
  const referralCode = 'REF123';
  
  const copyReferralCode = () => {
    // Copy functionality
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getSubscriptionStatus = () => {
    if (freeTrialStatus?.active) {
      return {
        status: 'Пробный период',
        color: '#10b981',
        icon: Gift,
        details: `Осталось ${freeTrialStatus.days_remaining} дн.`
      };
    }
    
    if (user?.subscription_active) {
      return {
        status: 'Активная подписка',
        color: '#6366f1',
        icon: Crown,
        details: `До ${formatDate(user.subscription_expires_at)}`
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
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div className="profile-details">
            <h3>{telegramUser?.first_name} {telegramUser?.last_name || ''}</h3>
            {telegramUser?.username && (
              <p className="profile-username">@{telegramUser.username}</p>
            )}
            <p className="profile-id">ID: {telegramUser?.id}</p>
          </div>
        </div>

        <div className="subscription-status">
          <div className="status-header">
            <StatusIcon size={24} style={{ color: subscriptionInfo.color }} />
            <div>
              <h4 style={{ color: subscriptionInfo.color }}>{subscriptionInfo.status}</h4>
              <p>{subscriptionInfo.details}</p>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-card">
            <Calendar size={20} />
            <div>
              <span className="stat-label">Дата регистрации</span>
              <span className="stat-value">{formatDate(user?.created_at)}</span>
            </div>
          </div>

          {freeTrialStatus?.used && (
            <div className="stat-card">
              <Gift size={20} />
              <div>
                <span className="stat-label">Пробный период</span>
                <span className="stat-value">
                  {freeTrialStatus.active ? 'Активен' : 'Использован'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="referral-steps">
          <h3 style={{ marginBottom: '16px', color: '#ffffff' }}>Реферальная программа</h3>
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Поделитесь кодом</h4>
              <p>Отправьте свой уникальный промокод друзьям</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Друг оплачивает</h4>
              <p>Ваш друг использует код при первой оплате подписки</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Получите бонусы</h4>
              <p>Каждому из вас добавляются <span className="bonus-highlight">бесплатные дни</span>:</p>
            </div>
          </div>
        </div>

        <div className="bonus-info">
          <h3 style={{ marginBottom: '12px', color: '#6366f1' }}>Бонусы за подписку:</h3>
          <div style={{ marginBottom: '8px' }}><strong>+7 дней</strong> за месячную подписку</div>
          <div style={{ marginBottom: '8px' }}><strong>+14 дней</strong> за полугодовую подписку</div>
          <div><strong>+28 дней</strong> за годовую подписку</div>
        </div>

        <div className="stats-section">
          <div className="stats-title">Ваша статистика</div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{referrals.invited}</div>
              <div className="stat-label">приглашено друзей</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{referrals.daysEarned}</div>
              <div className="stat-label">бонусных дней</div>
            </div>
          </div>
        </div>

        <div className="referral-code">
          <span style={{ color: '#8892b0' }}>Ваш реферальный код:</span>
          <span style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '1px' }}>
            {referralCode}
          </span>
          <button className="copy-button" onClick={copyReferralCode}>
            <Copy size={12} />
            Копировать
          </button>
        </div>

        <div className="profile-actions">
          <div className="action-item">
            <span>Язык интерфейса</span>
            <span className="action-value">Русский</span>
          </div>
          <div className="action-item">
            <span>Уведомления</span>
            <span className="action-value">Включены</span>
          </div>
        </div>
      </div>
    </div>
  );
};