import React from 'react';
import { Shield, Clock, Calendar, Settings } from 'lucide-react';
import { User, FreeTrialStatus } from '../types/user';

interface MainScreenProps {
  user: User | null;
  freeTrialStatus: FreeTrialStatus | null;
  onShowSubscription: () => void;
  hasSubscriptionLink?: boolean;
}

export const MainScreen: React.FC<MainScreenProps> = ({ 
  user, 
  freeTrialStatus, 
  onShowSubscription,
  hasSubscriptionLink = false
}) => {
  const getVpnStatus = () => {
    if (freeTrialStatus?.active) {
      return {
        status: 'Пробный период активен',
        timeLeft: `${freeTrialStatus.days_remaining} дн.`,
        color: '#10b981',
        icon: Clock,
        description: 'Ваш бесплатный доступ к VPN'
      };
    }
    
    if (user?.subscription_active) {
      const expiresAt = user.subscription_expires_at 
        ? new Date(user.subscription_expires_at)
        : null;
      
      const daysLeft = expiresAt 
        ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      return {
        status: 'Подписка активна',
        timeLeft: `${daysLeft} дн.`,
        color: '#6366f1',
        icon: Shield,
        description: 'Полный доступ к VPN сервису'
      };
    }

    return {
      status: 'VPN не активен',
      timeLeft: '0 дн.',
      color: '#ef4444',
      icon: Settings,
      description: 'Активируйте подписку для доступа'
    };
  };

  const vpnInfo = getVpnStatus();
  const StatusIcon = vpnInfo.icon;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className="screen active">
      <div className="header">
        <h1>GramVPN</h1>
        <p>Ваш статус подключения</p>
      </div>

      <div className="vpn-status-card">
        <div className="status-header">
          <StatusIcon size={32} style={{ color: vpnInfo.color }} />
          <div className="status-info">
            <h3 style={{ color: vpnInfo.color }}>{vpnInfo.status}</h3>
            <p>{vpnInfo.description}</p>
          </div>
        </div>
        
        <div className="time-remaining">
          <div className="time-display">
            <span className="time-number" style={{ color: vpnInfo.color }}>
              {vpnInfo.timeLeft}
            </span>
            <span className="time-label">осталось</span>
          </div>
        </div>
      </div>

      {user?.subscription_active && (
        <div className="subscription-details">
          <h4>Детали подписки</h4>
          <div className="detail-item">
            <Calendar size={16} />
            <span>Действует до: {formatDate(user.subscription_expires_at)}</span>
          </div>
          <div className="detail-item">
            <Shield size={16} />
            <span>Тип: Премиум доступ</span>
          </div>
        </div>
      )}

      {freeTrialStatus?.active && (
        <div className="trial-details">
          <h4>Пробный период</h4>
          <div className="detail-item">
            <Clock size={16} />
            <span>Истекает: {formatDate(freeTrialStatus.expires_at)}</span>
          </div>
          <div className="detail-item">
            <Shield size={16} />
            <span>Тип: Бесплатный доступ</span>
          </div>
        </div>
      )}

      {!user?.subscription_active && !freeTrialStatus?.active && (
        <div className="no-subscription">
          <h4>Нет активной подписки</h4>
          <p>Оформите подписку или активируйте пробный период для доступа к VPN</p>
          <button className="primary-button" onClick={onShowSubscription}>
            Выбрать тариф
          </button>
        </div>
      )}

      {user?.subscription_link && (
        <div className="connection-section">
          <h4>Подключение к VPN</h4>
          <p>Ваша конфигурация готова! Нажмите кнопку ниже для подключения:</p>
          <button 
            className="primary-button connect-button"
            onClick={() => window.open(user.subscription_link, '_blank')}
          >
            🚀 Подключить VPN
          </button>
          <div className="connection-help">
            <p>После нажатия откроется приложение V2rayTun с вашими настройками</p>
          </div>
        </div>
      )}

      <div className="connection-info">
        <h4>Информация о подключении</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Сервер</span>
            <span className="info-value">
              {user?.subscription_active || freeTrialStatus?.active ? 'Нидерланды' : 'Не подключен'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">IP адрес</span>
            <span className="info-value">
              {user?.subscription_active || freeTrialStatus?.active ? '185.246.xxx.xxx' : 'Не назначен'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Протокол</span>
            <span className="info-value">
              {user?.subscription_active || freeTrialStatus?.active ? 'WireGuard' : 'Не активен'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};