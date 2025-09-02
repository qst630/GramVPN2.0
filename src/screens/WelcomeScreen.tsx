import React from 'react';
import { Shield, Zap, Globe, Smartphone, Gift } from 'lucide-react';
import { FreeTrialStatus } from '../types/user';
import { User } from '../types/user';

interface WelcomeScreenProps {
  onStartTrial: () => void;
  onShowSubscription: () => void;
  freeTrialStatus: FreeTrialStatus | null;
  user: User | null;
  userExists: boolean;
  loading?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStartTrial, 
  onShowSubscription,
  freeTrialStatus,
  user,
  userExists,
  loading = false
}) => {
  const getTrialButtonContent = () => {
    if (loading) {
      return {
        text: 'Загрузка...',
        subtitle: 'Проверяем статус',
        disabled: true,
        className: ''
      };
    }

    if (!freeTrialStatus) {
      return {
        text: 'Подключить бесплатно',
        subtitle: '3 дня бесплатно',
        disabled: false,
        className: ''
      };
    }

    if (freeTrialStatus.active) {
      return {
        text: 'Пробный период активен',
        subtitle: `Осталось ${freeTrialStatus.days_remaining} дн.`,
        disabled: true,
        className: ''
      };
    }

    if (freeTrialStatus.used) {
      return {
        text: 'Пробный период использован',
        subtitle: 'Оформите подписку',
        disabled: true,
        className: 'trial-expired'
      };
    }

    return {
      text: 'Подключить бесплатно',
      subtitle: '3 дня бесплатно',
      disabled: false,
      className: ''
    };
  };

  const buttonContent = getTrialButtonContent();

  // If user exists in database, show different content
  if (userExists && user) {
    return (
      <div className="screen active">
        <div className="welcome-header">
          <div className="logo-container">
            <div className="logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="url(#grad1)" strokeWidth="2"/>
                <path d="M16 20 L24 28 L32 20" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#667eea'}}/>
                    <stop offset="100%" style={{stopColor:'#764ba2'}}/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="app-title">GramVPN</h1>
            <p className="app-subtitle">С возвращением!</p>
          </div>
        </div>

        <div className="user-exists-banner">
          <div className="user-info">
            <div className="user-avatar">
              <Shield size={32} />
            </div>
            <div className="user-details">
              <h3>Вы уже в базе данных!</h3>
              <p>Добро пожаловать обратно, {user.first_name}</p>
              <div className="user-stats">
                <span>Реферальный код: {user.referral_code}</span>
                <span>Приглашено: {user.total_referrals} друзей</span>
              </div>
            </div>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <Shield className="feature-icon" size={24} />
            <h3>Ваш статус</h3>
            <p>{user.subscription_active ? 'Подписка активна' : 'Подписка неактивна'}</p>
          </div>
          <div className="feature-card">
            <Gift className="feature-icon" size={24} />
            <h3>Пробный период</h3>
            <p>{user.free_trial_used ? 'Использован' : 'Доступен'}</p>
          </div>
          <div className="feature-card">
            <Globe className="feature-icon" size={24} />
            <h3>Рефералы</h3>
            <p>{user.total_referrals} приглашений</p>
          </div>
          <div className="feature-card">
            <Smartphone className="feature-icon" size={24} />
            <h3>Бонусы</h3>
            <p>{user.bonus_days_earned} дней</p>
          </div>
        </div>

        <div className="welcome-buttons">
          <button 
            className={`primary-button trial-button ${buttonContent.className} ${buttonContent.disabled ? 'disabled' : ''}`}
            onClick={() => {
              console.log('🔘 Trial button clicked', {
                disabled: buttonContent.disabled,
                loading,
                className: buttonContent.className
              });
              if (!buttonContent.disabled && !loading) {
                onStartTrial();
              }
            }}
            disabled={buttonContent.disabled || loading}
          >
            {loading ? (
              <>
                <span className="button-text">Создание подписки...</span>
                <span className="button-subtitle">Подождите немного</span>
              </>
            ) : (
              <>
                <span className="button-text">{buttonContent.text}</span>
                <span className="button-subtitle">{buttonContent.subtitle}</span>
              </>
            )}
          </button>
          
          <button 
            className="secondary-button" 
            onClick={onShowSubscription}
          >
            Управление подпиской
          </button>
        </div>
      </div>
    );
  }

  // Original welcome screen for new users
  return (
    <div className="screen active">
      <div className="welcome-header">
        <div className="logo-container">
          <div className="logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="url(#grad1)" strokeWidth="2"/>
              <path d="M16 20 L24 28 L32 20" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#667eea'}}/>
                  <stop offset="100%" style={{stopColor:'#764ba2'}}/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="app-title">GramVPN</h1>
          <p className="app-subtitle">Добро пожаловать в GramVPN!</p>
        </div>
      </div>

      <div className="new-user-banner">
        <div className="new-user-content">
          <Gift className="new-user-icon" size={32} />
          <div className="new-user-text">
            <h3>Новый пользователь!</h3>
            <p>Получите <span className="highlight">3 дня бесплатно</span> для знакомства с сервисом</p>
          </div>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <Shield className="feature-icon" size={24} />
          <h3>Полная защита</h3>
          <p>Военное шифрование данных и анонимность в сети</p>
        </div>
        <div className="feature-card">
          <Zap className="feature-icon" size={24} />
          <h3>Высокая скорость</h3>
          <p>Серверы по всему миру без ограничения скорости</p>
        </div>
        <div className="feature-card">
          <Globe className="feature-icon" size={24} />
          <h3>Обход блокировок</h3>
          <p>Доступ к любым сайтам и сервисам без ограничений</p>
        </div>
        <div className="feature-card">
          <Smartphone className="feature-icon" size={24} />
          <h3>Все устройства</h3>
          <p>Windows, Mac, iOS, Android - одна подписка на всё</p>
        </div>
      </div>

      <div className="welcome-buttons">
        <button 
          className={`primary-button trial-button ${buttonContent.className} ${buttonContent.disabled ? 'disabled' : ''}`}
          onClick={onStartTrial}
          disabled={buttonContent.disabled || loading}
        >
          {loading ? (
            <>
              <span className="button-text">Создание подписки...</span>
              <span className="button-subtitle">Подождите немного</span>
            </>
          ) : (
            <>
              <span className="button-text">{buttonContent.text}</span>
              <span className="button-subtitle">{buttonContent.subtitle}</span>
            </>
          )}
        </button>
        
        <button 
          className="secondary-button" 
          onClick={onShowSubscription}
        >
          Посмотреть тарифы
        </button>
      </div>
    </div>
  );
};