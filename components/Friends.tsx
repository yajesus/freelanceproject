// components/Friends.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { baseGift, bigGift, JOK_POINTS_UP, pageBackground } from '@/images';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { LEVELS, REFERRAL_BONUS_BASE, REFERRAL_BONUS_PREMIUM } from '@/utils/consts';
import { getUserTelegramId } from '@/utils/user';
import Copy from '@/icons/Copy';
import { useToast } from '@/contexts/ToastContext';
import { initUtils } from '@telegram-apps/sdk';
import { useTranslations } from 'next-intl';
import Button from './ui/button';

interface FriendsProps {
  setCurrentView: (view: string) => void;
}

export interface Referral {
  id: string;
  telegramId: string;
  name: string | null;
  points: number;
  referralPointsEarned: number;
  levelName: string;
  levelImage: StaticImageData;
}

export default function Friends({ setCurrentView }: FriendsProps) {
  const showToast = useToast();
  const t = useTranslations('Friends');

  const { userTelegramInitData, fakeFriends, referralCount, setReferralCount } = useGameStore();
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
  const [showBonusesList, setShowBonusesList] = useState(false);

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

  const handleShowBonusesList = useCallback(() => {
    triggerHapticFeedback(window);
    setShowBonusesList((prevState) => !prevState);
  }, []);

  const fetchReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const response = await fetch(`/api/user/referrals?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch referrals');
      }
      const data = await response.json();
      setReferrals(data.referrals);

      if (!referralCount || referralCount !== data.referralCount) {
        setReferralCount(data.referralCount);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
      showToast(t('referralError'), 'error');
    } finally {
      setIsLoadingReferrals(false);
    }
  }, [userTelegramInitData, showToast]);

  const handleFetchReferrals = useCallback(() => {
    triggerHapticFeedback(window);
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyInviteLink = useCallback(() => {
    triggerHapticFeedback(window);
    navigator.clipboard
      .writeText(
        process.env.NEXT_PUBLIC_BOT_USERNAME
          ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/${
              process.env.NEXT_PUBLIC_APP_URL_SHORT_NAME
            }?startapp=kentId${getUserTelegramId(userTelegramInitData) || ''}`
          : 'https://t.me/JOKQuestsBot'
      )
      .then(() => {
        setCopyButtonText('Copied!');
        showToast(t('linkCopied'), 'success');

        setTimeout(() => {
          setCopyButtonText('Copy');
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        showToast(t('failedToCopy'), 'error');
      });
  }, [userTelegramInitData, showToast]);

  const handleInviteFriend = useCallback(() => {
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
    const userTelegramId = getUserTelegramId(userTelegramInitData);

    const inviteLink = botUsername
      ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/${
          process.env.NEXT_PUBLIC_APP_URL_SHORT_NAME
        }?startapp=kentId${userTelegramId || ''}`
      : 'https://t.me/JOKQuestsBot';

    const shareText = `🃏 Hey\! I just started playing JokInTheBox, a crazy Telegram game where you can win rewards by playing, sharing, and bluffing\!\n\nCome try it with me — it's free, fast, and addictive 👀\n\n🎁 Claim your welcome bonus here 👉 ${inviteLink}`;

    try {
      triggerHapticFeedback(window);
      const utils = initUtils();
      const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(
        shareText
      )}`;
      utils.openTelegramLink(fullUrl);
    } catch (error) {
      console.error('Error opening Telegram link:', error);
      showToast(t('errorShare'), 'error');

      // Fallback: copy the invite link to clipboard
      navigator.clipboard
        .writeText(inviteLink)
        .then(() => showToast(t('linkCopied'), 'success'))
        .catch(() => showToast(t('failedToShareOrCopy'), 'error'));
    }
  }, [userTelegramInitData, showToast]);

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div
          className='h-screen mt-4 bg-customGreen-700 rounded-t-[48px] relative top-glow z-0'
          style={{
            backgroundImage: `url(${pageBackground.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className='flex-grow mt-[2px] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'>
            <div className='px-4 pt-1 pb-48'>
              <div className='relative'>
                <h1 className='text-2xl text-center mt-4 mb-2'>{t('title')}</h1>
                <p className='text-center text-gray-400 mb-8'>{t('description')}</p>

                <div className='space-y-2'>
                  <div className='flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4'>
                    <div className='flex items-center'>
                      <Image priority={false} src={baseGift} alt='Gift' width={40} height={40} />
                      <div className='flex flex-col ml-2'>
                        <span className='font-medium'>{t('inviteFriend')}</span>
                        <div className='flex items-center'>
                          <Image
                            priority={false}
                            src={JOK_POINTS_UP}
                            alt='JOK Points'
                            width={24}
                            height={24}
                            className='w-6 h-6'
                          />
                          <span className='ml-1 text-white'>
                            <span className='text-customGreen-700'>+{formatNumber(REFERRAL_BONUS_BASE)}</span>{' '}
                            {t('forYouAndFriend')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4'>
                    <div className='flex items-center'>
                      <Image priority={false} src={bigGift} alt='Premium Gift' width={40} height={40} />
                      <div className='flex flex-col ml-2'>
                        <span className='font-medium'>{t('inviteTelegramPremiumFriend')}</span>
                        <div className='flex items-center'>
                          <Image
                            priority={false}
                            src={JOK_POINTS_UP}
                            alt='JOK Points'
                            width={24}
                            height={24}
                            className='w-6 h-6'
                          />
                          <span className='ml-1 text-white'>
                            <span className='text-customGreen-700'>+{formatNumber(REFERRAL_BONUS_PREMIUM)}</span>{' '}
                            {t('forYouAndFriend')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleShowBonusesList} className='block w-full mt-4 text-center text-customGreen-700'>
                  {showBonusesList ? t('hide') : t('more')}
                </button>

                {showBonusesList && (
                  <div className='mt-4 space-y-2'>
                    <h3 className='text-2xl text-white text-left font-bold mb-4'>{t('bonusHeading')}</h3>
                    <div className='flex justify-between text-gray-400 px-4 mb-2'>
                      <div className='flex items-center flex-1'>
                        <span>{t('level')}</span>
                      </div>
                      <div className='flex items-center justify-between flex-1'>
                        <span>{t('forFriend')}</span>
                        <span>{t('premium')}</span>
                      </div>
                    </div>
                    {LEVELS.slice(1).map((level, index) => (
                      <div key={index} className='flex items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4'>
                        <div className='flex items-center flex-1'>
                          <Image
                            priority={false}
                            src={level.smallImage}
                            alt={level.name}
                            width={40}
                            height={40}
                            className='rounded-lg mr-2'
                          />
                          <span className='font-medium text-white'>{level.name}</span>
                        </div>
                        <div className='flex items-center justify-between flex-1'>
                          <div className='flex items-center mr-4'>
                            <Image priority={false} src={JOK_POINTS_UP} alt='JOK Points' className='w-4 h-4 mr-1' />
                            <span className='text-customGreen-700'>+{formatNumber(level.friendBonus, 'B', 0)}</span>
                          </div>
                          <div className='flex items-center'>
                            <Image priority={false} src={JOK_POINTS_UP} alt='JOK Points' className='w-4 h-4 mr-1' />
                            <span className='text-customGreen-700'>
                              +{formatNumber(level.friendBonusPremium, 'B', 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className='mt-8 mb-24'>
                  <div className='flex justify-between items-center'>
                    <h2 className='text-lg'>
                      {t('listOfYourFriends')} ({referralCount}
                      {fakeFriends ? ` + ${fakeFriends}` : ''})
                    </h2>
                    <svg
                      className='w-6 h-6 text-gray-400 cursor-pointer'
                      onClick={handleFetchReferrals}
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                      />
                    </svg>
                  </div>
                  <div className='mt-4 space-y-2'>
                    {isLoadingReferrals ? (
                      // Skeleton loading animation
                      <div className='space-y-2 animate-pulse'>
                        {[...Array(3)].map((_, index) => (
                          <div
                            key={index}
                            className='flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4'
                          >
                            <div className='flex items-center space-x-3'>
                              <div className='w-12 h-12 bg-gray-700 rounded-full'></div>
                              <div className='space-y-2'>
                                <div className='h-4 bg-gray-700 rounded w-24'></div>
                                <div className='h-3 bg-gray-700 rounded w-20'></div>
                              </div>
                            </div>
                            <div className='h-4 bg-gray-700 rounded w-16'></div>
                          </div>
                        ))}
                      </div>
                    ) : referrals.length > 0 ? (
                      <ul className='space-y-2'>
                        {referrals.map((referral: Referral) => (
                          <li
                            key={referral.id}
                            className='flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4'
                          >
                            <div className='flex items-center space-x-3'>
                              <Image
                                priority={false}
                                src={referral.levelImage}
                                alt={referral.levelName}
                                width={48}
                                height={48}
                                className='rounded-full'
                              />
                              <div>
                                <span className='font-medium'>{referral.name || `User ${referral.telegramId}`}</span>
                                <p className='text-sm text-gray-400'>
                                  {referral.levelName} • {formatNumber(referral.points)} points
                                </p>
                              </div>
                            </div>
                            <span className='text-customGreen-700'>+{formatNumber(referral.referralPointsEarned)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className='text-center text-gray-400 bg-[#272a2f] bg-opacity-90 rounded-lg p-4'>
                        {t('noFriends')}
                      </div>
                    )}
                  </div>
                </div>

                <div className='fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-40 flex gap-4 px-4'>
                  <Button onClick={handleInviteFriend} className='flex-grow py-3 pulse-animation'>
                    {t('inviteButton')}
                  </Button>
                  <button
                    className='w-12 h-12 bg-customGreen-700 rounded-lg text-white font-bold flex items-center justify-center'
                    onClick={handleCopyInviteLink}
                  >
                    {copyButtonText === 'Copied!' ? '✓' : <Copy />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
