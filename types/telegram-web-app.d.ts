interface TelegramWebApp {
    WebApp: {
        expand(): unknown;
        openLink(authUrl: string, arg1: { try_instant_view: boolean; }): unknown;
        initData: boolean;
        initDataUnsafe: any;
        ready: () => void;
        HapticFeedback: {
            impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
            notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
            selectionChanged: () => void;
        };
        isFullscreen: string;
        // Add other Telegram WebApp properties and methods as needed
    };
}

interface Window {
    Telegram: TelegramWebApp;
}