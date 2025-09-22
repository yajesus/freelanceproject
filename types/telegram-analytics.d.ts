// types/telegram-analytics.d.ts

declare global {
  interface Window {
    telegramAnalytics: {
      init: (config: { token: string; appName: string }) => void;
      // Add other methods as needed
    };
  }
}

export {};
