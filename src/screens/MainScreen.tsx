import React from 'react';
import { Shield, Clock, Calendar, Settings } from 'lucide-react';
import { User } from '../types/vpn';

export interface FreeTrialStatus {
  available: boolean;
  used: boolean;
  active: boolean;
  expires_at?: string;
  days_remaining?: number;
}

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
    
    if (user?.subscription_status) {
      return {
        status: 'Подписка активна',
        timeLeft: `${3} дн.`, // Default to 3 days since we don't have exact expiry
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

      {user?.subscription_status && (
        <div className="subscription-details">
          <h4>Детали подписки</h4>
          <div className="detail-item">
            <Calendar size={16} />
            <span>Действует: Активна</span>
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

      {!user?.subscription_status && !freeTrialStatus?.active && (
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
          <h4>🎉 Подписка активирована!</h4>
          
          {/* Step 1: Download V2rayTun */}
          <div className="setup-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h5>Скачайте приложение V2rayTun</h5>
              <p>Для использования VPN вам необходимо установить клиент V2rayTun</p>
              <div className="download-buttons">
                <button 
                  className="download-button android"
                  onClick={() => window.open('https://play.google.com/store/apps/details?id=com.v2raytun.android', '_blank')}
                >
                  📱 Android
                </button>
                <button 
                  className="download-button ios"
                  onClick={() => window.open('https://apps.apple.com/app/v2raytun/id6476628951', '_blank')}
                >
                  🍎 iOS
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Add Configuration */}
          <div className="setup-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h5>Добавьте конфигурацию</h5>
              <p>После установки приложения нажмите кнопку ниже для автоматического добавления настроек:</p>
              <button 
                className="primary-button connect-button"
                onClick={() => window.open(user.subscription_link, '_blank')}
              >
                ⚡ Добавить конфигурацию
              </button>
            </div>
          </div>

          <div className="connection-help">
            <div className="help-item">
              <span className="help-icon">💡</span>
              <span>После нажатия автоматически откроется V2rayTun с готовыми настройками</span>
            </div>
            <div className="help-item">
              <span className="help-icon">🔒</span>
              <span>Все настройки уже оптимизированы для максимальной скорости и безопасности</span>
            </div>
            <div className="help-item">
              <span className="help-icon">🌍</span>
              <span>Доступ к серверам в разных странах для обхода любых блокировок</span>
            </div>
          </div>
        </div>
      )}

      <div className="connection-info">
        <h4>Информация о подключении</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Сервер</span>
            <span className="info-value">
              {user?.subscription_status || freeTrialStatus?.active ? 'Нидерланды' : 'Не подключен'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">IP адрес</span>
            <span className="info-value">
              {user?.subscription_status || freeTrialStatus?.active ? '185.246.xxx.xxx' : 'Не назначен'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Протокол</span>
            <span className="info-value">
              {user?.subscription_status || freeTrialStatus?.active ? 'WireGuard' : 'Не активен'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};