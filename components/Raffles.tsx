// components/Raffles.tsx

'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { BIG_REWARD, BIG_REWARD_PLAYERS, RAFFLE_TICKETS, SMALL_REWARD, SMALL_REWARD_PLAYERS } from '@/utils/consts';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { calculateYieldPerHour } from '@/utils/calculations';
import RaffleTabs from './raffles/RaffleTabs';
import TodayRaffle from './raffles/TodayRaffle';
import PreviousRaffle from './raffles/PreviousRaffle';
import { useTranslations } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';

interface RafflesProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

interface ClaimedTier {
  tier: number;
  claimed: boolean;
}

interface RaffleSettings {
  bigRewardAmount: number;
  bigRewardPlayers: number;
  smallRewardAmount: number;
  smallRewardPlayers: number;
}

const Raffles = memo(({ currentView, setCurrentView }: RafflesProps) => {
  const t = useTranslations('Raffles');
  const showToast = useToast();
  const { userTelegramInitData, bonusYieldPerHour, upgradeYieldPerHour } = useGameStore();
  const [activeTab, setActiveTab] = useState('today');
  const [currentRaffle, setCurrentRaffle] = useState<any>(null);
  const [previousRaffle, setPreviousRaffle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForNewRaffle, setWaitingForNewRaffle] = useState(false);
  const [userTickets, setUserTickets] = useState(0);
  const [pointsProgress, setPointsProgress] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState<ClaimedTier[]>([]);
  const [maxEligibleTier, setMaxEligibleTier] = useState(0);
  const [currentTier, setCurrentTier] = useState(-1);
  const [raffleSettings, setRaffleSettings] = useState<RaffleSettings>({
    bigRewardAmount: BIG_REWARD,
    bigRewardPlayers: BIG_REWARD_PLAYERS,
    smallRewardAmount: SMALL_REWARD,
    smallRewardPlayers: SMALL_REWARD_PLAYERS
  });

  const yieldPerHour = calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);

  const handleViewChange = useCallback(
    (view: string) => {
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
    },
    [setCurrentView]
  );

  // Fetch raffle settings from admin panel
  const fetchRaffleSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/raffle-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setRaffleSettings({
            bigRewardAmount: data.settings.bigRewardAmount || BIG_REWARD,
            bigRewardPlayers: data.settings.bigRewardPlayers || BIG_REWARD_PLAYERS,
            smallRewardAmount: data.settings.smallRewardAmount || SMALL_REWARD,
            smallRewardPlayers: data.settings.smallRewardPlayers || SMALL_REWARD_PLAYERS
          });
        }
      }
    } catch (error) {
      console.error('Error fetching raffle settings:', error);
    }
  }, []);

  useEffect(() => {
    // Find the highest tier the user is eligible for
    let highestTier = -1;
    for (let i = 0; i < RAFFLE_TICKETS.length; i++) {
      if (yieldPerHour >= RAFFLE_TICKETS[i].yield) {
        highestTier = i;
      } else {
        break;
      }
    }

    setCurrentTier(highestTier);
    setMaxEligibleTier(highestTier);

    // Calculate progress for the progress bar
    if (highestTier === RAFFLE_TICKETS.length - 1) {
      // Max tier reached - show 100%
      setPointsProgress(100);
    } else {
      // Get next tier
      const nextTierIndex = highestTier + 1;

      // Calculate progress as percentage between current yield and next tier requirement
      const nextTierYield = RAFFLE_TICKETS[nextTierIndex].yield;
      const progressPercentage = (yieldPerHour / nextTierYield) * 100;

      setPointsProgress(Math.min(progressPercentage, 100));
    }
  }, [yieldPerHour]);

  // Fetch current raffle data
  const fetchCurrentRaffle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/raffle?type=current&initData=${encodeURIComponent(userTelegramInitData)}`);
      if (!response.ok) throw new Error(t('failedToFetchCurrentRaffle'));

      const data = await response.json();

      // Check if there's no active raffle
      if (data.noActiveRaffle) {
        setWaitingForNewRaffle(true);
        setCurrentRaffle(null);
        setUserTickets(0);
        setClaimedTiers([]);
      } else {
        setWaitingForNewRaffle(false);
        setCurrentRaffle(data.raffle);
        setUserTickets(data.userEntries || 0);

        if (data.claimedTiers) {
          setClaimedTiers(data.claimedTiers);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching current raffle:', error);
      showToast(t('failedToFetchCurrentRaffle'), 'error');
      setLoading(false);
    }
  }, [userTelegramInitData]);

  // Fetch previous raffle with winners
  const fetchPreviousRaffle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/raffle?type=previous&initData=${encodeURIComponent(userTelegramInitData)}`);
      if (!response.ok) throw new Error(t('failedToFetchPreviousRaffle'));

      const data = await response.json();
      setPreviousRaffle(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching previous raffle:', error);
      showToast(t('failedToFetchPreviousRaffle'), 'error');
      setLoading(false);
    }
  }, [userTelegramInitData]);

  // Claim a ticket for a specific tier
  const claimTicket = useCallback(
    async (tierIndex: number) => {
      try {
        triggerHapticFeedback(window);

        if (claimedTiers[tierIndex]?.claimed) {
          console.log(`Tier ${tierIndex} already claimed`);
          return;
        }

        if (tierIndex > maxEligibleTier) {
          console.log(`Not eligible for tier ${tierIndex}`);
          return;
        }

        const response = await fetch('/api/raffle/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            tier: tierIndex // Pass the tier being claimed
          })
        });

        if (!response.ok) throw new Error(t('failedToAddTicket'));

        const data = await response.json();
        if (data.success) {
          setUserTickets((prev) => prev + data.ticketsAdded);

          const updatedTiers = [...claimedTiers];
          updatedTiers[tierIndex] = { tier: tierIndex, claimed: true };
          setClaimedTiers(updatedTiers);
        }
      } catch (error) {
        console.error('Error claiming ticket:', error);
        showToast(t('failedToAddTicket'), 'error');
      }
    },
    [userTelegramInitData, claimedTiers, maxEligibleTier]
  );

  // Handle countdown completion (when timer runs out)
  const handleCountdownComplete = useCallback(() => {
    setWaitingForNewRaffle(true);

    // Retry fetching new raffle data every 5 minutes
    const retryInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/raffle?type=current&initData=${encodeURIComponent(userTelegramInitData)}`);
        if (response.ok) {
          const data = await response.json();

          // Check if there's a new raffle available
          if (!data.noActiveRaffle && data.raffle && data.raffle.id !== currentRaffle?.id) {
            // New raffle found
            setCurrentRaffle(data.raffle);
            setUserTickets(data.userEntries || 0);
            if (data.claimedTiers) {
              setClaimedTiers(data.claimedTiers);
            }
            setWaitingForNewRaffle(false);
            clearInterval(retryInterval);
          } else if (data.noActiveRaffle) {
            // Still no active raffle, keep waiting
            setWaitingForNewRaffle(true);
            setCurrentRaffle(null);
          }
        }
      } catch (error) {
        console.error('Error checking for new raffle:', error);
      }
    }, 300000);

    // Stop retrying after 30 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(retryInterval);
      setWaitingForNewRaffle(false);
    }, 1800000);
  }, [userTelegramInitData, currentRaffle?.id]);

  // Fetch raffle data based on active tab
  useEffect(() => {
    if (activeTab === 'today') {
      fetchCurrentRaffle();
    } else {
      fetchPreviousRaffle();
    }
  }, [activeTab]);

  // Initial data fetch
  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
    fetchRaffleSettings();
    fetchCurrentRaffle();
  }, []);

  const LoadingSpinner = () => (
    <div className='flex-1 flex items-center justify-center'>
      <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500'></div>
    </div>
  );

  return (
    <div className='bg-black flex justify-center safe-min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='h-screen mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0'>
          <div className='flex-grow mt-[2px] bg-[#080808] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'>
            <div className='px-4 pt-1 pb-[calc(90px+1.5rem+20px)] margin-safe-area-top margin-safe-area-bottom'>
              {/* Header */}
              <div className='flex items-center mb-6'>
                <div className='w-10'></div>
                <h1 className='text-2xl font-bold text-center flex-1'>{t('title')}</h1>
                <div className='w-10'></div>
              </div>

              {/* Tabs */}
              <RaffleTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {loading ? (
                <LoadingSpinner />
              ) : activeTab === 'today' ? (
                <TodayRaffle
                  endDate={currentRaffle?.endDate}
                  onCountdownComplete={handleCountdownComplete}
                  userTickets={userTickets}
                  yieldPerHour={yieldPerHour}
                  pointsProgress={pointsProgress}
                  maxEligibleTier={maxEligibleTier}
                  currentTier={currentTier}
                  claimedTiers={claimedTiers}
                  onClaimTicket={claimTicket}
                  bigReward={String(raffleSettings.bigRewardAmount)}
                  bigRewardPlayers={String(raffleSettings.bigRewardPlayers)}
                  smallReward={String(raffleSettings.smallRewardAmount)}
                  smallRewardPlayers={String(raffleSettings.smallRewardPlayers)}
                  waitingForNewRaffle={waitingForNewRaffle}
                />
              ) : (
                <PreviousRaffle winners={previousRaffle?.winners || []} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Raffles;
