// components/MyJOK.tsx

'use client';

import Image from 'next/image';
import {
  battleJokBtnBg,
  character1,
  dailyChestsBg,
  dailyRewards,
  gifts,
  homeHeader,
  JOK_POINTS_UP,
  profileIconGroup,
  shopImageMap,
  telegramFeaturedGroup,
  tonAirdrop,
  tonAirdropStar,
  wallpaper1,
  leaderboard,
} from '@/images';
import { useGameStore } from '@/utils/game-mechanics';
import TopInfoSection from '@/components/TopInfoSection';
import {
  formatNumber,
  hideBackButton,
  triggerHapticFeedback,
} from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { TASK_PARAMS } from '@/utils/taskUtils';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHydration } from '@/utils/useHydration';
import { formatTime } from '@/lib/utils';
import { useQuests } from '@/hooks/useQuests';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';

interface MyJOKProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameUser: any;
  setChestOpeningView: (view: string) => void;
  handleOpenWithdrawalPopup: () => void;
  handleTopUpBalance: () => void;
}

const AvatarButton = memo(
  ({ onClick, gameUser }: { onClick: () => void; gameUser: any }) => {
    const t = useTranslations('MyJOK');
    return (
      <button
        onClick={onClick}
        className='w-fit absolute bottom-28 left-1/2 transform -translate-x-1/2'
      >
        <Image
          priority={false}
          src={battleJokBtnBg}
          alt={''}
          width={243}
          height={53}
          className='w-[40vw] sm:w-[50vw] min-h-14'
        />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col text-center justify-center'>
          {/* <p
          className='absolute -top-1/2 left-1/2 -translate-x-1/2 text-[12px] flex w-[80px] h-[32px] gap-1 z-1 justify-center items-start pt-[2%]'
          style={{
            backgroundPosition: 'center',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <svg width='14' height='16' viewBox='0 0 16 18' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path
              d='M15.0952 8.37671C13.5051 10.6461 10.1973 15.4283 8.62972 17.6702C8.18219 18.3136 7.17232 17.9453 7.24505 17.1649L7.73923 11.8342C7.78122 11.3875 7.42875 11.0015 6.98021 11.0015C-1.96193 10.9948 0.736322 12.2875 3.00689 1.41029C3.0938 1.07382 3.39779 0.837891 3.74561 0.837891H10.8358C11.3356 0.837891 11.7002 1.31158 11.5724 1.79552L10.4013 6.22085C10.2735 6.70479 10.6381 7.17848 11.1379 7.17848H14.4694C15.0849 7.17857 15.4467 7.87136 15.0952 8.37671Z'
              fill='#4ECDEA'
            />
            <path
              d='M11.3914 13.7039L8.63326 17.6686C8.18573 18.312 7.17587 17.9437 7.24859 17.1633L7.74278 11.8326C7.78477 11.3859 7.43229 10.9999 6.98376 10.9999H1.52999C1.03206 10.9999 0.667503 10.5299 0.791461 10.0478L3.01062 1.40886C3.17236 0.475476 5.04526 0.941209 5.65123 0.836371L4.38595 7.11073C4.233 7.86783 4.81207 8.57562 5.58509 8.57562H9.14601C9.96935 8.57562 10.5578 9.37288 10.3143 10.1598L9.70826 12.1198C9.40463 13.2157 10.3917 13.8567 11.3914 13.7039Z'
              fill='#4F9CE8'
            />
          </svg>
        </p> */}
          <p className='font-base uppercase text-nowrap'>{t('battle-jok')}</p>
          <p className='text-xs'>{t('battle-jok-desc')}</p>
        </div>
      </button>
    );
  }
);

const MyJOK = ({
  currentView,
  setCurrentView,
  gameUser,
  setChestOpeningView,
  handleOpenWithdrawalPopup,
  handleTopUpBalance,
}: MyJOKProps) => {
  const t = useTranslations('MyJOK');
  const router = useRouter();
  const isHydrated = useHydration();

  const handleViewChange = (view: string, taskParam?: string) => {
    triggerHapticFeedback(window);
    if (taskParam) {
      router.push(`?view=${view}&task=${taskParam}`);
    } else {
      router.push(`?view=${view}`);
    }
    setCurrentView(view);
  };

  const {
    pointsBalance,
    equippedAvatar,
    equippedWallpaper,
    lastClaimRewardTimestamp,
    lastClaimRewardDay,
    tasks,
    bonusYieldPerHour,
    upgradeYieldPerHour,
    userTelegramInitData,
  } = useGameStore();
  const { tonDailyTask, fetchTasks, isLoading: questsLoading } = useQuests();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chestRemainingMs, setChestRemainingMs] = useState<number | null>(null);
  const [rewardTimeRemaining, setRewardTimeRemaining] = useState<number | null>(
    null
  );
  const [tonTaskTimeRemaining, setTonTaskTimeRemaining] = useState<
    number | null
  >(null);

  const getRewardTimeRemaining = useCallback(() => {
    if (lastClaimRewardDay === 0) return 0;
    const now = new Date();
    const lastClaim = new Date(lastClaimRewardTimestamp);
    const elapsedTime = now.getTime() - lastClaim.getTime();
    return Math.max(0, 86400000 - elapsedTime);
  }, [lastClaimRewardTimestamp, lastClaimRewardDay]);

  const getTonTaskTimeRemaining = useCallback(() => {
    if (!tonDailyTask || !tonDailyTask.completedAt) return 0;

    const now = new Date();
    const lastCompletion = new Date(tonDailyTask.completedAt);

    const resetTime = new Date(lastCompletion);
    resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);
    resetTime.setDate(resetTime.getDate() + 1);

    return Math.max(0, resetTime.getTime() - now.getTime());
  }, [tonDailyTask]);

  const TONPoints = useMemo(() => {
    if (!tonDailyTask) return 0;
    const basePoints = tonDailyTask.points || 0;
    const bonusPoints = calculateYieldPerHour(
      bonusYieldPerHour,
      upgradeYieldPerHour
    );
    const multiplier = tonDailyTask.multiplier || 2;
    return formatNumber(basePoints + bonusPoints * multiplier);
  }, [
    tonDailyTask?.points,
    bonusYieldPerHour,
    upgradeYieldPerHour,
    tonDailyTask?.multiplier,
  ]);

  useEffect(() => {
    const fetchChestStatus = async () => {
      try {
        const res = await fetch(
          `/api/chest/claim?initData=${encodeURIComponent(
            userTelegramInitData
          )}`
        );
        const data = await res.json();
        if (data.remainingMs !== undefined) {
          setChestRemainingMs(data.remainingMs);
        }
      } catch (error) {
        console.error('Failed to fetch chest status', error);
      }
    };
    if (isHydrated && userTelegramInitData) {
      fetchChestStatus();
    }
  }, [isHydrated, userTelegramInitData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setChestRemainingMs((prev) =>
        prev !== null ? Math.max(prev - 1000, 0) : null
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tasks?.length === 0) {
      fetchTasks();
    }
  }, [tasks, fetchTasks]);

  useEffect(() => {
    const hideBackButtonOnLoad = async () => {
      await hideBackButton();
    };

    hideBackButtonOnLoad();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      const updateCountdowns = () => {
        setRewardTimeRemaining(getRewardTimeRemaining());
        setTonTaskTimeRemaining(getTonTaskTimeRemaining());
      };

      updateCountdowns();
      intervalRef.current = setInterval(updateCountdowns, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isHydrated, getRewardTimeRemaining, getTonTaskTimeRemaining]);

  // const handleGiveawayClick = () => handleViewChange('giveaway');
  const handleChangeAvatarClick = () => setCurrentView('onboardingLoading');

  const rightButtons = [
    // {
    //   name: 'Big Giveaway',
    //   link: '',
    //   btnText: 'bigGiveaway',
    //   icon: gifts,
    //   onClick: handleGiveawayClick,
    //   timing: 'Each Season'
    // },
    {
      name: 'Leaderboard',
      link: '',
      btnText: 'leaderboard',
      icon: leaderboard,
      onClick: () => setCurrentView('leaderboardApp'),
      timing: '',
    },
    {
      name: 'Airdrop',
      link: '',
      btnText: 'airdrop',
      icon: tonAirdrop,
      animation: (
        <>
          <Image
            unoptimized={true}
            priority={false}
            src={tonAirdropStar}
            className='absolute top-0 left-0 w-full h-full z-30 object-cover'
            width={0}
            height={0}
            alt={''}
          />
        </>
      ),
      timing: 'Each Quarter',
      onClick: () => setCurrentView('airdrop'),
    },
    {
      name: 'Raffles',
      link: '',
      btnText: 'Raffles',
      icon: profileIconGroup,
      timing: 'Each Week',
      onClick: () => setCurrentView('raffles'),
    },
  ];

  const formattedPoints = Math.floor(pointsBalance).toLocaleString();
  const digitCount = formattedPoints.replace(/,/g, '').length;

  const getFontSize = () => {
    const baseSizeVW = 7.5;
    const reductionFactor = 0.4;
    const dynamicSize = `clamp(1.0rem, calc(${baseSizeVW}vw - ${
      reductionFactor * Math.max(0, digitCount - 6)
    }vw), 4rem)`;
    return dynamicSize;
  };

  return (
    <div className='bg-black flex justify-center flex-1'>
      <div className='w-full flex-1 bg-black text-white font-bold flex flex-col max-w-xl'>
        <TopInfoSection
          isGamePage={true}
          setCurrentView={setCurrentView}
          handleOpenWithdrawalPopup={handleOpenWithdrawalPopup}
          handleTopUpBalance={handleTopUpBalance}
        />

        <div className='flex-grow mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0'>
          <div
            className='mt-[3px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'
            style={{
              backgroundImage: `url(${
                equippedWallpaper
                  ? shopImageMap[equippedWallpaper].src
                  : wallpaper1.src
              })`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div
              className={
                'absolute left-1/2 transform -translate-x-1/2 w-full max-w-xl flex justify-center'
              }
            >
              <Image
                priority={false}
                src={homeHeader}
                width={0}
                height={0}
                sizes={'100vw'}
                alt={'header'}
                className={'w-full px-16'}
              />
              <div className='absolute px-4 flex justify-center'>
                <div className='px-4 pb-2 flex items-center space-x-2'>
                  <p
                    className='text-white mt-4'
                    suppressHydrationWarning
                    style={{
                      fontSize: getFontSize(),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formattedPoints}
                  </p>
                </div>
              </div>
            </div>
            <div className='h-full px-4 pt-1 pb-24 relative overflow-hidden'>
              <Image
                priority={false}
                src={equippedAvatar ? shopImageMap[equippedAvatar] : character1}
                alt='Main Character'
                fill
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center',
                  transform: 'scale(0.8) translateY(5%)',
                }}
              />
              <AvatarButton
                onClick={handleChangeAvatarClick}
                gameUser={gameUser}
              />

              {/* Left Buttons */}
              <div className='absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-[20px]'>
                <button
                  key='Gate'
                  onClick={() => {
                    setChestOpeningView('dailyChest');
                    setCurrentView('chest-opening');
                  }}
                  className='relative flex flex-col  items-center mb-2'
                >
                  <Image
                    priority={false}
                    src={dailyChestsBg}
                    width={104}
                    height={72}
                    alt='Gate'
                    className='z-20'
                  />

                  <p className='absolute bottom-3 w-fit text-[10px] p-1 text-center z-30'>
                    {t('dailyChests')}
                  </p>
                  <div
                    className={`absolute -bottom-4 text-[10px] p-[2px] text-center z-30 h-[27px] w-[78px] rounded-full flex items-center justify-center ${
                      isHydrated &&
                      chestRemainingMs !== null &&
                      formatTime(chestRemainingMs) !== '00:00:00'
                        ? 'animate-blink-shadow-purple'
                        : 'animate-blink-shadow-green'
                    }`}
                    style={{
                      background:
                        isHydrated &&
                        chestRemainingMs !== null &&
                        formatTime(chestRemainingMs) !== '00:00:00'
                          ? 'linear-gradient(to right, #AE17C6, #5400FC)'
                          : 'linear-gradient(to right, #C8F66B, #3EEE00)',
                      boxShadow: `0 5px 20px ${
                        isHydrated &&
                        chestRemainingMs !== null &&
                        formatTime(chestRemainingMs) !== '00:00:00'
                          ? '#3EEE00'
                          : '#5400FC'
                      }`,
                    }}
                  >
                    <p className='bg-[#313A3B] w-full h-full rounded-full flex items-center justify-center p-1'>
                      {chestRemainingMs !== null && chestRemainingMs > 0 ? (
                        <span>
                          {isHydrated
                            ? formatTime(chestRemainingMs)
                            : '--:--:--'}
                        </span>
                      ) : (
                        <span className='text-[10px] blink-fast'>00:00:00</span>
                      )}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleViewChange('reward')}
                  className='relative flex flex-col  items-center mb-2'
                >
                  <Image
                    priority={false}
                    src={dailyRewards}
                    width={104}
                    height={72}
                    alt={'Daily Rewards'}
                    className=' z-20 '
                  />

                  <p className='absolute bottom-3 w-fit text-[10px] p-1 text-center z-30'>
                    {t('dailyReward')}
                  </p>
                  <div
                    className={`absolute -bottom-4 text-[10px] p-[2px] text-center z-30 h-[27px] w-[78px] rounded-full flex items-center justify-center ${
                      isHydrated &&
                      rewardTimeRemaining !== null &&
                      formatTime(rewardTimeRemaining) !== '00:00:00'
                        ? 'animate-blink-shadow-purple'
                        : 'animate-blink-shadow-green'
                    }`}
                    style={{
                      background:
                        isHydrated &&
                        rewardTimeRemaining !== null &&
                        formatTime(rewardTimeRemaining) !== '00:00:00'
                          ? 'linear-gradient(to right, #AE17C6, #5400FC)'
                          : 'linear-gradient(to right, #C8F66B, #3EEE00)',
                      boxShadow: `0 5px 20px ${
                        isHydrated &&
                        rewardTimeRemaining !== null &&
                        formatTime(rewardTimeRemaining) !== '00:00:00'
                          ? '#3EEE00'
                          : '#5400FC'
                      }`,
                    }}
                  >
                    <p className='bg-[#313A3B] w-full h-full rounded-full flex items-center justify-center p-1 text-[10px]'>
                      {rewardTimeRemaining !== null &&
                      rewardTimeRemaining > 0 ? (
                        <span>
                          {isHydrated
                            ? formatTime(rewardTimeRemaining)
                            : '--:--:--'}
                        </span>
                      ) : (
                        <span className='text-[10px] blink-fast'>00:00:00</span>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleViewChange('quests', TASK_PARAMS.TON)}
                  disabled={questsLoading}
                  className='relative flex flex-col  items-center mb-2'
                >
                  <Image
                    priority={false}
                    src={telegramFeaturedGroup}
                    width={104}
                    height={72}
                    alt={'TON'}
                    className=' z-20 '
                  />

                  <div className='flex justify-center items-center absolute bottom-3 p-1 text-center z-30 gap-[1px]'>
                    {questsLoading ? (
                      <div className='animate-spin rounded-full h-3 w-3 border-b-2 border-white'></div>
                    ) : (
                      <>
                        <Image
                          priority={false}
                          src={JOK_POINTS_UP}
                          alt='JOK Points'
                          width={10}
                          height={10}
                          className='w-2 h-2'
                        />
                        <span className='text-white text-[10px]'>
                          {TONPoints}
                        </span>

                        {tonDailyTask?.rewardStars && (
                          <>
                            <Image
                              priority={false}
                              src={'/star.png'}
                              alt='Star'
                              width={10}
                              height={10}
                              className='w-2 h-2'
                            />
                            <span className='text-white text-[10px]'>
                              {tonDailyTask.rewardStars}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className={`absolute -bottom-4 text-[10px] p-[2px] text-center z-30 h-[27px] w-[78px] rounded-full flex items-center justify-center ${
                      isHydrated &&
                      tonTaskTimeRemaining !== null &&
                      formatTime(tonTaskTimeRemaining) !== '00:00:00'
                        ? 'animate-blink-shadow-purple'
                        : 'animate-blink-shadow-green'
                    }`}
                    style={{
                      background:
                        isHydrated &&
                        tonTaskTimeRemaining !== null &&
                        formatTime(tonTaskTimeRemaining) !== '00:00:00'
                          ? 'linear-gradient(to right, #AE17C6, #5400FC)'
                          : 'linear-gradient(to right, #C8F66B, #3EEE00)',
                      boxShadow: `0 5px 20px ${
                        isHydrated &&
                        tonTaskTimeRemaining !== null &&
                        formatTime(tonTaskTimeRemaining) !== '00:00:00'
                          ? '#3EEE00'
                          : '#5400FC'
                      }`,
                    }}
                  >
                    <p className='bg-[#313A3B] w-full h-full rounded-full flex items-center justify-center p-1 text-[10px]'>
                      {tonTaskTimeRemaining !== null &&
                      tonTaskTimeRemaining > 0 ? (
                        <span>
                          {isHydrated
                            ? formatTime(tonTaskTimeRemaining)
                            : '--:--:--'}
                        </span>
                      ) : (
                        <span className='text-[10px] blink-fast'>00:00:00</span>
                      )}
                    </p>
                  </div>
                </button>
              </div>
              {rightButtons.length > 0 && (
                <div className='absolute right-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-[20px]'>
                  {rightButtons.map((btn) => (
                    <button
                      key={btn.name}
                      onClick={btn.onClick}
                      className='relative flex flex-col  items-center mb-2'
                    >
                      {btn.animation && btn.animation}
                      <Image
                        priority={false}
                        src={btn.icon}
                        width={0}
                        height={0}
                        sizes={'100vw'}
                        alt={btn.name}
                        className='w-[104px] h-[78px] z-20 object-contain'
                      />

                      <p className='absolute bottom-3 w-fit text-[10px] p-1 text-center z-30'>
                        {t(btn.btnText)}
                      </p>
                      {btn.timing && (
                        <div
                          className={`absolute -bottom-4 text-[10px] whitespace-nowrap p-[2px] text-center z-30 h-[27px] w-[78px] rounded-full flex items-center justify-center 
                            "animate-blink-shadow-green"
                        `}
                          style={{
                            background:
                              'linear-gradient(to right, #AE17C6, #5400FC)',
                            boxShadow: `0 5px 20px ${'#5400FC'}`,
                          }}
                        >
                          <p className='bg-[#313A3B] w-full h-full rounded-full flex items-center justify-center p-1 '>
                            <span>{btn.timing}</span>
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default React.memo(MyJOK);
