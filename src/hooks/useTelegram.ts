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
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);
      
      // Configure WebApp
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Set theme
      tg.setHeaderColor('#0f1419');
      tg.setBackgroundColor('#0f1419');
      
      // Get user data
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user as TelegramUser);
      }
      
      setIsReady(true);
    } else {
      // Development fallback
      setIsReady(true);
      setUser({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      });
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