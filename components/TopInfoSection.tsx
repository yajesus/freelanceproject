// components/TopInfoSection.tsx

'use client';

import Settings from '@/icons/Settings';
import { achievement, character1_Thumb, JOK_POINTS, progressBarBg, shopImageMap, star, tonLogo } from '@/images';
import { calculateYieldPerHour } from '@/utils/calculations';
import { LEVELS } from '@/utils/consts';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import React from 'react';

interface TopInfoSectionProps {
  isGamePage?: boolean;
  setCurrentView: (view: string) => void;
  handleOpenWithdrawalPopup?: () => void;
  handleTopUpBalance?: () => void;
}

export default React.memo(function TopInfoSection({
  isGamePage = false,
  setCurrentView,
  handleOpenWithdrawalPopup = () => {},
  handleTopUpBalance = () => {}
}: TopInfoSectionProps) {
  const t = useTranslations('TopInfoSection');

  const {
    userTelegramName,
    gameLevelIndex,
    upgradeYieldPerHour,
    bonusYieldPerHour,
    points,
    equippedAvatar,
    tonBalance,
    totalStars,
    dailyQuestStreakCount,
    lastDailyQuestCompletedDate
  } = useGameStore();

  const [streakMultiplier, setStreakMultiplier] = useState(0);

  useEffect(() => {
    if (!lastDailyQuestCompletedDate) {
      setStreakMultiplier(1);
      return;
    }

    const lastDate = dayjs(lastDailyQuestCompletedDate);
    const now = dayjs();
    const daysSinceLastCompletion = now.diff(lastDate, 'day');

    if (!(daysSinceLastCompletion > 1)) {
      setStreakMultiplier(1 + (dailyQuestStreakCount || 0) * 0.1);
    } else {
      setStreakMultiplier(1);
    }
  }, [dailyQuestStreakCount, lastDailyQuestCompletedDate]);

  const handleSettingsClick = () => {
    triggerHapticFeedback(window);
    setCurrentView('settings');
  };

  const handleProfileClick = () => {
    triggerHapticFeedback(window);
    setCurrentView('profile');
  };

  const calculateProgress = () => {
    if (gameLevelIndex >= LEVELS.length - 1) {
      return 100;
    }
    const currentLevelMin = LEVELS[gameLevelIndex].minYieldPerHour;
    const nextLevelMin = LEVELS[gameLevelIndex + 1].minYieldPerHour;
    const yieldPerHour = calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);
    const progress = ((yieldPerHour - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.min(progress, 100);
  };

  return (
    <div className='px-4 z-10'>
      <div className='flex justify-between space-x-3'>
        {/* Enhanced Profile Section */}
        <div className='flex flex-1 min-w-[33%]'>
          <div className='flex flex-col w-full space-y-1.5'>
            <div className='flex flex-1 space-x-2 items-center'>
              {/* Avatar */}
              <button className='relative flex flex-col flex-shrink-0' onClick={handleProfileClick}>
                <div
                  className={`overflow-hidden w-14 h-14 relative rounded-full flex justify-center p-[1px] items-center bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] shadow-lg ${
                    isGamePage ? 'w-14 h-14' : 'w-16 h-16'
                  }`}
                >
                  <Image
                    priority={false}
                    src={
                      equippedAvatar
                        ? shopImageMap[`${equippedAvatar}_Thumb`]
                        : shopImageMap[`character${gameLevelIndex + 1}_Thumb`] || character1_Thumb
                    }
                    alt='Avatar'
                    className='rounded-full w-full h-full scale-150 object-cover'
                  />
                </div>

                {/* Progress Bar */}
                <div className='relative w-full mt-1'>
                  <Image
                    priority={false}
                    src={progressBarBg}
                    alt={''}
                    width={0}
                    height={0}
                    sizes={'100vw'}
                    className={'object-contain w-full h-auto'}
                  />
                  <div className='top-0 left-0 absolute z-20 w-full h-full pl-[3px] pr-[3.5px] py-[1px]'>
                    <div
                      className='h-full rounded-[1px]'
                      style={{
                        backgroundImage: `linear-gradient(to top, #288500 0%, #37A907 12%, #43C50C 25%, #4CDA10 38%, #51E612 50%, #53EA13 62%, #57EB19 67%, #63EC28 72%, #76EF42 78%, #90F367 85%, #B3F896 92%, #DCFECE 99%, #E4FFD9 100%)`,
                        width: `${calculateProgress()}%`
                      }}
                    ></div>
                  </div>
                </div>
              </button>

              {/* User Info - Right of Avatar */}
              <div className='flex-1 min-w-0'>
                <div className='flex flex-col'>
                  <p className='text-white text-xs font-medium truncate'>{userTelegramName}</p>
                  <p className='text-[#B4B4B4] text-[10px]'>Level {gameLevelIndex + 1}</p>
                  {/* Achievement */}
                  <div className='flex-1 min-w-12 max-w-36 mt-1'>
                    <Image
                      priority={false}
                      src={achievement}
                      alt={''}
                      width={0}
                      height={0}
                      className={'object-contain w-full h-auto'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Container */}
        <div className='flex flex-col w-fit border-b border-[#43433b] rounded-xl p-2 bg-gradient-to-bl from-[#FFFFFF1F] to-[#23232321] max-w-64'>
          <div className='flex items-center'>
            <div className='flex-1 text-center'>
              <p className='text-xs text-[#85827d] font-medium whitespace-nowrap overflow-hidden text-ellipsis'>
                {t('yieldPerHour')}
              </p>
              <div className='flex items-center justify-center space-x-1'>
                <Image priority={false} src={JOK_POINTS} alt='JOK Points' width={20} height={20} />
                <p className='text-xs'>
                  +{formatNumber(calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour) * streakMultiplier)}
                </p>
              </div>
            </div>
            <div className='h-[32px] w-[2px] bg-[#43433b] mx-2'></div>
            <div className='flex-1 text-center'>
              <p className='text-xs text-[#85827d] font-medium whitespace-nowrap overflow-hidden text-ellipsis'>
                {t('points')}
              </p>
              <div className='flex items-center justify-center space-x-1'>
                <Image priority={false} src={JOK_POINTS} alt='JOK Points' width={20} height={20} />
                <p className='text-xs'>{formatNumber(points)}</p>
              </div>
            </div>
            {isGamePage && (
              <>
                <div className='h-[32px] w-[2px] bg-[#43433b] mx-2'></div>
                <button
                  onClick={handleSettingsClick}
                  className='flex items-center justify-center text-white focus:outline-none'
                >
                  <Settings className='w-6 h-6' />
                </button>
              </>
            )}
          </div>

          {/* Horizontal line */}
          <div className='w-full h-[2px] bg-[#43433b] my-2'></div>

          <div className='flex items-center'>
            <button className='flex-1 text-center' onClick={handleOpenWithdrawalPopup}>
              <div className='flex items-center justify-center space-x-1'>
                <Image priority={false} src={tonLogo} alt='TON' width={20} height={20} />
                <p className='text-xs'>{tonBalance?.toFixed(2)}</p>
              </div>
            </button>

            <div className='h-[32px] w-[2px] bg-[#43433b] mx-2'></div>

            <button className='flex-1 text-center' onClick={handleTopUpBalance}>
              <div className='flex items-center justify-center space-x-1'>
                <Image priority={false} src={star} alt='Stars' width={20} height={20} />
                <p className='text-xs'>{formatNumber(totalStars)}</p>
              </div>
            </button>

            {isGamePage && (
              <>
                <div className='h-[32px] w-[2px] mx-2'></div>
                <div className='w-6 h-6'></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
