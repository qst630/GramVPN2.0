import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { SupportScreen } from './screens/SupportScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReferralScreen } from './screens/ReferralScreen';
import { MainScreen } from './screens/MainScreen';
import { Navigation, Screen } from './components/Navigation';
import { useTelegram } from './hooks/useTelegram';
import { useVPN } from './hooks/useVPN';
import { DebugPanel } from './components/DebugPanel';
import { ConnectionStatus } from './components/ConnectionStatus';

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('main');
  const { user: telegramUser, showAlert, hapticFeedback, isReady } = useTelegram();
  
  // Get referral code from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  
  const { 
    user,
    subscriptionType,
    daysRemaining,
    hasActiveSubscription,
    referralStats,
    subscriptionPlans,
    loading,
    error,
    startTrial,
    createSubscription,
    validatePromoCode,
    refreshUser
  } = useVPN(telegramUser, referralCode || undefined);

  // Determine initial screen based on user status
  useEffect(() => {
    if (user && !loading) {
      // Show main screen if user has active subscription or has used trial
      if (hasActiveSubscription || subscriptionType) {
        setActiveScreen('main');
      } else {
        // New user - show welcome screen
        setActiveScreen('main');
      }
    }
  }, [user, hasActiveSubscription, subscriptionType, loading]);

  useEffect(() => {
    // Set page title
    document.title = 'GramVPN - Безопасный и быстрый VPN';
  }, []);

  const handleStartTrial = async (): Promise<void> => {
    hapticFeedback.medium();
    
    if (hasActiveSubscription) {
      showAlert('У вас уже есть активная подписка!');
      return;
    }

    try {
      await startTrial();
      showAlert(
        '🎉 Поздравляем! Ваш 3-дневный пробный период активирован!\n\nВы можете начать использовать GramVPN прямо сейчас.'
      );
      setActiveScreen('main');
    } catch (error) {
      showAlert(`Произошла ошибка: ${error instanceof Error ? error.message : 'Попробуйте позже'}`);
    }
  };

  const handleShowSubscription = () => {
    hapticFeedback.light();
    setActiveScreen('subscription');
  };

  const handleShowPayment = async (planType: string, promoCode?: string) => {
    hapticFeedback.medium();
    
    try {
      await createSubscription(planType, promoCode);
      showAlert('🎉 Подписка успешно оформлена! Добро пожаловать в GramVPN!');
      setActiveScreen('main');
    } catch (error) {
      showAlert(`Ошибка оформления подписки: ${error instanceof Error ? error.message : 'Попробуйте позже'}`);
    }
  };

  const handleScreenChange = (screen: Screen) => {
    hapticFeedback.light();
    setActiveScreen(screen);
  };

  // Show error state if there's a critical error
  if (error) {
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
              {error}
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
                  setActiveScreen('main');
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

  if (!isReady || loading) {
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
      {activeScreen === 'main' && (
        hasActiveSubscription ? (
          <MainScreen
            user={user}
            subscriptionType={subscriptionType}
            daysRemaining={daysRemaining}
            onShowSubscription={handleShowSubscription}
          />
        ) : (
          <WelcomeScreen
            onStartTrial={handleStartTrial}
            onShowSubscription={handleShowSubscription}
            user={user}
            hasActiveSubscription={hasActiveSubscription}
            loading={loading}
          />
        )
      )}

      {activeScreen === 'subscription' && (
        <SubscriptionScreen
          subscriptionPlans={subscriptionPlans}
          onShowPayment={handleShowPayment}
          onValidatePromoCode={validatePromoCode}
          user={user}
          referralStats={referralStats}
        />
      )}

      {activeScreen === 'support' && (
        <SupportScreen
          onBack={() => setActiveScreen('main')}
        />
      )}

      {activeScreen === 'referrals' && (
        <ReferralScreen
          onBack={() => setActiveScreen('main')}
          user={user}
          referralStats={referralStats}
        />
      )}

      {activeScreen === 'profile' && (
        <ProfileScreen
          onBack={() => setActiveScreen('main')}
          user={user}
          subscriptionType={subscriptionType}
          daysRemaining={daysRemaining}
          hasActiveSubscription={hasActiveSubscription}
          telegramUser={telegramUser}
        />
      )}


      <Navigation
        activeScreen={activeScreen}
        onScreenChange={handleScreenChange}
      />

      {/* Debug Panel for testing */}
      <DebugPanel 
        user={user} 
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
        isConnected={!!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY && !error}
        error={error}
      />
    </div>
  );
}

export default App;