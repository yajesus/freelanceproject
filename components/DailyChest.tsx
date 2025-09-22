'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  character1,
  congratsTop,
  dailyChestBgImg,
  dailyChestPrizeBg,
  JOK_POINTS,
  shopImageMap,
  timingBg
} from 'images';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import animationData from '@/public/chests/blue_chest.json';
import { gameProfileBg, starIcon } from '@/src/app/games/jok-duel/images';
import { useTranslations } from 'next-intl';

interface DailyChestProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  telegramId: string;
}

const OPEN_ANIMATION_FRAMES: [number, number] = [10, 90];
const IDLE_ANIMATION_FRAMES: [number, number] = [0, 10];

const DailyChest = ({ setCurrentView, telegramId }: DailyChestProps) => {
  const t = useTranslations('DailyChest');
  const [showGift, setShowGift] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [earned, setEarned] = useState(0);
  const [prize, setPrize] = useState<{ type: string; result: any } | null>(null);
  const [chestOpened, setChestOpened] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const {
    setTotalStars,
    totalStars,
    bonusYieldPerHour,
    upgradeYieldPerHour,
    userTelegramInitData,
    setEquippedAvatar,
    setEquippedWallpaper,
    setOfflineBoost,
    setRewardBoost,
    incrementFakeFriends,
    addToInventory,
    points,
    setPoints,
    setPointsBalance,
    equippedAvatar
  } = useGameStore();

  const shopItems = useMemo(() => JSON.parse(localStorage.getItem('shopItems') || '[]'), []);
  const [showGiftPopup, setShowGiftPopup] = useState(false);

  const premiumAvatars = useMemo(
    () => shopItems.filter((item: any) => item.category === 'AVATAR' && item.isBasic === false),
    [shopItems]
  );

  const premiumBgs = useMemo(
    () => shopItems.filter((item: any) => item.category === 'BACKGROUND' && item.isBasic === false),
    [shopItems]
  );

  const hasPlayedFullAnimation = useRef(false);
  const chestAnimationRef = useRef<LottieRefCurrentProps | null>(null);
  const canClaim = remainingMs !== null && remainingMs <= 0;
  const clickLockRef = useRef(false);

  const avatar = useMemo(() => shopImageMap[equippedAvatar] || character1, [equippedAvatar]);

  const playChestAnimation = useCallback((segments: [number, number], loop: boolean) => {
    if (chestAnimationRef.current && !hasPlayedFullAnimation.current) {
      chestAnimationRef.current.playSegments(segments, loop);
    }
  }, []);

  const [rewardImg, setRewardImg] = useState({
    img: null,
    text: ''
  });
  const handleOpenChest = useCallback(async () => {
    if (showGift) {
      setCurrentView('myjok');
      clickLockRef.current = true;
      return;
    }
    if (clickLockRef.current) {
      chestAnimationRef?.current?.goToAndStop(90, true);
      chestAnimationRef?.current?.pause();
      setShowGift(true);
      hasPlayedFullAnimation.current = true;
      clickLockRef.current = false;
      return;
    }

    if (!canClaim) {
      clickLockRef.current = false;
      return;
    }
    setAnimationStarted(true);
    if (clickLockRef.current) return;
    clickLockRef.current = true;
    hasPlayedFullAnimation.current = false;
    playChestAnimation(OPEN_ANIMATION_FRAMES, false);

    try {
      setChestOpened(true);
      const res = await fetch('/api/chest/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData })
      });
      const data = await res.json();

      if (!res.ok || !data.prizeType || !data.prizeData) {
        console.error('Invalid chest prize data:', data);
        return;
      }

      setPrize({ type: data.prizeType, result: data.prizeData });

      const prizeResult = data.prizeData;
      if (prizeResult.multiplier != null) {
        await fetch('/api/user/set-multiplier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramId.toString(),
            multiplier: prizeResult.multiplier
          })
        });

        const yieldPerHour = bonusYieldPerHour + upgradeYieldPerHour;
        const earnedPoints = yieldPerHour * prizeResult.multiplier;
        setEarned(earnedPoints);
        setPoints(points + earnedPoints);
        setPointsBalance(points + earnedPoints);
      } else if (prizeResult.stars != null) {
        await fetch('/api/user/set-stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramId.toString(),
            stars: prizeResult.stars
          })
        });
        setTotalStars(totalStars + prizeResult.stars);
      } else if (prizeResult.reward != null) {
        switch (prizeResult.reward) {
          case '12h offline boost':
            setRewardImg({ img: shopImageMap['boost12h'], text: '' });
            break;
          case '2-day offline boost':
            setRewardImg({ img: shopImageMap['boost2day'], text: '' });
            break;
          case '12h reward boost':
            setRewardImg({ img: shopImageMap['boost12hReward'], text: '' });
            break;
          case '3 mini-friends':
            setRewardImg({ img: shopImageMap['friendThree'], text: '' });
            break;
          case '5 mini-friends':
            setRewardImg({ img: shopImageMap['friendFive'], text: '' });
            break;
          case '7-day boost':
            setRewardImg({ img: shopImageMap['boost1week'], text: '' });
            break;
          default:
            setRewardImg({ img: null, text: '' });
        }
        await handlePrizeReward(prizeResult.reward);
      }
    } catch (error) {
      console.error('Error opening chest:', error);
    }
  }, [
    showGift,
    canClaim,
    userTelegramInitData,
    telegramId,
    bonusYieldPerHour,
    upgradeYieldPerHour,
    points,
    setPoints,
    setPointsBalance,
    setTotalStars,
    totalStars,
    playChestAnimation
  ]);
  const handlePrizeReward = useCallback(
    async (reward: string) => {
      const handlePurchase = async (starsToUse: number, itemId: string) => {
        const response = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            itemId,
            starsToUse
          })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Purchase failed');

        const item = shopItems.find((i: any) => i.id === itemId);
        if (!item) return result;

        if (item.category === 'BOOST') {
          const boost = result.boost;
          if (boost.boostType === 'offline') {
            setOfflineBoost(boost.activeOfflineBoostDuration, boost.activeOfflineBoostEndTime);
          } else if (boost.boostType === 'rewards') {
            setRewardBoost(boost.activeRewardBoostMultiplier, boost.activeRewardBoostEndTime);
          }
        } else if (item.category === 'OTHERS') {
          incrementFakeFriends(result.friends.fakeFriendsAdded || 0);
        }

        addToInventory(result.userInventoryItem);
        return result;
      };

      const handleEquipItem = async (itemId: string) => {
        const item = shopItems.find((item: any) => item.id === itemId);
        if (!item) return;

        const response = await fetch('/api/shop/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            itemId
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        if (item.category === 'AVATAR') {
          if (item.image) {
            setEquippedAvatar(item.image);
          }
        } else if (item.category === 'BACKGROUND') {
          if (item.image) {
            setEquippedWallpaper(item.image);
          }
        }
      };

      const rewardHandlers: Record<string, () => Promise<void>> = {
        '12h offline boost': () => handlePurchase(0, '676aa086c85403d2eb12a89a'),
        '2-day offline boost': () => handlePurchase(0, '676aa086c85403d2eb12a89c'),
        '3 mini-friends': () => handlePurchase(0, '676aa087c85403d2eb12a8a3'),
        '12h reward boost': () => handlePurchase(0, '676aa087c85403d2eb12a89f'),
        '5 mini-friends': () => handlePurchase(0, '676aa088c85403d2eb12a8a4'),
        '7-day boost': () => handlePurchase(0, '676aa087c85403d2eb12a89e'),
        'Premium Avatar': async () => {
          const premiumItem = premiumAvatars[Math.floor(Math.random() * premiumAvatars.length)];
          console.log(premiumAvatars);
          console.log(premiumItem);
          if (premiumItem) {
            setRewardName(premiumItem.name);
            setRewardImg({ img: shopImageMap[premiumItem.image], text: 'Premium Avatar' });
            await handlePurchase(0, premiumItem.id);
            await handleEquipItem(premiumItem.id);
          }
        },
        'Premium Background': async () => {
          const premiumItem = premiumBgs[Math.floor(Math.random() * premiumBgs.length)];
          if (premiumItem) {
            setRewardName(premiumItem.name);
            setRewardImg({ img: shopImageMap[premiumItem.image], text: 'Premium Background' });
            await handlePurchase(0, premiumItem.id);
            await handleEquipItem(premiumItem.id);
          }
        }
      };

      if (rewardHandlers[reward]) {
        await rewardHandlers[reward]();
      }
    },
    [
      userTelegramInitData,
      shopItems,
      premiumAvatars,
      premiumBgs,
      setOfflineBoost,
      setRewardBoost,
      incrementFakeFriends,
      addToInventory,
      setEquippedAvatar,
      setEquippedWallpaper
    ]
  );

  useEffect(() => {
    const fetchChestStatus = async () => {
      try {
        const res = await fetch(`/api/chest/claim?initData=${encodeURIComponent(userTelegramInitData)}`);
        const data = await res.json();
        if (data.remainingMs !== undefined) setRemainingMs(data.remainingMs);
      } catch (error) {
        console.error('Error fetching chest status:', error);
      }
    };

    fetchChestStatus();
    const interval = setInterval(() => {
      setRemainingMs((prev) => (prev !== null ? Math.max(prev - 1000, 0) : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [userTelegramInitData]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  useEffect(() => {
    if (canClaim && !animationStarted) {
      playChestAnimation(IDLE_ANIMATION_FRAMES, true);
    } else if (!canClaim) {
      chestAnimationRef?.current?.goToAndStop(90, true);
    }
  }, [canClaim, animationStarted, playChestAnimation]);

  const handleViewChange = useCallback(
    (view: string) => {
      if (typeof setCurrentView === 'function') {
        try {
          triggerHapticFeedback(window);
          setCurrentView(view);
        } catch (error) {
          console.error('Error changing view:', error);
        }
      }
    },
    [setCurrentView]
  );

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
  }, [handleViewChange]);

  const handleAnimationComplete = useCallback(() => {
    if (animationStarted && !hasPlayedFullAnimation.current) {
      setShowGift(true);
      hasPlayedFullAnimation.current = true;
    } else if (canClaim && !animationStarted) {
      playChestAnimation(IDLE_ANIMATION_FRAMES, true);
    }
  }, [animationStarted, canClaim, playChestAnimation]);
  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] pt-[3px] rounded-t-[48px] relative top-glow z-0 font-extralight'>
          <div
            className='w-full h-screen rounded-t-[48px] relative z-10'
            style={{
              backgroundImage: `url(${dailyChestBgImg.src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'bottom center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backgroundBlendMode: 'multiply'
            }}
          >
            <Lottie
              lottieRef={chestAnimationRef}
              animationData={animationData}
              autoplay={false}
              loop={false}
              onComplete={handleAnimationComplete}
              style={{
                width: 400,
                height: 400,
                cursor: 'pointer',
                transform: 'rotateY(180deg) translateX(50%)'
              }}
              className='lottie-chest absolute bottom-28 left-1/2'
              onClick={handleOpenChest}
            />

            <div
              onClick={() => setShowGiftPopup(!showGiftPopup)}
              className='absolute right-6 top-28 pt-[6.12px] pb-[6.12px] pl-[8.5px] pr-[8.5px] border border-white rounded-[8px]'
            >
              <svg width='10' height='16' viewBox='0 0 10 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M5.00041 14.16V14.1425M1.50391 4.45975C1.77516 2.78325 3.25041 1.875 5.00041 1.875C6.75041 1.875 7.95091 3.051 8.27291 3.98725C8.59316 4.9235 8.52491 6.33925 7.63766 7.153C6.75041 7.96675 6.28491 7.706 5.48691 8.553C5.28943 8.78044 5.12559 9.03504 5.00041 9.309'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
            </div>

            {showGiftPopup && (
              <div
                style={{
                  backgroundImage: `url(${gameProfileBg.src})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'top center',
                  backgroundRepeat: 'no-repeat'
                }}
                className='absolute z-50 left-1/2 transform scale-[250%] -translate-x-1/2 top-1/2 -translate-y-1/2 font-extralight text-[22.83px] text-center'
              >
                <Image
                  priority={false}
                  src={avatar}
                  alt=''
                  className='relative left-1/2 -translate-x-1/2 transform scale-[20%] -translate-y-[39%] object-contain'
                />
                <div
                  onClick={() => setShowGiftPopup(!showGiftPopup)}
                  className='absolute right-[25%] top-[20%]  p-[3px]  border border-[#FFFFFF4D] rounded-[4px]'
                >
                  <svg width='6' height='7' viewBox='0 0 12 11' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path
                      d='M1.625 9.70605L6 5.33105M6 5.33105L10.375 0.956055M6 5.33105L1.625 0.956055M6 5.33105L10.375 9.70605'
                      stroke='white'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <table className='text-[14px] font-extralight w-[100%] whitespace-nowrap -top-[10%] absolute left-1/2 transform scale-[40%] -translate-x-1/2 text-left border-collapse'>
                  <thead>
                    <tr>
                      <th className='pr-2 pb-1 border-r border-[#FFFFFF6E] align-top'>{t('chance')}</th>
                      <th className='pl-2 pb-1 align-top'>{t('reward')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>45%</td>
                      <td className='pl-2 align-top'>{t('x1-x3Multiplier')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>38%</td>
                      <td className='pl-2 align-top'>{t('2-10Stars')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>5%</td>
                      <td className='pl-2 align-top'>{t('12hOfflineBoost')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>3%</td>
                      <td className='pl-2 align-top'>{t('2-dayOfflineBoost')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>2%</td>
                      <td className='pl-2 align-top'>{t('12hRewardBoost')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>2%</td>
                      <td className='pl-2 align-top'>{t('1MiniFriend')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>2%</td>
                      <td className='pl-2 align-top'>{t('3MiniFriends')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>1%</td>
                      <td className='pl-2 align-top'>{t('premiumAvatar')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>1%</td>
                      <td className='pl-2 align-top'>{t('premiumBackground')}</td>
                    </tr>
                    <tr>
                      <td className='pr-2 border-r border-[#FFFFFF6E] align-top'>1%</td>
                      <td className='pl-2 align-top'>{t('7-dayBoost')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <Image priority={false} src={congratsTop} alt='not found' className='absolute left-1/2 -translate-x-1/2' />
            <h1 className='absolute left-1/2 -translate-x-1/2 top-6 font-extralight text-[22.83px] text-center'>
              {t('dailyChest')}
            </h1>
            {}
            {!showGift && remainingMs !== null && !canClaim && (
              <>
                <p className='absolute left-1/2 -translate-x-1/2 top-24 font-extralight text-[20px] whitespace-nowrap w-full text-center'>
                  {t('nextChestAvailableIn')}
                </p>
                <div
                  className='z-20 absolute left-1/2 transform -translate-x-1/2 h-[80px] w-[300px] rounded-[100px] top-32 flex items-start pt-2 justify-center text-[38px]'
                  style={{
                    backgroundImage: `url(${timingBg.src})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <span>{formatTime(remainingMs)}</span>
                </div>
              </>
            )}

            {showGift && prize?.result && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-1/4 transform flex items-center justify-center w-[200px] h-[200px] transition-all duration-1000 ${
                  showGift ? 'opacity-100' : 'opacity-0'
                } object-contain`}
                style={{
                  animation: showGift ? 'giftAppear 1s ease-out forwards' : 'none'
                }}
              >
                <style jsx>{`
                  @keyframes giftAppear {
                    0% {
                      transform: translate(-50%, 100%) scale(0.2);
                      opacity: 0;
                    }
                    50% {
                      transform: translate(-50%, 50%) scale(0.8);
                      opacity: 0.8;
                    }
                    100% {
                      transform: translate(-50%, 0) scale(1);
                      opacity: 1;
                    }
                  }
                `}</style>

                <Image
                  priority={false}
                  src={avatar}
                  alt=''
                  className='absolute w-[70px] h-[70px] transform translate-y-[80%] -top-1/2 object-contain'
                />

                <Image priority={false} src={dailyChestPrizeBg} alt='Rewards' />
                <h1 className='absolute left-1/2 -translate-x-1/2 top-[25%]  transform  whitespace-nowrap text-center text-lg font-light'>
                  {prize.type === 'stars' ? t('earnedStars', { stars: prize.result.stars }) : t('earned')}
                </h1>
                {rewardImg.img && (
                  <Image
                    priority={true}
                    src={rewardImg.img}
                    alt='Rewards'
                    className='absolute mt-[15%] left-1/2 -translate-x-1/2 transform rounded-[8px] w-[50px] h-[50px] object-cover'
                    style={{
                      filter: 'drop-shadow(0px 4px 10px  #48810066)'
                    }}
                  />
                )}

                {prize.type === 'stars' && (
                  <div className='absolute left-1/2 -translate-x-1/2 top-1/2 transform translate-y-1/2 mt-8 flex space-x-1/2'>
                    {[...Array(Math.min(Number(prize.result.stars) || 0, 5))].map((_, index) => (
                      <span
                        className='text-yellow-400 text-[24px] flex items-center justify-center'
                        style={{
                          filter: 'drop-shadow(0px 0px 10px yellow)'
                        }}
                      >
                        <Image src={starIcon} alt='Rewards' width={24} />
                      </span>
                    ))}
                  </div>
                )}

                {prize.type === 'points' && (
                  <div className='absolute left-1/2 -translate-x-1/2 mt-20 text-2xl font-bold flex justify-center items-center'>
                    <div>{formatNumber(earned)}</div>
                    <Image priority={false} alt='JOK Points' src={JOK_POINTS} width={20} />
                  </div>
                )}

                {prize.type === 'boost' && (
                  <div className='absolute text-center mt-32 white-space-nowrap text-sm font-bold flex justify-around items-center flex-col'>
                    <p>
                      {prize.result.reward == 'Premium Avatar' || prize.result.reward == 'Premium Background'
                        ? rewardImg.text
                        : ''}
                    </p>
                    <p>
                      {prize.result.reward == 'Premium Avatar' || prize.result.reward == 'Premium Background'
                        ? rewardName
                        : prize.result.reward}
                    </p>
                  </div>
                )}
              </div>
            )}

            {canClaim && (
              <div className='h-full w-full cursor-pointer'>
                <h1 className='absolute bottom-[15%] text-[20px] left-1/2 -translate-x-1/2'>
                  {animationStarted ? 'Tap to skip' : 'Tap to Open'}
                </h1>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyChest;
