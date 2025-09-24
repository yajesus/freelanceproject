import { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  jokDuelLoadingBg,
  jokDuelLoadingCards,
  jokDuelLoadingScreenBg,
  jokDuelLoadingText
} from '@/src/app/games/jok-duel/images';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  calculateLevelIndex,
  calculatePointsPerClick,
  calculateProfitPerHour,
  InitialGameState,
  useGameStore
} from '@/utils/game-mechanics';
import { calculateYieldPerHour } from '@/utils/calculations';
import UAParser from 'ua-parser-js';
import { botUrlQr, JokHeadOnly, pageBackground } from '@/images';
import Button from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { showBackButton } from '@/utils/ui';
import { useRouter } from 'next/navigation';

export interface JokDuelLoadingProps {
  setIsLoading: (loading: boolean) => void;
  setCurrentView: (view: string) => void;
}

const JokDuelLoading: FC<JokDuelLoadingProps> = ({ setIsLoading, setCurrentView }) => {
  const t = useTranslations('Loading');
  const progressRef = useRef<HTMLDivElement>(null);

  const { initializeState } = useGameStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const openTimestampRef = useRef(Date.now());
  const [isAppropriateDevice, setIsAppropriateDevice] = useState(true);

  const fetchOrCreateUser = useCallback(async () => {
    try {
      let initData, telegramId, username, telegramName, startParam;

      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();

        initData = WebApp.initData;
        telegramId = WebApp.initDataUnsafe.user?.id.toString();
        username = WebApp.initDataUnsafe.user?.username || 'Unknown';
        telegramName = WebApp.initDataUnsafe.user?.first_name || 'Unknown';

        startParam = WebApp.initDataUnsafe.start_param;
      }

      const referrerTelegramId = startParam ? startParam.replace('kentId', '') : null;

      if (process.env.NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH === 'true') {
        initData = 'temp';
      }
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramInitData: initData,
          referrerTelegramId
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch or create user');
      }
      const userData = await response.json();

      if (!initData) {
        throw new Error('initData is undefined');
      }
      if (!telegramName) {
        throw new Error('telegramName is undefined');
      }

      const inventoryObj = userData.inventory?.items?.reduce((acc: any, item: any) => {
        const mergedItem = { ...item, ...item.shopItem };
        delete mergedItem.shopItem;
        acc.push(mergedItem);
        return acc;
      }, []);

      const yieldPerHour = calculateYieldPerHour(userData.bonusYieldPerHour ?? 0, userData.yieldPerHour);

      // Create the game store with fetched data
      const initialState: InitialGameState = {
        userTelegramInitData: initData,
        userTelegramName: telegramName,
        lastClickTimestamp: userData.lastPointsUpdateTimestamp,
        gameLevelIndex: calculateLevelIndex(yieldPerHour),
        points: userData.points,
        pointsBalance: userData.pointsBalance,
        tonBalance: userData.tonBalance,
        unsynchronizedPoints: 0,
        multitapLevelIndex: userData.multitapLevelIndex,
        pointsPerClick: calculatePointsPerClick(userData.multitapLevelIndex),
        mineLevelIndex: userData.mineLevelIndex,
        profitPerHour: calculateProfitPerHour(userData.mineLevelIndex),
        tonWalletAddress: userData?.tonWalletAddress,
        userUpgrades: userData?.userUpgrades,
        upgradeYieldPerHour: userData?.yieldPerHour,
        bonusYieldPerHour: userData?.bonusYieldPerHour,
        bonusOfflineYieldDuration: userData?.bonusOfflineYieldDuration,
        lastYieldTimestamp: userData?.lastUpgradeYieldTimestamp,
        lastClaimRewardDay: userData.lastClaimRewardDay,
        lastClaimRewardTimestamp: userData.lastClaimRewardTimestamp,
        twitterHandle: userData.twitterHandle,
        erc20Wallet: userData.erc20Wallet,
        equippedAvatar: userData.inventory?.equippedAvatar
          ? inventoryObj.find((item: any) => item.id === userData.inventory?.equippedAvatar)?.image
          : null,
        equippedWallpaper: userData.inventory?.equippedBackground
          ? inventoryObj.find((item: any) => item.id === userData.inventory?.equippedBackground)?.image
          : null,
        inventory: inventoryObj,
        lastHolderCheckTimestamp: userData.lastHolderCheckTimestamp,
        isHolder: userData.isHolder || false,
        holderLevel: userData.holderLevel || 0,
        isAirdropRequirementMet: userData.isAirdropRequirementMet || false,
        fakeFriends: userData.fakeFriends || 0,
        activeOfflineBoostEndTime: userData.activeOfflineBoostEndTime || 0,
        activeRewardBoostEndTime: userData.activeRewardBoostEndTime || 0,
        activeOfflineBoostDuration: userData.activeOfflineBoostDuration || 0,
        activeRewardBoostMultiplier: userData.activeRewardBoostMultiplier || 0,
        totalStars: userData.totalStars || 0,
        earnedStars: userData.earnedStars || 0,
        referralCount: userData.referralCount || 0,
        completedTasksCount: userData.completedTasksCount || 0,
        onChainCount: userData.onChainCount || 0
      };

      initializeState(initialState);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle error (e.g., show error message to user)
    }
  }, [initializeState]);

  useEffect(() => {
    const parser = new UAParser();
    const device = parser.getDevice();
    const isAppropriate =
      process.env.NEXT_PUBLIC_ALLOW_ALL_DEVICES === 'true' || device.type === 'mobile' || device.type === 'tablet';
    setIsAppropriateDevice(isAppropriate);

    if (isAppropriate) {
      fetchOrCreateUser();
    }
  }, []);

  const router = useRouter();

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        setCurrentView('myjok');
      });
    };

    setupBackButton();
  }, []);

  if (!isAppropriateDevice) {
    return (
      <div
        className='bg-[#1d2025] flex justify-center items-center h-screen'
        style={{
          backgroundImage: `url(${pageBackground.src})`,
          backgroundSize: 'contain',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className='w-full max-w-xl text-white flex flex-col items-center'>
          <div className='flex items-start justify-center gap-1'>
            <Image priority={false} src={JokHeadOnly} alt='JOK Head' width={48} height={32} objectFit='contain' />
            <h1 className='text-3xl font-bold'>{t('JOKer')},</h1>
          </div>
          <h1 className='text-3xl font-bold text-center'>{t('message')}</h1>
          <Image
            priority={false}
            className='bg-white p-2 rounded-xl my-6'
            src={botUrlQr}
            alt='QR Code'
            width={200}
            height={200}
          />

          <a href='https://t.me/JokInTheBoxOfficial' target='_blank' rel='noreferrer'>
            <Button className='py-4'>{t('joinCommunity')}</Button>
          </a>
        </div>
      </div>
    );
  }

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.to(progressRef.current, {
      width: '100%',
      duration: 7,
      ease: 'linear',
      onComplete: () => {
        setIsLoading(false);
        setCurrentView('onboarding');
      }
    });
  }, []);

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 h-screen bg-gradient-to-r pt-[3px] from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0'>
          <div
            className='bg-cover bg-center h-full w-full overflow-y-auto rounded-t-[46px] no-scrollbar p-[20px] flex flex-col items-center'
            style={{ backgroundImage: `url(${jokDuelLoadingScreenBg.src})` }}
          >
            <Image
              priority={false}
              src={jokDuelLoadingText}
              alt={''}
              width={jokDuelLoadingText.width}
              height={jokDuelLoadingText.height}
              className='mt-[50px]'
            />

            <Image
              priority={false}
              src={jokDuelLoadingCards}
              alt={''}
              width={jokDuelLoadingCards.width * 1.3}
              height={jokDuelLoadingCards.height * 1.3}
              className={'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}
            />

            {/* Loading */}
            <div className='absolute bottom-[16%]'>
              <div className={`relative w-fit overflow-hidden max-w-[${jokDuelLoadingBg.width}px]`}>
                <Image
                  priority={false}
                  src={jokDuelLoadingBg}
                  alt={''}
                  width={jokDuelLoadingBg.width}
                  height={jokDuelLoadingBg.height}
                />
                <div className='absolute top-1/2 left-1 -translate-y-1/2 w-full max-w-[239.93px] h-[23.77px] rounded-full overflow-hidden meter animate'>
                  <span
                    ref={progressRef}
                    className='w-0 h-full rounded-full'
                    style={{
                      backgroundImage: 'linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)'
                    }}
                  >
                    <svg
                      width='100%'
                      height='9'
                      viewBox='0 0 237 9'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className={'absolute top-px left-0'}
                    >
                      <path
                        opacity='0.71'
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M14.3738 0.276123H222.625C229.258 0.276123 234.865 3.58273 236.401 8.01125C234.128 6.90067 231.388 6.24956 228.446 6.24956H8.55291C5.61054 6.24956 2.87018 6.90067 0.597168 8.01125C2.13336 3.58279 7.74032 0.276123 14.3738 0.276123Z'
                        fill='url(#paint0_linear_3_266)'
                      />
                      <defs>
                        <linearGradient
                          id='paint0_linear_3_266'
                          x1='119.031'
                          y1='47.5284'
                          x2='118.336'
                          y2='-40.1524'
                          gradientUnits='userSpaceOnUse'
                        >
                          <stop offset='0.4598' stopColor='white' />
                          <stop offset='0.516' stopColor='white' />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span></span>
                    <svg
                      width='100%'
                      height='7'
                      viewBox='0 0 236 7'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className='absolute left-0 bottom-0.5'
                    >
                      <path
                        opacity='0.4'
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M235.389 0.0495605C233.712 3.69335 228.236 6.38339 221.786 6.38339H14.4493C7.99982 6.38339 2.52369 3.69335 0.846436 0.0495605C3.4305 2.15696 7.53642 3.52599 12.1371 3.52599H224.098C228.699 3.52599 232.805 2.15702 235.389 0.0495605Z'
                        fill='url(#paint0_linear_3_267)'
                      />
                      <defs>
                        <linearGradient
                          id='paint0_linear_3_267'
                          x1='118.118'
                          y1='6.38344'
                          x2='118.118'
                          y2='0.0495794'
                          gradientUnits='userSpaceOnUse'
                        >
                          <stop stopColor='#6EFFFA' />
                          <stop offset='1' />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </div>
              </div>
              <p className='mt-[19px] uppercase text-center'>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default JokDuelLoading;
