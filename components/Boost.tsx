// components/Boost.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { battery, lightning, multiclick } from '@/images';
import IceCubes from '@/icons/IceCubes';
import { calculateEnergyLimitUpgradeCost, calculateMultitapUpgradeCost, useGameStore } from '@/utils/game-mechanics';
import IceCube from '@/icons/IceCube';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { useHydration } from '@/utils/useHydration';
import { ENERGY_REFILL_COOLDOWN, MAX_ENERGY_REFILLS_PER_DAY } from '@/utils/consts';
import Time from '@/icons/Time';
import { useTranslations } from 'next-intl';

interface BoostProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export default function Boost({ currentView, setCurrentView }: BoostProps) {
  const t = useTranslations('Boost');
  const showToast = useToast();
  const isHydrated = useHydration();

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

  const {
    userTelegramInitData,
    pointsBalance,
    energyRefillsLeft,
    energyLimitLevelIndex,
    multitapLevelIndex,
    lastEnergyRefillTimestamp,
    initializeState,
    refillEnergy,
    upgradeEnergyLimit,
    upgradeMultitap
  } = useGameStore();

  const [isEnergyRefillAvailable, setIsEnergyRefillAvailable] = useState(false);
  const [isMultitapAffordable, setIsMultitapAffordable] = useState(false);
  const [isEnergyLimitAffordable, setIsEnergyLimitAffordable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const [isLoadingRefill, setIsLoadingRefill] = useState(false);
  const [isLoadingMultitap, setIsLoadingMultitap] = useState(false);
  const [isLoadingEnergyLimit, setIsLoadingEnergyLimit] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getTimeRemaining = useCallback(() => {
    if (!lastEnergyRefillTimestamp || energyRefillsLeft === MAX_ENERGY_REFILLS_PER_DAY) return 0;
    const now = new Date();
    const lastRefill = new Date(lastEnergyRefillTimestamp);
    const elapsedTime = now.getTime() - lastRefill.getTime();
    return Math.max(ENERGY_REFILL_COOLDOWN - elapsedTime, 0);
  }, [lastEnergyRefillTimestamp, energyRefillsLeft]);

  const formatTime = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleEnergyRefill = async () => {
    if (isEnergyRefillAvailable) {
      setIsLoadingRefill(true);
      try {
        triggerHapticFeedback(window);
        const response = await fetch('/api/refill-energy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData
          })
        });

        if (!response.ok) {
          throw new Error(t('refillFailed'));
        }

        const result = await response.json();

        if (!result.lastEnergyRefillsTimestamp) return;

        // Update local state with the new values
        refillEnergy();
        initializeState({
          lastEnergyRefillTimestamp: result.lastEnergyRefillsTimestamp
        });

        showToast(t('refillSuccessful'), 'success');
      } catch (error) {
        console.error('Error refilling energy:', error);
        showToast(t('refillFailed'), 'error');
      } finally {
        setIsLoadingRefill(false);
      }
    }
  };

  const handleMultitapUpgrade = async () => {
    if (isMultitapAffordable && !isLoadingMultitap) {
      setIsLoadingMultitap(true);
      try {
        triggerHapticFeedback(window);
        const response = await fetch('/api/upgrade/multitap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData
          })
        });

        if (!response.ok) {
          throw new Error(t('multitapFailed'));
        }

        const result = await response.json();

        // Update local state with the new values
        upgradeMultitap();

        showToast(t('multitapSuccessful'), 'success');
      } catch (error) {
        console.error('Error upgrading multitap:', error);
        showToast(t('multitapFailed'), 'error');
      } finally {
        setIsLoadingMultitap(false);
      }
    }
  };

  const handleEnergyLimitUpgrade = async () => {
    if (isEnergyLimitAffordable && !isLoadingEnergyLimit) {
      setIsLoadingEnergyLimit(true);
      try {
        triggerHapticFeedback(window);
        const response = await fetch('/api/upgrade/energy-limit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData
          })
        });

        if (!response.ok) {
          throw new Error(t('energyLimitFailed'));
        }

        const result = await response.json();

        // Update local state with the new values
        upgradeEnergyLimit();

        showToast(t('energyLimitSuccessful'), 'success');
      } catch (error) {
        console.error('Error upgrading energy limit:', error);
        showToast(t('energyLimitFailed'), 'error');
      } finally {
        setIsLoadingEnergyLimit(false);
      }
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

  useEffect(() => {
    if (isHydrated && lastEnergyRefillTimestamp && energyRefillsLeft > 0) {
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
  }, [isHydrated, lastEnergyRefillTimestamp, energyRefillsLeft, getTimeRemaining]);

  useEffect(() => {
    const isAvailable =
      energyRefillsLeft > 0 && (energyRefillsLeft === MAX_ENERGY_REFILLS_PER_DAY || timeRemaining === 0);
    setIsEnergyRefillAvailable(isAvailable);
  }, [energyRefillsLeft, timeRemaining]);

  useEffect(() => {
    const isAffordable = calculateMultitapUpgradeCost(multitapLevelIndex) <= pointsBalance;
    setIsMultitapAffordable(isAffordable);
  }, [pointsBalance, multitapLevelIndex]);

  useEffect(() => {
    const isAffordable = calculateEnergyLimitUpgradeCost(energyLimitLevelIndex) <= pointsBalance;
    setIsEnergyLimitAffordable(isAffordable);
  }, [pointsBalance, energyLimitLevelIndex]);

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 bg-customGreen-700 rounded-t-[48px] relative top-glow z-0'>
          <div className='mt-[2px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'>
            <div className='px-4 pt-1 pb-24'>
              <div className='px-4 mt-4 flex justify-center'>
                <div className='px-4 py-2 flex items-center space-x-2'>
                  <IceCubes className='w-12 h-12 mx-auto' />
                  <p className='text-4xl text-white' suppressHydrationWarning>
                    {Math.floor(pointsBalance).toLocaleString()}
                  </p>
                </div>
              </div>

              <h2 className='text-base mt-8'>{t('freeDailyBoosters')}</h2>
              <div className='mt-4'>
                <button
                  className='w-full flex justify-between items-center bg-[#272a2f] rounded-lg p-4'
                  onClick={handleEnergyRefill}
                  disabled={!isEnergyRefillAvailable}
                >
                  <div className='flex items-center'>
                    <Image priority={false} src={lightning} alt='Exchange' width={40} height={40} />
                    <div className='flex flex-col ml-2'>
                      <span className='text-left font-medium'>{t('fullEnergy')}</span>
                      <span className='font-normal text-gray-500'>
                        {energyRefillsLeft}/6 {t('available')}
                      </span>
                    </div>
                  </div>
                  {isLoadingRefill ? (
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
                  ) : timeRemaining !== null && timeRemaining > 0 ? (
                    <div className='flex items-center'>
                      <Time className='w-4 h-4 mr-1 text-yellow-500' />
                      <span className='text-yellow-500'>{isHydrated ? formatTime(timeRemaining) : t('loading')}</span>
                    </div>
                  ) : (
                    <span className='text-customGreen-700'>{t('refill')}</span>
                  )}
                </button>
              </div>

              <h2 className='text-base mt-8'>{t('boosters')}</h2>
              <div className='mt-4'>
                <button
                  className='w-full flex justify-between items-center bg-[#272a2f] rounded-lg p-4'
                  onClick={handleMultitapUpgrade}
                  disabled={isLoadingMultitap || !isMultitapAffordable}
                >
                  <div className='flex items-center'>
                    <Image priority={false} src={multiclick} alt='Exchange' width={40} height={40} />
                    <div className='flex flex-col ml-2'>
                      <span className='text-left font-medium'>{t('multitap')}</span>
                      <div className='flex justify-center items-center'>
                        <IceCube size={24} />
                        <span className='ml-1 text-gray-500'>
                          <span className={`font-bold ${isMultitapAffordable ? 'text-white' : ''}`}>
                            {formatNumber(calculateMultitapUpgradeCost(multitapLevelIndex))}
                          </span>{' '}
                          • {multitapLevelIndex + 1} lvl
                        </span>
                      </div>
                    </div>
                  </div>
                  {isLoadingMultitap ? (
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
                  ) : (
                    <span className='text-customGreen-700'>{t('upgrade')}</span>
                  )}
                </button>
                <button
                  className='w-full flex justify-between items-center bg-[#272a2f] rounded-lg p-4 mt-2'
                  onClick={handleEnergyLimitUpgrade}
                  disabled={isLoadingEnergyLimit || !isEnergyLimitAffordable}
                >
                  <div className='flex items-center'>
                    <Image priority={false} src={battery} alt='Exchange' width={40} height={40} />
                    <div className='flex flex-col ml-2'>
                      <span className='text-left font-medium'>{t('energyLimit')}</span>
                      <div className='flex justify-center items-center'>
                        <IceCube size={24} />
                        <span className='ml-1 text-gray-500'>
                          <span className={`font-bold ${isEnergyLimitAffordable ? 'text-white' : ''}`}>
                            {formatNumber(calculateEnergyLimitUpgradeCost(energyLimitLevelIndex))}
                          </span>{' '}
                          • {energyLimitLevelIndex + 1} lvl
                        </span>
                      </div>
                    </div>
                  </div>
                  {isLoadingEnergyLimit ? (
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
                  ) : (
                    <span className='text-customGreen-700'>{t('upgrade')}</span>
                  )}
                </button>
              </div>

              <button
                onClick={() => handleViewChange('game')}
                className='mx-auto block mt-4 text-center text-customGreen-700'
              >
                {t('backToGame')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
