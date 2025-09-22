// components/CheckTokenHoldings.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

interface TokenHoldingResponse {
  success: boolean;
  message: string;
  checkSkipped?: boolean;
  updatedUser?: {
    isHolder: boolean;
    holderLevel: number;
    lastHolderCheckTimestamp: Date;
  };
}

export function CheckTokenHoldings() {
  const { userTelegramInitData, erc20Wallet, setHolderCheckTimestamp, setHolderLevel, setIsHolder } = useGameStore();
  const showToast = useToast();
  const t = useTranslations('CheckTokenHoldings');

  const [isChecking, setIsChecking] = useState(false);

  const checkHolderStatus = useCallback(async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);

      if (!erc20Wallet) return;

      const response = await fetch('/api/user/token-holding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          walletAddress: erc20Wallet
        })
      });

      const result: TokenHoldingResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify token holdings');
      }

      if (result.success) {
        if (result.checkSkipped) {
          return;
        }

        if (result.updatedUser) {
          setHolderCheckTimestamp(new Date().getTime());
          setHolderLevel(result.updatedUser.holderLevel);
          setIsHolder(result.updatedUser.isHolder);
          showToast(t('success'), 'success');
        }
      }
    } catch (error) {
      console.error('Error checking holder status:', error);
      showToast(t('error'), 'error');
    } finally {
      setIsChecking(false);
    }
  }, [erc20Wallet, userTelegramInitData, setHolderCheckTimestamp, setHolderLevel, setIsHolder, isChecking]);

  useEffect(() => {
    checkHolderStatus();
  }, []);

  return null;
}
