// utils/ui.ts

export const formatNumber = (num: number, skip?: 'K' | 'M' | 'B' | 'T', fixed: number = 2) => {
  if (num >= 1000000000000 && skip !== 'T') return `${(num / 1000000000000).toFixed(fixed)}T`;
  if (num >= 1000000000 && skip !== 'B') return `${(num / 1000000000).toFixed(fixed)}B`;
  if (num >= 1000000 && skip !== 'M') return `${(num / 1000000).toFixed(fixed)}M`;
  if (num >= 1000 && skip !== 'K') return `${(num / 1000).toFixed(fixed)}K`;
  return num.toFixed(0);
};

export const formatFloat = (num: number, fixed: number = 2): string => {
  if (isNaN(num) || !isFinite(num)) return (0).toFixed(fixed);
  return num.toFixed(fixed);
};

export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

type TelegramWindow = Window &
  typeof globalThis & {
    Telegram?: {
      WebApp?: {
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
      };
    };
  };

export function triggerHapticFeedback(
  telegramWebApp: TelegramWindow | Window = window,
  style: 'light' | 'medium' | 'heavy' = 'medium'
) {
  if (!telegramWebApp) return;

  const vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false';
  if (!vibrationEnabled) return;

  const hapticFeedback = (telegramWebApp as TelegramWindow).Telegram?.WebApp?.HapticFeedback;
  if (hapticFeedback?.impactOccurred) {
    hapticFeedback.impactOccurred(style);
  }
}

export const manageTelegramBackButton = async (show: boolean, onClickCallback?: () => void): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const WebApp = (await import('@twa-dev/sdk')).default;
    WebApp.ready();

    // Check if BackButton is supported
    if (!WebApp.BackButton) {
      console.warn('BackButton is not supported in this Telegram Web App version');
      return;
    }

    if (show) {
      // Check if BackButton methods are available before calling them
      if (typeof WebApp.BackButton.show === 'function') {
        WebApp.BackButton.show();
      }

      if (onClickCallback && typeof WebApp.BackButton.onClick === 'function') {
        WebApp.BackButton.onClick(onClickCallback);
      }
    } else {
      if (typeof WebApp.BackButton.hide === 'function') {
        WebApp.BackButton.hide();
      }
    }
  } catch (error) {
    console.error('Error managing Telegram back button:', error);
  }
};

export const showBackButton = async (onClickCallback: () => void): Promise<void> => {
  await manageTelegramBackButton(true, onClickCallback);
};

export const hideBackButton = async (): Promise<void> => {
  await manageTelegramBackButton(false);
};
