// components/popups/PassportPopup.tsx

import React, { forwardRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/utils/game-mechanics';
import { showBackButton } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import PassportGenerator, { PassportData } from '../PassportGenerator';
import { useTranslations } from 'next-intl';

interface PassportPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  userId?: string;
}

const PassportPopupComponent = forwardRef<HTMLDivElement, PassportPopupProps>(
  ({ isOpen, onClose, onBack, userId }, ref) => {
    const t = useTranslations('PassportPopup');
    const {
      userTelegramInitData,
      userTelegramName,
      upgradeYieldPerHour,
      bonusYieldPerHour,
      gameLevelIndex,
      equippedAvatar,
      equippedWallpaper,
      holderLevel,
      fakeFriends,
      onChainCount,
      referralCount,
      completedTasksCount
    } = useGameStore();
    const [passportData, setPassportData] = useState<PassportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const showToast = useToast();

    const handleClose = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    useEffect(() => {
      if (!isOpen) return;
      const setupBackButton = async () => {
        await showBackButton(() => {
          onBack();
          return true;
        });
      };

      setupBackButton();
    }, [isOpen, onBack]);

    useEffect(() => {
      const fetchPassportData = async () => {
        setIsLoading(true);
        try {
          if (userId) {
            const response = await fetch(
              `/api/user/passport?userId=${userId}&initData=${encodeURIComponent(userTelegramInitData)}`
            );

            if (!response.ok) {
              throw new Error(t('fetchUserError'));
            }

            const data = await response.json();
            setPassportData({
              ...data.userData,
              onChainCount: data.onChainCount || 0
            });
          } else {
            setPassportData({
              telegramName: userTelegramName,
              levelIndex: gameLevelIndex,
              yieldPerHour: upgradeYieldPerHour,
              bonusYieldPerHour: bonusYieldPerHour,
              equippedAvatar,
              equippedWallpaper,
              holderLevel,
              referralCount: referralCount || 0,
              completedTasksCount: completedTasksCount || 0,
              fakeFriends,
              onChainCount: onChainCount || 0
            });
          }
        } catch (error) {
          console.error('Error loading passport data:', error);
          showToast(t('fetchPassportError'), 'error');

          // Set default values as fallback
          setPassportData({
            telegramName: userId ? 'User' : userTelegramName,
            levelIndex: userId ? 0 : gameLevelIndex,
            yieldPerHour: userId ? 0 : upgradeYieldPerHour,
            bonusYieldPerHour: userId ? 0 : bonusYieldPerHour,
            equippedAvatar: userId ? '' : equippedAvatar,
            equippedWallpaper: userId ? '' : equippedWallpaper,
            holderLevel: userId ? 0 : holderLevel,
            referralCount: 0,
            completedTasksCount: 0,
            fakeFriends: userId ? 0 : fakeFriends,
            onChainCount: 0
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchPassportData();
    }, [userId]);

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
      } else {
        document.body.style.overflow = 'auto';
      }

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }, [isOpen]);

    return createPortal(
      <div
        className={`fixed w-full h-screen bg-[#000000B2] z-50 transition-all duration-300 ${
          isOpen ? ' top-0 left-0 ' : ' -top-full -left-full '
        }`}
        onClick={handleClose}
      >
        <div className='h-max pt-[31px] absolute top-1/2 translate-y-[calc(-50%)] z-50 left-1/2 -translate-x-1/2 transform transition-all duration-300'>
          {isLoading ? (
            <div className='w-[340px] h-[500px] bg-[#0E0E0E] rounded-[23.93px] flex items-center justify-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500'></div>
            </div>
          ) : passportData ? (
            <div onClick={(e) => e.stopPropagation()} ref={ref}>
              <PassportGenerator data={passportData} />
            </div>
          ) : (
            <div className='w-[340px] bg-[#0E0E0E] rounded-[23.93px] p-6 text-center'>
              <p className='text-white text-lg mb-4'>{t('fetchPassportError')}</p>
            </div>
          )}
        </div>
      </div>,
      document.querySelector('#modal')!
    );
  }
);

const PassportPopup = memo(PassportPopupComponent);

PassportPopup.displayName = 'PassportPopup';

export default PassportPopup;
