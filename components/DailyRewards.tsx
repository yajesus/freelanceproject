// components/DailyRewards.tsx
'use client';

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopInfoSection from './TopInfoSection';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import Friends from '@/icons/Friends';
import { useHydration } from '@/utils/useHydration';
import Time from '@/icons/Time';
import { DAILY_REWARDS_BASE, DAILY_REWARDS_COEFFICIENT_BASE, DAILY_REWARDS_COEFFICIENT_PREMIUM } from '@/utils/consts';
import { useTranslations } from 'next-intl';
import { pageBackground } from '@/images';

const calculateBaseReward = (day: number, upgradeYieldPerHour: number): number => {
  let baseReward = DAILY_REWARDS_BASE;
  for (let i = 1; i < day; i++) {
    baseReward =
      Math.floor(baseReward * (i <= 30 ? DAILY_REWARDS_COEFFICIENT_BASE : DAILY_REWARDS_COEFFICIENT_PREMIUM)) +
      upgradeYieldPerHour;
  }
  return baseReward;
};

const getFriendsRequired = (day: number): number => {
  if (day < 15) return 0; // No friends required for days 1 to 14
  if (day <= 30) return day - 14; // 1 friend for day 15, 2 for day 16, ..., 15 for day 30
  if (day <= 40) return 15 + (day - 30) * 2; // 2 friends for days 31 to 40
  if (day <= 59) return 35 + (day - 40) * 3; // 3 friends for days 41 to 59
  return 100; // 100 friends for day 60
};

interface BoostProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  handleOpenWithdrawalPopup: () => void;
  handleTopUpBalance: () => void;
}

const DailyRewards: React.FC<BoostProps> = ({ currentView, setCurrentView, handleOpenWithdrawalPopup, handleTopUpBalance }) => {
  const t = useTranslations('DailyRewards');
  const showToast = useToast();
  const isHydrated = useHydration();

  const {
    userTelegramInitData,
    incrementPoints,
    setlastClaimRewardTimestamp,
    setLastClaimRewardDay,
    lastClaimRewardDay,
    lastClaimRewardTimestamp,
    upgradeYieldPerHour,
    fakeFriends,
    referralCount
  } = useGameStore();

  const [isRewardClaimable, setIsRewardClaimable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentDayRef = useRef<HTMLDivElement | null>(null);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
  }, []);

  const allRewards = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const day = i + 1;
      const baseReward = calculateBaseReward(day, upgradeYieldPerHour);
      const friendsRequired = getFriendsRequired(day);
      return { day, baseReward, friendsRequired };
    });
  }, [upgradeYieldPerHour]);

  const getTimeRemaining = useCallback(() => {
    if (lastClaimRewardDay === 0) return 0;
    const now = new Date();
    const lastClaim = new Date(lastClaimRewardTimestamp);
    const elapsedTime = now.getTime() - lastClaim.getTime();
    return Math.max(0, 86400000 - elapsedTime);
  }, [lastClaimRewardTimestamp, lastClaimRewardDay]);

  const formatTime = useCallback((ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const timeString = [hours, minutes, seconds].map((num) => String(num).padStart(2, '0')).join(':');
    return timeString;
  }, []);

  const handleClaimReward = async () => {
    if (isRewardClaimable) {
      setIsLoading(true);
      try {
        triggerHapticFeedback(window);
        const response = await fetch('/api/rewards/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to claim reward');
        }

        const result = await response.json();

        incrementPoints(result.rewardAmount);
        setlastClaimRewardTimestamp(result.lastClaimRewardTimestamp);
        setLastClaimRewardDay(result.currentDay);

        showToast(t('success'), 'success');
      } catch (error) {
        console.error('Error occurred while Claiming Reward:', error);
        showToast(error instanceof Error ? error.message : t('error'), 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isHydrated && lastClaimRewardTimestamp) {
      const updateCountdown = () => {
        const remaining = getTimeRemaining();
        setTimeRemaining(remaining);
        if (remaining === 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      };

      updateCountdown();
      intervalRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isHydrated, lastClaimRewardTimestamp, getTimeRemaining]);

  useEffect(() => {
    const isAvailable = timeRemaining === 0;
    setIsRewardClaimable(isAvailable);
  }, [timeRemaining]);

  useEffect(() => {
    if (currentDayRef?.current) {
      currentDayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [lastClaimRewardDay]);

  const isClaimDisabled = useMemo(() => {
    if (!isRewardClaimable) return true;
    const nextDay = (lastClaimRewardDay || 0) + 1;
    const requiredFriends = getFriendsRequired(nextDay);
    return requiredFriends > referralCount + fakeFriends;
  }, [isRewardClaimable, lastClaimRewardDay, referralCount, fakeFriends]);

  return (
    <div className='bg-black flex justify-center safe-min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <TopInfoSection 
          setCurrentView={setCurrentView}
          handleOpenWithdrawalPopup={handleOpenWithdrawalPopup}
          handleTopUpBalance={handleTopUpBalance}
        />

        <div
          className='h-screen mt-4 bg-customGreen-700 rounded-t-[48px] relative top-glow z-0'
          style={{
            backgroundImage: `url(${pageBackground.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className='flex-grow mt-[2px] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='px-4 pt-1 pb-[calc(90px+1.5rem+40px+55px)] margin-safe-area-top margin-safe-area-bottom'>
              <h2 className='mt-4 text-base font-bold mb-4 text-center'>{t('title')}</h2>
              <div className='mt-4'>
                <div className='container mx-auto p-4'>
                  <div className='grid grid-cols-4 gap-2'>
                    {allRewards.map((cr) => (
                      <DayCard
                        key={cr.day}
                        data={cr}
                        claimed={cr.day <= lastClaimRewardDay}
                        lastClaimRewardDay={lastClaimRewardDay + 1 || 1}
                        ref={cr.day === lastClaimRewardDay + 1 ? currentDayRef : null}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className={`w-2/5 flex justify-center py-3 px-6 bg-customGreen-700 text-white rounded-lg shadow-md disabled:cursor-not-allowed fixed top-[calc(80vh)] z-10 left-1/2 transform -translate-x-1/2`}
                  onClick={handleClaimReward}
                  disabled={isClaimDisabled || isLoading}
                >
                  {isLoading ? (
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
                  ) : timeRemaining !== null && timeRemaining > 0 ? (
                    <div className='flex items-center justify-center'>
                      <Time className='w-4 h-4 mr-1 text-white' />
                      <span className='text-white'>{isHydrated ? formatTime(timeRemaining) : 'Loading...'}</span>
                    </div>
                  ) : isClaimDisabled && isRewardClaimable ? (
                    <span className='text-white'>
                      {t('needMoreFriends', {
                        required: getFriendsRequired((lastClaimRewardDay || 0) + 1),
                        current: referralCount + fakeFriends
                      })}
                    </span>
                  ) : (
                    <span className='text-white'>{t('claimReward')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DayCard = forwardRef(
  (
    {
      data,
      claimed,
      lastClaimRewardDay
    }: {
      data: {
        day: number;
        baseReward: number;
        friendsRequired: number;
      };
      claimed: boolean;
      lastClaimRewardDay: number;
    },
    ref
  ) => {
    const t = useTranslations('DailyRewards');
    const today = lastClaimRewardDay === data.day;

    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`relative rounded-lg shadow-md p-4 text-center ${today ? 'bg-customGreen-700' : 'bg-[#2d2f33]'}`}
      >
        <div className='text-sm font-bold mb-2'>{`Day ${data.day}`}</div>
        <div className={`mb-4 text-base ${today ? 'text-white' : 'text-customGreen-700'}`}>
          {formatNumber(data.baseReward)}
        </div>
        {data.friendsRequired > 0 && (
          <div className='flex items-center justify-center'>
            <Friends size={24} className={`${today ? 'text-[#2d2f33]' : 'text-customGreen-700'}`} />
            <span className={`ml-1 font-bold ${today ? 'text-[#2d2f33]' : 'text-customGreen-700'}`}>
              {data.friendsRequired}
            </span>
          </div>
        )}
        {claimed && (
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#2d2f33] rounded-full p-1 shadow-md shadow-green-400'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-8 w-8 text-green-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
          </div>
        )}
      </div>
    );
  }
);

export default React.memo(DailyRewards);
