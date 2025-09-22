// components/ComboOfTheDay.tsx

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { upgradeImageMap } from '@/images';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import LottieOverlay from '@/components/LottieOverlay';
import { useTranslations } from 'next-intl';

interface UpgradeCard {
  id: string;
  name: string;
  image: string;
  discovered: boolean;
}

interface ComboData {
  upgrades: UpgradeCard[];
  discoveredIds: string[];
  discoveredCount: number;
  rewardClaimed: boolean;
  endsAt: string;
}

interface ComboOfTheDayProps {
  showLoading?: boolean;
}

// Card component
const ComboCard = ({ card }: { card: UpgradeCard }) => (
  <div className='w-28 h-28 rounded-xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center justify-center bg-black/10 border-t border-b border-[#998b82] backdrop-blur-[56.8px]'>
    {card.discovered ? (
      <>
        <Image
          src={upgradeImageMap[card.image]}
          alt={card.name}
          className='h-18 w-18 object-cover'
          width={80}
          height={80}
        />
        <p className='text-xs text-center font-medium mt-2 truncate w-[80%]'>{card.name}</p>
      </>
    ) : (
      <div className='w-full h-full flex items-center justify-center text-4xl text-gray-400'>❓</div>
    )}
  </div>
);

// Countdown component
const Countdown = ({ endsAt }: { endsAt: Date | null }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');

  useEffect(() => {
    if (!endsAt) return;

    const updateCountdown = () => {
      const secondsLeft = Math.floor((endsAt.getTime() - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = secondsLeft % 60;
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return <span>{timeLeft}</span>;
};

// Modal component
const ComboModal = ({
  isOpen,
  onClose,
  comboCompleted,
  selectedCardImage,
  comboImages,
  onClaim,
  onShare,
  isSharing,
  upgradeYieldPerHour,
  t
}: {
  isOpen: boolean;
  onClose: () => void;
  comboCompleted: boolean;
  selectedCardImage: string | null;
  comboImages: string[];
  onClaim: (shared: boolean) => void;
  onShare: () => Promise<void>;
  isSharing: boolean;
  upgradeYieldPerHour: number;
  t: any;
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20'>
      <div className='bg-white p-6 rounded-lg w-80 text-center space-y-4'>
        {!comboCompleted ? (
          <>
            <h3 className='text-lg font-semibold text-orange-600'>{t('comboDiscovered')}</h3>
            {selectedCardImage && (
              <Image
                src={upgradeImageMap[selectedCardImage]}
                alt='Discovered Card'
                className='mx-auto rounded'
                width={96}
                height={144}
              />
            )}
            <button onClick={onClose} className='bg-blue-600 text-white px-4 py-2 rounded w-full'>
              {t('great')}
            </button>
          </>
        ) : (
          <>
            <h3 className='text-lg font-semibold text-green-600'>{t('comboCompleted')}</h3>
            <div className='flex justify-center gap-2'>
              {comboImages.map((img, idx) => (
                <Image
                  key={idx}
                  src={upgradeImageMap[img]}
                  alt={`Combo ${idx}`}
                  className='rounded'
                  width={64}
                  height={64}
                />
              ))}
            </div>
            <p className='text-sm text-black'>
              {t('scored', { points: formatNumber(10 * upgradeYieldPerHour), stars: 20 })} <br /> {t('share')}
            </p>
            <button
              className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full transition-colors'
              onClick={() => onClaim(false)}
            >
              {t('claimNow')}
            </button>

            <button
              className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full transition-colors ${
                isSharing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={async () => {
                await onShare();
                onClaim(true);
              }}
              disabled={isSharing}
            >
              {isSharing ? 'Sharing...' : t('shareOnX')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default function ComboOfTheDay({ showLoading = true }: ComboOfTheDayProps) {
  const t = useTranslations('ComboOfTheDay');
  const showToast = useToast();
  const {
    userTelegramInitData,
    setTotalStars,
    setUpgradeYieldPerHour,
    upgradeYieldPerHour,
    setPointsBalance,
    setPoints
  } = useGameStore();

  // Consolidated state
  const [gameState, setGameState] = useState({
    cards: [] as UpgradeCard[],
    discoveredIds: [] as string[],
    endsAt: null as Date | null,
    loading: true,
    error: '',
    comboCompleted: false,
    rewardClaimed: false
  });

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    selectedCardImage: null as string | null,
    comboImages: [] as string[],
    isSharing: false
  });

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);

  // Sharing tracking state
  const [sharingTracked, setSharingTracked] = useState(false);
  const sharingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVerifyingRef = useRef(false);

  // Use ref to prevent unnecessary re-renders from event listeners
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Computed values
  const isComboCompleted = useMemo(() => gameState.discoveredIds.length === 3, [gameState.discoveredIds.length]);

  // Start tracking sharing when all combos are found
  const startSharingTracking = useCallback(() => {
    if (sharingTracked || sharingIntervalRef.current) return;

    console.log('Starting sharing tracking interval...');
    setSharingTracked(true);

    // Check every 30 seconds if user has shared
    const interval = setInterval(async () => {
      // Skip if verification is already in progress
      if (isVerifyingRef.current) {
        console.log('Skipping interval check - verification in progress');
        return;
      }

      try {
        const response = await fetch('/api/combo-of-the-day/verify-tweet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            verifyOnly: true // Just check status, don't verify with Twitter API
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.shared) {
            console.log('User has shared! Stopping tracking.');
            clearInterval(interval);
            sharingIntervalRef.current = null;
            
            // If reward was claimed, update game state and show animation
            if (result.rewardClaimed) {
              // Update game store with new values
              if (result.points !== undefined) {
                setPointsBalance(result.points);
                setPoints(result.points);
              }
              if (result.totalStars !== undefined) {
                setTotalStars(result.totalStars);
              }
              
              // Show animation for reward
              setShowAnimation(true);
              setTimeout(() => setShowAnimation(false), 5000);
              
              // Trigger haptic feedback for reward
              triggerHapticFeedback(window);
              
              showToast('Tweet verified! Reward claimed!', 'success');
            }
          }
        }
      } catch (error) {
        console.error('Error checking share status:', error);
      }
    }, 30000); // Check every 30 seconds

    sharingIntervalRef.current = interval;
  }, [sharingTracked, userTelegramInitData]);

  // Stop tracking when component unmounts or combo expires
  const stopSharingTracking = useCallback(() => {
    if (sharingIntervalRef.current) {
      clearInterval(sharingIntervalRef.current);
      sharingIntervalRef.current = null;
    }
  }, []);

  const fetchCombo = useCallback(async () => {
    if (!userTelegramInitData) return;

    try {
      const res = await fetch('/api/combo-of-the-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData })
      });

      if (!res.ok) throw new Error(t('errorLoadingCombo'));

      const data: ComboData = await res.json();

      setGameState((prev) => ({
        ...prev,
        cards: data.upgrades,
        discoveredIds: data.discoveredIds || [],
        endsAt: new Date(data.endsAt),
        loading: false,
        error: '',
        comboCompleted: data.discoveredCount === 3,
        rewardClaimed: data.rewardClaimed
      }));

      // Set combo images for modal
      const discoveredImages = data.upgrades.filter((card) => card.discovered).map((card) => card.image);

      setModalState((prev) => ({
        ...prev,
        comboImages: discoveredImages
      }));
    } catch (err) {
      setGameState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t('errorLoadingCombo'),
        loading: false
      }));
    }
  }, [userTelegramInitData, t]);

  // Check if user shared when returning to app
  const checkShareOnReturn = useCallback(async () => {
    // Prevent multiple verification calls
    if (isVerifyingRef.current) {
      console.log('Verification already in progress, skipping...');
      return;
    }

    isVerifyingRef.current = true;
    
    try {
      const response = await fetch('/api/combo-of-the-day/verify-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData
          // verifyOnly: false (default) - will verify with Twitter API
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.verified && result.rewardClaimed) {
          console.log('Tweet verified and reward given!');
          
          // Update game store with new values from verification
          if (result.points !== undefined) {
            setPointsBalance(result.points);
            setPoints(result.points);
          }
          if (result.totalStars !== undefined) {
            setTotalStars(result.totalStars);
          }
          
          // Show animation for reward
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 5000);
          
          // Trigger haptic feedback for reward
          triggerHapticFeedback(window);
          
          showToast('Tweet verified! Reward claimed!', 'success');
          
          // Stop interval tracking since verification succeeded
          if (sharingIntervalRef.current) {
            clearInterval(sharingIntervalRef.current);
            sharingIntervalRef.current = null;
          }
          
          // Refresh combo data to update UI
          fetchCombo();
        }
      }
    } catch (error) {
      console.error('Error verifying tweet:', error);
    } finally {
      isVerifyingRef.current = false;
    }
  }, [userTelegramInitData, showToast, fetchCombo, setPointsBalance, setPoints]);

  const handleShare = useCallback(async () => {
    try {
      setModalState((prev) => ({ ...prev, isSharing: true }));
      triggerHapticFeedback(window);

      const response = await fetch('/api/combo-of-the-day/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to generate combo banner');

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to generate combo banner');

      const tweetText = `🃏 Combo cracked!
Doubled my rewards today on @JokInTheBox_Off 💥
Don't miss your chance — find yours and share it now 🎯
${result.shareUrl}
#JOKCombo #EarnWhilePlaying #CryptoGaming`;

      const encodedText = encodeURIComponent(tweetText);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;

      // Use SDK for opening links
      if (typeof window !== 'undefined') {
        try {
          const WebApp = (await import('@twa-dev/sdk')).default;
          if (WebApp && WebApp.initData) {
            WebApp.openLink(twitterUrl, { try_instant_view: false });
        } else {
            window.open(twitterUrl, '_blank');
          }
        } catch (error) {
          console.error('Failed to load WebApp SDK, falling back to window.open:', error);
          window.open(twitterUrl, '_blank');
        }
        } else {
        (window as any).open(twitterUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('Failed to share combo', 'error');
    } finally {
      setModalState((prev) => ({ ...prev, isSharing: false }));
    }
  }, [showToast]);

  const handleClaim = useCallback(
    async (shared: boolean) => {
    try {
      const res = await fetch('/api/combo-of-the-day/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            twitterShare: shared
          })
      });

      if (!res.ok) throw new Error(t('errorClaimingReward'));

      const data = await res.json();

        // Update game store with new values
      setTotalStars(data.totalStars);
      setUpgradeYieldPerHour(data.yieldPerHour);
      setPointsBalance(data.points);
      setPoints(data.points);

        // Update local state
        setGameState((prev) => ({ ...prev, rewardClaimed: true }));
        setModalState((prev) => ({ ...prev, isOpen: false }));

        // Show animation
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 5000);

      showToast(t('rewardClaimed'), 'success');
    } catch (error) {
        console.error('Error claiming reward:', error);
      showToast(t('errorClaimingReward'), 'error');
    }
    },
    [
      userTelegramInitData,
      upgradeYieldPerHour,
      t,
      showToast,
      setTotalStars,
      setUpgradeYieldPerHour,
      setPointsBalance,
      setPoints
    ]
  );

  const handleComboDiscovered = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{
        comboHit: boolean;
        comboCompleted: boolean;
        discoveredCardImage: string;
        comboImages: string[];
      }>;

      const { comboHit, comboCompleted, discoveredCardImage, comboImages } = customEvent.detail;

      if (comboHit) {
        setModalState((prev) => ({
          ...prev,
          selectedCardImage: discoveredCardImage,
          comboImages: comboImages || [],
          isOpen: true
        }));

        setGameState((prev) => ({
          ...prev,
          comboCompleted
        }));

        fetchCombo();
      }
    },
    [fetchCombo]
  );

  // Effects
  useEffect(() => {
    fetchCombo();
  }, [fetchCombo]);

  useEffect(() => {
    window.addEventListener('comboDiscovered', handleComboDiscovered);
    return () => window.removeEventListener('comboDiscovered', handleComboDiscovered);
  }, [handleComboDiscovered]);

  // Telegram WebApp event listeners
  useEffect(() => {
    let WebApp: any = null;
    let handleActivated: (() => void) | null = null;

    const setupWebAppListener = async () => {
      if (typeof window !== 'undefined') {
        try {
          WebApp = (await import('@twa-dev/sdk')).default;
          
          // Listen for when user returns to the app (e.g., from Twitter)
          handleActivated = () => {
            console.log('App activated - checking if user shared...');
            checkShareOnReturn();
          };

          // Add Telegram WebApp event listener
          if (WebApp && typeof WebApp.onEvent === 'function') {
            WebApp.onEvent('activated', handleActivated);
          }
        } catch (error) {
          console.error('Failed to load Telegram WebApp SDK:', error);
        }
      }
    };

    setupWebAppListener();

    return () => {
      // Properly remove the event listener
      if (WebApp && handleActivated && typeof WebApp.offEvent === 'function') {
        try {
          WebApp.offEvent('activated', handleActivated);
          console.log('Telegram WebApp event listener removed');
        } catch (error) {
          console.error('Error removing Telegram WebApp event listener:', error);
        }
      }
    };
  }, [checkShareOnReturn]);

  // Auto-open modal if combo is completed and not claimed
  useEffect(() => {
    if (isComboCompleted && !gameState.rewardClaimed && !modalState.isOpen) {
      setModalState((prev) => ({ ...prev, isOpen: true }));
      // Start tracking sharing when combo is completed
      startSharingTracking();
    }
  }, [isComboCompleted, gameState.rewardClaimed, modalState.isOpen, startSharingTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharingTracking();
    };
  }, [stopSharingTracking]);

  // Loading states
  if (gameState.loading && showLoading) {
    return (
      <div className='flex justify-center items-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-customGreen-700'></div>
      </div>
    );
  }

  if (gameState.error && showLoading) {
    return <p className='text-center mt-10 text-red-500'>{gameState.error}</p>;
  }

  if (gameState.loading && !showLoading) {
    return (
      <div className='max-w-md mx-auto p-4'>
        <h2 className='text-xl font-bold text-center mb-2'>{t('title')}</h2>
        <div className='flex justify-center items-center h-32'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-customGreen-700'></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='max-w-md mx-auto p-4'>
        <h2 className='text-xl font-bold text-center mb-2'>{t('title')}</h2>
        <p className='text-center text-sm text-gray-500 mb-4'>
          {t('timeLeft')}: <Countdown endsAt={gameState.endsAt} />
        </p>

        <div className='flex justify-center gap-3 mb-3'>
          {gameState.cards.map((card) => (
            <ComboCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <ComboModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        comboCompleted={isComboCompleted}
        selectedCardImage={modalState.selectedCardImage}
        comboImages={modalState.comboImages}
        onClaim={handleClaim}
        onShare={handleShare}
        isSharing={modalState.isSharing}
        upgradeYieldPerHour={upgradeYieldPerHour}
        t={t}
      />

      {showAnimation && <LottieOverlay />}
    </>
  );
}
