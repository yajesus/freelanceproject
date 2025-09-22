'use client';

import AirButton from '@/components/ui/airdropButton';
import Angle from '@/icons/Angle';
import {
  AirdropBgGradient,
  AirdropCheckbox,
  AirdropLevel,
  AirdropTelegram,
  CountdownBgGradient,
  CountdownSmallBg,
  shopImageMap,
  trophy,
  character1,
  JokLogo
} from '@/images';
import { shortText } from '@/lib/utils';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
import Image from 'next/image';
import { FC, useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { parse } from 'date-fns';
import FriendPassportButton from './FriendPassportButton';
import Calendar from '@/icons/Calendar';

enum TabEnum {
  CONDITIONS = 'conditions',
  // BONUS = 'bonus',
  DEFAULT = ''
}

interface AirdropPageProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

interface TabProps {
  tab: TabEnum;
  onChain?: number;
  jokHolder: boolean;
  isHaveReferral: boolean;
  isUpThirdLevel: boolean;
  holderLevel: number;
}

interface TabBlockItemProps {
  image: string | StaticImport;
  text: string;
  active?: boolean;
}

interface IPlayer {
  player: string;
  won: {
    price: number;
    priceInTon: number;
  };
  profile: string;
  telegramId?: string;
}

const TabBlockItem: FC<TabBlockItemProps> = ({ image, text, active = false }) => (
  <div className={`w-[98px] ${active ? '' : 'opacity-40'}`}>
    <Image
      priority={false}
      width={0}
      height={0}
      sizes={'100vw'}
      src={image}
      alt={text}
      className='h-[44px] object-cover mx-auto'
    />
    <button className='bg-[#FFFFFF1F] border-[#FFFFFF0F] rounded-[35px] w-full h-[26px] text-[11px] font-medium mt-[7px]'>
      {text}
    </button>
  </div>
);

const ConditionsTab: FC<{
  isHaveReferral: boolean;
  isUpThirdLevel: boolean;
}> = ({ isHaveReferral, isUpThirdLevel }) => {
  const t = useTranslations('Airdrop');

  return (
    <div className='flex items-center justify-center gap-[20px]'>
      <TabBlockItem image={AirdropLevel} text={`${t('level')} 3`} active={isUpThirdLevel} />
      <TabBlockItem image={AirdropTelegram} text={t('TONCheckIn')} active={true} />
      <TabBlockItem image={AirdropCheckbox} text={t('inviteFriends')} active={isHaveReferral} />
    </div>
  );
};
ConditionsTab.displayName = 'ConditionsTab';

// const BonusTab: FC<{
//   onChain: number;
//   jokHolder: boolean;
//   holderLevel: number;
// }> = ({ onChain, jokHolder, holderLevel }) => {
//   const t = useTranslations('Airdrop');

//   return (
//     <div className='flex flex-col gap-[16px]'>
//       <div className='flex gap-[20px] items-center justify-center mt-[20px]'>
//         <TabBlockItem image={AirdropJok} text={`${t('JOKHolder')} ${holderLevel}/5`} active />
//         <TabBlockItem image={AirdropNft} text={`NFT ${onChain}/5`} active={jokHolder} />
//       </div>
//       <p className='text-[#FFFFFF] text-sm text-center mt-[25px] mx-auto text-[14px] font-black'>
//         <span className='relative z-10 text-transparent bg-clip-text bg-gradient-airdrop-text text-[14px] font-black'>
//           {t('increase')}
//         </span>{' '}
//         {t('increaseChances')}
//       </p>
//     </div>
//   );
// };
// BonusTab.displayName = 'BonusTab';

const DefaultTab: FC = () => {
  const t = useTranslations('Airdrop');

  return <p className='font-medium text-base text-center text-[#EBEEF5] mx-auto max-w-[256px]'>{t('rewards')}</p>;
};

DefaultTab.displayName = 'DefaultTab';

const Tabs: FC<TabProps> = ({ tab, onChain, jokHolder, isHaveReferral, isUpThirdLevel, holderLevel }) => {
  switch (tab) {
    case TabEnum.CONDITIONS:
      return <ConditionsTab isHaveReferral={isHaveReferral} isUpThirdLevel={isUpThirdLevel} />;
    // case TabEnum.BONUS:
    //   return <BonusTab onChain={onChain!} jokHolder={jokHolder} holderLevel={holderLevel} />;
    default:
      return <DefaultTab />;
  }
};

const AirdropWinnersList: FC<{ winners: IPlayer[]; isLoading: boolean }> = ({ winners, isLoading }) => {
  return (
    <div className='bg-transparent border border-[#363636] rounded-3xl p-4 my-6'>
      <div className='flex items-center justify-center mb-4'>
        <Image priority={false} src={trophy} alt='Trophy' width={24} height={24} />
        <h3 className='text-xl font-bold ml-2'>AIRDROP WINNERS</h3>
      </div>

      {isLoading ? (
        <div className='flex justify-center items-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white'></div>
        </div>
      ) : (
        winners.map((winner, index) => (
          <div key={index} className='border border-[#363636] rounded-xl p-4 mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Image priority={false} src={trophy} alt='Trophy' width={34} height={34} />
              <Image
                priority={false}
                src={winner.profile ? shopImageMap[`${winner.profile}_Thumb`] : character1}
                alt='User'
                width={48}
                height={48}
                className='rounded-full'
              />
            </div>
            <div className='flex flex-col flex-1 ml-3'>
              <h4 className='font-semibold text-base'>
                {shortText({ text: winner.player, startLength: 3, endLength: 3 })}
              </h4>

              <div className='flex items-center'>
                <Image priority={false} src={JokLogo} alt='JOK' width={20} height={20} />
                <span className='ml-1 text-sm font-normal'>{formatNumber(winner.won.priceInTon ?? 0)} JOK</span>
              </div>
            </div>
            <FriendPassportButton userId={winner.telegramId || ''} />
          </div>
        ))
      )}
    </div>
  );
};

const AirdropPage: React.FC<AirdropPageProps> = ({ currentView, setCurrentView }) => {
  const t = useTranslations('Airdrop');
  const countDown = {
    Q3: '09/30/25',
    Q4: '12/31/25',
    Q1: '03/31/26'
  };

  const [tab, setTab] = useState<TabEnum>(TabEnum.DEFAULT);
  const [players, setPlayers] = useState<IPlayer[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState('2025-06-19');
  const tContent = useTranslations('Airdrop.content');

  const [formattedCountDown, setFormattedCountDown] = useState<{
    Q3: string;
    Q4: string;
    Q1: string;
  }>({
    Q3: '',
    Q4: '',
    Q1: ''
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isHolder,
    userTelegramInitData,
    gameLevelIndex,
    isAirdropRequirementMet,
    holderLevel,
    fakeFriends,
    onChainCount,
    referralCount
  } = useGameStore();

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

  const dateFormatter = (date: string, key: string) => {
    const targetDate = parse(date, 'MM/dd/yy', new Date());
    const timeDifference = targetDate.getTime() - new Date().getTime();
    let totalSeconds = Math.max(timeDifference / 1000, 0);
    const days = Math.floor(totalSeconds / (3600 * 24));
    totalSeconds %= 3600 * 24;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    totalSeconds %= 60;
    const seconds = Math.floor(totalSeconds);

    if (key === 'Q3') {
      return `${String(days).padStart(2, '0')} DAYS ${String(hours).padStart(2, '0')} HOURS ${String(minutes).padStart(
        2,
        '0'
      )} MINUTES ${String(seconds).padStart(2, '0')} SECONDS`;
    }

    return `${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    const updateCountDown = () => {
      const newFormatted = {
        Q3: dateFormatter(countDown.Q3, 'Q3'),
        Q4: dateFormatter(countDown.Q4, 'Q4'),
        Q1: dateFormatter(countDown.Q1, 'Q1')
      };

      // Only update state if values actually changed to minimize re-renders
      setFormattedCountDown((prev) => {
        if (prev.Q3 !== newFormatted.Q3 || prev.Q4 !== newFormatted.Q4 || prev.Q1 !== newFormatted.Q1) {
          return newFormatted;
        }
        return prev;
      });
    };

    // Initial update
    updateCountDown();

    // Set up interval using ref
    intervalRef.current = setInterval(updateCountDown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countDown]);

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        // Check if we have cached data for this date
        const cachedData = localStorage.getItem(`airdrop_winners_${date}`);
        if (cachedData) {
          setPlayers(JSON.parse(cachedData));
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/airdrops?initData=${encodeURIComponent(userTelegramInitData)}&date=${date}`);
        const data = await res.json();
        setPlayers(data.data);
        // Cache the data
        localStorage.setItem(`airdrop_winners_${date}`, JSON.stringify(data.data));
      } catch (error) {
        console.error('Error fetching airdrop winners:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlayers();
  }, [date, userTelegramInitData]);

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='h-screen mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0'>
          <div className='flex-grow mt-[2px] bg-[#080808] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='pt-1 pb-24'>
              <div className=' px-4 mt-4 mb-32'>
                <p className={'uppercase text-lg text-center font-bold'}>{t('title')}</p>
                {/* Tabs */}
                <div className='w-full'>
                  {/* Tab Buttons */}
                  {/* <div className={'flex justify-center w-full '}>
                    <AirButton
                      onClick={() => {
                        setTab((prev) => (prev === TabEnum.BONUS ? TabEnum.DEFAULT : TabEnum.BONUS));
                      }}
                      imageSrc={AirDropBonus}
                      imgSize={{ width: 55, height: 55 }}
                      className={'mt-4'}
                      active={tab === TabEnum.BONUS}
                    >
                      {t('bonus')}
                    </AirButton>
                  </div> */}

                  {/* Tabs */}
                  <div className='flex flex-col justify-center mb-[30px] min-h-[197px]'>
                    <Tabs
                      tab={tab}
                      onChain={onChainCount}
                      jokHolder={isHolder}
                      isHaveReferral={referralCount + fakeFriends >= 3}
                      isUpThirdLevel={gameLevelIndex + 1 >= 3}
                      holderLevel={holderLevel}
                    />
                  </div>
                </div>

                <div>
                  <div className='w-full flex justify-center items-center'>
                    <a
                      href={'/eligibility-info.html'}
                      target={'_blank'}
                      className='w-[300px] relative pl-[32px] pr-[5px] py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs'
                    >
                      <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#3f3842] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
                      <div className='relative z-20 flex justify-between items-center'>
                        <div className='flex items-center'>
                          <div className='flex flex-col'>
                            <span className='font-medium'>{t('checkEligibility')}</span>
                          </div>
                        </div>
                        <div className='w-[54px] h-[54px] bg-[#232224] rounded-full flex justify-center items-center '>
                          <Angle size={40} className='text-white' />
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
                <div className='w-[100%] h-[350px] flex flex-col items-center mt-5 gap-[20px]'>
                  <p>{t('comingSoon')}</p>
                  <div className='relative w-[100%] h-[60px] flex items-center justify-center blink-fast'>
                    <Image
                      priority={false}
                      src={CountdownBgGradient}
                      alt='Not Found'
                      className='absolute inset-0 w-full h-full object-cover '
                    />
                    <p className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7D7D7D] text-[13px]'>
                      {formattedCountDown.Q3}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Calendar />
                    <p>{t('upcoming')}</p>
                  </div>
                  <div className='w-[100%] flex items-center justify-center'>
                    <p className='w-[100px] text-center'>Q4:</p>
                    <div className='relative w-[40%] h-[60px] flex items-center justify-center'>
                      <Image
                        priority={false}
                        src={CountdownSmallBg}
                        alt='Not Found'
                        className='absolute inset-0 w-full h-full object-cover'
                      />
                      <p className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7D7D7D] text-[14px]'>
                        {formattedCountDown.Q4}
                      </p>
                    </div>
                  </div>
                  <div className='w-[100%] flex items-center justify-center'>
                    <div className='flex flex-col items-center justify-center w-[100px]'>
                      <p>Q1:</p>
                      <p>2026</p>
                    </div>
                    <div className='relative w-[40%] h-[60px] flex items-center justify-center'>
                      <Image
                        priority={false}
                        src={CountdownSmallBg}
                        alt='Not Found'
                        className='absolute inset-0 w-full h-full object-cover'
                      />
                      <p className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7D7D7D] text-[14px]'>
                        {formattedCountDown.Q1}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='w-[100%] flex flex-col items-center my-5 gap-[10px] text-center'>
                  <p>{tContent('title')}</p>
                  <p className='font-extralight'>{tContent('benefit1')}</p>
                  <p className='font-extralight'>{tContent('benefit2')}</p>
                  <p className='font-extralight'>{tContent('benefit3')}</p>
                </div>
                {/* Airdrops */}
                <AirdropWinnersList winners={players || []} isLoading={isLoading} />
              </div>
            </div>
          </div>
          <Image
            priority={false}
            src={AirdropBgGradient}
            alt=''
            width={0}
            height={0}
            sizes='100vw'
            className='absolute w-full left-0 bottom-0 object-contain'
          />
        </div>
      </div>
    </div>
  );
};
export default AirdropPage;
