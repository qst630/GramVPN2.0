/// <reference types="@twa-dev/types" />

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApps.WebApp;
    };
  }
}

export {};