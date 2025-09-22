import { UNSUPPORTED_WALLETS, PREFERRED_WALLETS } from './consts';

/**
 * Extract wallet name from wallet object
 */
export const getWalletName = (wallet: any): string => {
  return (wallet?.device?.appName || wallet?.name || wallet?.appName || 'unknown').toLowerCase();
};

/**
 * Check if wallet is supported
 */
export const isWalletSupported = (walletName: string): boolean => {
  return !UNSUPPORTED_WALLETS.includes(walletName.toLowerCase());
};

/**
 * Get error message for unsupported wallet
 */
export const getUnsupportedWalletMessage = (walletName: string): string => {
  const preferredWalletsText = PREFERRED_WALLETS.join(', ');
  return `${walletName} wallet is not supported. Please use: ${preferredWalletsText}`;
};
