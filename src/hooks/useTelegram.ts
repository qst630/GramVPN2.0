import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface UseTelegramReturn {
  user: TelegramUser | null;
  webApp: TelegramWebApps.WebApp | null;
  isReady: boolean;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: {
    light: () => void;
    medium: () => void;
    heavy: () => void;
  };
  close: () => void;
  expand: () => void;
}

export const useTelegram = (): UseTelegramReturn => {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [webApp, setWebApp] = useState<TelegramWebApps.WebApp | null>(null);

  useEffect(() => {
    const initTelegram = () => {
      try {
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          setWebApp(tg);
          
          console.log('🔧 Configuring Telegram WebApp...');
          
          // Configure WebApp
          tg.ready();
          tg.expand();
          
          // Only enable closing confirmation if supported
          try {
            tg.enableClosingConfirmation();
          } catch (e) {
            console.log('⚠️ Closing confirmation not supported');
          }
          
          // Set theme colors if supported
          try {
            tg.setHeaderColor('#0f1419');
            tg.setBackgroundColor('#0f1419');
          } catch (e) {
            console.log('⚠️ Theme colors not supported');
          }
          
          // Get user data
          if (tg.initDataUnsafe?.user) {
            console.log('✅ Telegram user found:', tg.initDataUnsafe.user);
            setUser(tg.initDataUnsafe.user as TelegramUser);
          } else {
            console.log('⚠️ No Telegram user data, using fallback');
            // Fallback user for testing
            setUser({
              id: 123456789,
              first_name: 'Demo',
              last_name: 'User',
              username: 'demouser'
            });
          }
          
          console.log('✅ Telegram WebApp configured successfully');
          setIsReady(true);
        } else {
          console.log('⚠️ Telegram WebApp not available, using fallback mode');
          // Development fallback
          setUser({
            id: 123456789,
            first_name: 'Demo',
            last_name: 'User',
            username: 'demouser'
          });
          setIsReady(true);
        }
      } catch (error) {
        console.error('❌ Error initializing Telegram:', error);
        // Even if there's an error, set ready state with fallback user
        setUser({
          id: 123456789,
          first_name: 'Demo',
          last_name: 'User',
          username: 'demouser'
        });
        setIsReady(true);
      }
    };

    // Initialize immediately if Telegram is already loaded
    if (window.Telegram?.WebApp) {
      initTelegram();
    } else {
      // Wait for Telegram script to load
      const checkTelegram = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(checkTelegram);
          initTelegram();
        }
      }, 100);

      // Fallback timeout
      setTimeout(() => {
        clearInterval(checkTelegram);
        if (!isReady) {
          console.log('⏰ Telegram load timeout, using fallback');
          initTelegram();
        }
      }, 3000);
    }
  }, []);

  const showAlert = (message: string) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  };

  const hapticFeedback = {
    light: () => webApp?.HapticFeedback.impactOccurred('light'),
    medium: () => webApp?.HapticFeedback.impactOccurred('medium'),
    heavy: () => webApp?.HapticFeedback.impactOccurred('heavy')
  };

  const close = () => webApp?.close();
  const expand = () => webApp?.expand();

  return {
    user,
    webApp,
    isReady,
    showAlert,
    showConfirm,
    hapticFeedback,
    close,
    expand
  };
};