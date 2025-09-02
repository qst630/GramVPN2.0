import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { SupportScreen } from './screens/SupportScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MainScreen } from './screens/MainScreen';
import { Navigation, Screen } from './components/Navigation';
import { useTelegram } from './hooks/useTelegram';
import { useUser } from './hooks/useUser';
import { DebugPanel } from './components/DebugPanel';
import { ConnectionStatus } from './components/ConnectionStatus';

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('welcome');
  const { user: telegramUser, showAlert, hapticFeedback, isReady } = useTelegram();
  const { 
    user: userData, 
    freeTrialStatus, 
    loading: userLoading, 
    error: userError,
    startFreeTrial,
    refreshUser,
    referralStats 
  } = useUser(telegramUser);

  // Determine initial screen based on user status
  useEffect(() => {
    if (userData && freeTrialStatus) {
      // If user exists in database (has subscription or used trial), show main screen
      if (userData.subscription_active || freeTrialStatus.used) {
        setActiveScreen('welcome'); // Main screen shows VPN status
      } else {
        // New user - show welcome with trial offer
        setActiveScreen('welcome');
      }
    } else if (userData === null && !userLoading) {
      // User not found in database - show welcome screen
      setActiveScreen('welcome');
    }
  }, [userData, freeTrialStatus]);

  useEffect(() => {
    // Set page title
    document.title = 'GramVPN - Безопасный и быстрый VPN';
  }, []);

  const handleStartTrial = async () => {
    hapticFeedback.medium();
    
    if (!freeTrialStatus?.available) {
      if (freeTrialStatus?.used) {
        showAlert('Пробный период уже был использован. Оформите подписку для продолжения использования.');
        setActiveScreen('subscription');
      }
      return;
    }

    try {
      await startFreeTrial();
      showAlert(
        '🎉 Поздравляем! Ваши 3 дня бесплатного доступа активированы!\n\nВы можете начать использовать GramVPN прямо сейчас.'
      );
      setActiveScreen('subscription');
    } catch (error) {
      showAlert('Произошла ошибка при активации пробного периода. Попробуйте позже.');
    }
  };

  const handleShowSubscription = () => {
    hapticFeedback.light();
    setActiveScreen('subscription');
  };

  const handleShowPayment = () => {
    hapticFeedback.medium();
    showAlert('Перенаправление на оплату...');
  };

  const handleScreenChange = (screen: Screen) => {
    hapticFeedback.light();
    setActiveScreen(screen);
  };

  // Check if user exists in database
  const userExists = userData !== null;

  // Show error state if there's a critical error
  if (userError) {
    return (
      <div className="app-container">
        <div className="screen active" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px'
        }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '320px',
            width: '100%'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '18px' }}>
              Ошибка подключения
            </h2>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#ef4444',
              textAlign: 'left'
            }}>
              {userError}
            </div>
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              {!import.meta.env.VITE_SUPABASE_URL 
                ? 'Нажмите "Connect to Supabase" в правом верхнем углу для настройки базы данных.'
                : 'Проверьте подключение к интернету и настройки Supabase.'
              }
            </p>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                className="primary-button" 
                onClick={() => window.location.reload()}
                style={{ margin: 0 }}
              >
                Перезагрузить
              </button>
              <button 
                className="secondary-button" 
                onClick={() => {
                  setActiveScreen('welcome');
                  window.location.reload();
                }}
                style={{ margin: 0 }}
              >
                Демо режим
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady || userLoading) {
    return (
      <div className="app-container">
        <div className="screen active" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div>{!isReady ? 'Инициализация...' : 'Загрузка данных...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {activeScreen === 'welcome' && (
        userData && (freeTrialStatus?.used || userData.subscription_active) ? (
          <MainScreen
            user={userData}
            freeTrialStatus={freeTrialStatus}
            onShowSubscription={handleShowSubscription}
          />
        ) : (
          <WelcomeScreen
            onStartTrial={handleStartTrial}
            onShowSubscription={handleShowSubscription}
            freeTrialStatus={freeTrialStatus}
            user={userData}
            userExists={userExists}
            loading={userLoading}
          />
        )
      )}

      {activeScreen === 'subscription' && (
        <SubscriptionScreen
          onShowPayment={handleShowPayment}
          user={userData}
          referralStats={referralStats}
        />
      )}

      {activeScreen === 'support' && (
        <SupportScreen
          onBack={() => setActiveScreen('profile')}
        />
      )}

      {activeScreen === 'profile' && (
        <ProfileScreen
          onBack={() => setActiveScreen('profile')}
          user={userData}
          freeTrialStatus={freeTrialStatus}
          telegramUser={telegramUser}
        />
      )}


      <Navigation
        activeScreen={activeScreen}
        onScreenChange={handleScreenChange}
      />

      {/* Debug Panel for testing */}
      <DebugPanel 
        user={userData} 
        onRefresh={refreshUser}
      />

      {/* Greeting for Telegram users */}
      {telegramUser && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '20px',
          fontSize: '12px',
          color: '#94a3b8',
          zIndex: 1000
        }}>
          Привет, {telegramUser.first_name}! 👋
        </div>
      )}

      {/* Environment indicator */}
      <ConnectionStatus 
        isConnected={!!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY && !userError}
        error={userError}
      />
    </div>
  );
}

export default App;