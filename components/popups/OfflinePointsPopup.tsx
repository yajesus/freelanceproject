// components/popups/OfflinePointsPopup.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { JOK_POINTS_UP, offlinePopup } from '@/images';
import { useTranslations } from 'next-intl';

interface YieldBreakdown {
  actualOfflineHours: number;
  maxAllowedHours: number;
  bonusHours: number;
  usedHours: number;
  hasBonusTime: boolean;
}

interface OfflinePointsPopupProps {
  earnedPoints: number;
  effectiveDuration: number;
  yieldBreakdown: YieldBreakdown | null;
  onClose: () => void;
  handleViewChange: (view: string) => void;
  isClosing: boolean;
  setIsClosing: (value: boolean) => void;
}

// Helper function to format time for display
const formatTimeDisplay = (hours: number): string => {
  const totalMinutes = Math.floor(hours * 60);
  const displayHours = Math.floor(totalMinutes / 60);
  const displayMinutes = totalMinutes % 60;

  if (displayHours > 0) {
    if (displayMinutes > 0) {
      return `${displayHours}h ${displayMinutes}m`;
    }
    return `${displayHours}h`;
  }
  return `${displayMinutes}m`;
};

// Generate time display text based on breakdown
const generateTimeDisplayText = (breakdown: YieldBreakdown | null): string => {
  if (!breakdown) return '';

  const { actualOfflineHours, maxAllowedHours, bonusHours, usedHours, hasBonusTime } = breakdown;

  // Calculate total applicable time (base + bonus)
  const totalApplicableTime = maxAllowedHours + bonusHours;

  // Format the rewarded time and total applicable time
  const rewardedTimeDisplay = formatTimeDisplay(usedHours);
  const totalTimeDisplay = formatTimeDisplay(totalApplicableTime);

  return `${rewardedTimeDisplay} / ${totalTimeDisplay}`;
};

// Treasure Chest Component using Image
const TreasureChest: React.FC = () => (
  <div className='relative flex justify-center'>
    <div className='pulse-animation'>
      <Image
        src={offlinePopup}
        alt='Treasure Chest'
        width={200}
        height={200}
        className='relative z-10'
        priority={false}
      />
    </div>
  </div>
);

const OfflinePointsPopup: React.FC<OfflinePointsPopupProps> = React.memo(
  ({ earnedPoints, effectiveDuration, yieldBreakdown, onClose, handleViewChange, isClosing, setIsClosing }) => {
    const t = useTranslations('OfflinePointsPopup');

    useEffect(() => {
      const setupBackButton = async () => {
        await showBackButton(() => {
          handleViewChange('myjok');
        });
      };

      setupBackButton();
    }, [handleViewChange]);

    const handleClose = () => {
      triggerHapticFeedback(window);
      onClose();
    };

    const handleUpgradeClick = () => {
      triggerHapticFeedback(window);
      handleViewChange('shop');
      handleClose();
    };

    const timeDisplayText = generateTimeDisplayText(yieldBreakdown);

    return (
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
        <div
          className={`relative bg-[#18181C] border border-[#363636] rounded-3xl p-6 w-full max-w-sm mx-auto shadow-xl ${
            isClosing ? 'animate-slide-down' : 'animate-slide-up'
          }`}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className='absolute top-4 right-4 text-[#EBEEF5] hover:text-white text-xl z-10 transition-colors'
          >
            ×
          </button>

          {/* Title with blink animation */}
          <h2 className='text-2xl text-white text-center font-bold mb-6 blink-fast'>{t('title')}</h2>

          {/* Treasure chest */}
          <div className='flex justify-center mb-6'>
            <TreasureChest />
          </div>

          {/* Earned points */}
          <div className='text-center mb-6'>
            <p className='text-white text-lg mb-4'>{t('desc')}</p>
            <div className='flex justify-center items-center gap-2 mb-4 animate-pulse'>
              <Image priority={false} src={JOK_POINTS_UP} alt='JOK Points' width={24} height={24} className='w-6 h-6' />
              <span className='text-4xl font-bold text-white '>{earnedPoints ? formatNumber(earnedPoints) : '0'}</span>
            </div>

            {/* Simple time display */}
            <p className='text-[#EBEEF5] text-base'>
              {timeDisplayText
                ? t('desc2', {
                    time: timeDisplayText
                  })
                : t('desc2', {
                    time: formatTimeDisplay(effectiveDuration)
                  })}
            </p>
          </div>

          <div className='space-y-3'>
            <button
              onClick={handleUpgradeClick}
              className='relative w-full py-4 text-lg font-bold text-white rounded-[35px] bg-gradient-button overflow-hidden transition-transform hover:scale-105 active:scale-95'
            >
              <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#1E1E1E] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
              <span className='relative z-10'>{t('cta')}</span>
            </button>

            <button
              onClick={handleClose}
              className='w-full py-4 text-lg font-bold bg-[#151515] hover:bg-[#202020] text-white rounded-[35px] transition-all duration-200 hover:scale-105 active:scale-95'
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default OfflinePointsPopup;
