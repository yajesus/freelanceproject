// components/popups/TONTaskPopup.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { Cell, toNano } from '@ton/ton';
import { useTranslations } from 'next-intl';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { imageMap, JOK_POINTS_UP } from '@/images';
import { DAILY_TON_TRANSACTION_ADDRESS, DAILY_TON_TRANSACTION_AMOUNT, TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { useToast } from '@/contexts/ToastContext';
import { TaskPopupProps } from '@/utils/types';
import { calculateYieldPerHour } from '@/utils/calculations';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchTransactionWithRetry = async (hashHex: string, maxRetries = 5, retryDelay = 10000) => {
  let retries = 0;
  let success = false;
  let transactionData = null;

  while (retries < maxRetries && !success) {
    try {
      const response = await fetch(`https://tonapi.io/v2/blockchain/transactions/${hashHex}`);

      if (response.ok || response.status === 200) {
        transactionData = await response.json();

        if (
          transactionData &&
          transactionData.success !== false &&
          !transactionData.aborted &&
          !transactionData.destroyed &&
          !transactionData.error &&
          transactionData.out_msgs?.[0]?.value
        ) {
          success = true;
        } else {
          console.log(`Attempt ${retries + 1}: Transaction data not fully populated yet, retrying...`);
          await sleep(retryDelay);
        }
      } else {
        console.log(`Attempt ${retries + 1}: Transaction not found, retrying...`);
        await sleep(retryDelay);
      }
    } catch (error) {
      console.error(`Attempt ${retries + 1}: Error fetching transaction:`, error);
      await sleep(retryDelay);
    }

    retries++;
  }

  if (!success) {
    throw new Error('Transaction verification failed after multiple attempts');
  }

  return transactionData;
};

const TONTaskPopup: React.FC<TaskPopupProps> = React.memo(
  ({ task: initialTask, onClose, onUpdate, handleViewChange, currentView, setCurrentView }) => {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const t = useTranslations('TaskPopup');
    const showToast = useToast();
    const {
      userTelegramInitData,
      incrementPoints,
      setTotalStars,
      setEarnedStars,
      bonusYieldPerHour,
      upgradeYieldPerHour
    } = useGameStore();

    // State
    const [isClosing, setIsClosing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [task, setTask] = useState(initialTask);
    const [showAnimation, setShowAnimation] = useState(false);

    const handleClose = () => {
      triggerHapticFeedback(window);
      setIsClosing(true);
      setTimeout(onClose, 280);
    };

    useEffect(() => {
      const setupBackButton = async () => {
        await showBackButton(() => {
          handleClose();
          return true;
        });
      };

      setupBackButton();
    }, []);

    // Calculate time until next reset if task is completed
    const initialTime = useMemo(() => {
      if (task.completedAt) {
        const completedAt = new Date(task.completedAt);
        const now = new Date();
        const resetTime = new Date(completedAt);
        resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

        if (resetTime <= completedAt) {
          resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }

        return Math.max(0, resetTime.getTime() - now.getTime());
      }
      return 0;
    }, [task.completedAt]);

    const { formattedTime, isExpired } = useCountdownTimer(initialTime);

    // Check if task can be completed
    const canCompleteTask = useCallback(() => {
      if (!task.completedAt) return true;

      const completedAt = new Date(task.completedAt);
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

      if (resetTime <= completedAt) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      }

      return now >= resetTime;
    }, [task.completedAt]);

    // Handle TON transaction
    const handleTaskCompletion = async () => {
      if (!canCompleteTask()) {
        showToast(t('taskNotAvailable'), 'error');
        return;
      }

      if (!wallet || !tonConnectUI) {
        showToast(t('connectWallet'), 'error');
        return;
      }

      setIsLoading(true);
      triggerHapticFeedback(window);

      try {
        // Execute TON transaction
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 60,
          messages: [
            {
              address: DAILY_TON_TRANSACTION_ADDRESS,
              amount: toNano(DAILY_TON_TRANSACTION_AMOUNT).toString()
            }
          ]
        };

        const result = await tonConnectUI.sendTransaction(transaction, {
          modals: ['before', 'error']
        });

        if (!result.boc) {
          throw new Error('Transaction failed - no BOC returned');
        }

        const cell = Cell.fromBase64(result.boc);
        const buffer = cell.hash();
        const hashHex = buffer.toString('hex');

        // Verify transaction with retry logic
        const transactionData = await fetchTransactionWithRetry(hashHex);

        // After successful transaction verification, update the task status
        const response = await fetch('/api/tasks/update/ton-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            taskId: task.id,
            transactionHash: hashHex,
            transactionData: transactionData
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('failedToVerify'));
        }

        if (data.success) {
          const updatedTask = {
            ...task,
            isCompleted: data.isCompleted,
            completedAt: data.completedAt
          };
          setTask(updatedTask);
          onUpdate(updatedTask);
          incrementPoints(data.points);
          setTotalStars(data.totalStars);
          setEarnedStars(data.earnedStars);
          showToast(data.message || t('taskCompleted'), 'success');
          setShowAnimation(true);
          setTimeout(() => {
            setShowAnimation(false);
          }, 5000);
          handleClose();
        } else {
          showToast(data.message || t('taskCheckFailed'), 'error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('taskCheckFailed');
        showToast(errorMessage, 'error');
        console.error('Task error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const calculatedPoints = useMemo(() => {
      const basePoints = task.points || 0;
      const bonusPoints = calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);
      const multiplier = task.multiplier || 2;
      return formatNumber(basePoints + bonusPoints * multiplier);
    }, [task.points, bonusYieldPerHour, upgradeYieldPerHour, task.multiplier]);

    const isFullscreen = Boolean(task.taskData.backgroundImage);

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'>
        <div
          className={`bg-[#272a2f] rounded-3xl p-6 w-full max-w-xl 
              ${isClosing ? 'animate-slide-down' : 'animate-slide-up'} 
              ${isFullscreen ? 'h-full safe-area-top safe-area-bottom' : ''}
              `}
          style={{
            backgroundImage: task.taskData.backgroundImage ? `url(${task.taskData.backgroundImage})` : 'none',
            backgroundSize: 'cover'
          }}
        >
          <div className={`${isFullscreen ? ' relative h-full flex flex-col justify-end items-center' : ''} `}>
            {typeof window !== 'undefined' && !window.Telegram?.WebApp?.isFullscreen && (
              <button
                onClick={handleClose}
                className='absolute top-0 right-0 w-6 h-6 aspect-square text-white bg-customGreen-700 rounded-full'
              >
                &times;
              </button>
            )}

            <div
              className={`flex justify-between items-center mb-4 
            ${isFullscreen ? 'absolute top-6 right-6 left-6' : ''}`}
            >
              <div className='w-8' />
              <h2
                className={`text-3xl text-white text-center font-bold ${isFullscreen ? 'backdrop-brightness-50' : ''}`}
              >
                {task.title}
              </h2>
              <div className='w-8' />
            </div>

            {!isFullscreen && (
              <Image
                priority={false}
                src={task.partnerImage?.includes('http') ? task.partnerImage : imageMap[task.partnerImage]}
                alt={task.title}
                width={80}
                height={80}
                className='mx-auto mb-4'
              />
            )}

            <p
              className={`text-gray-300 text-center mb-4 
            ${isFullscreen ? 'text-lg backdrop-brightness-50' : ''}`}
            >
              {task.description}
            </p>

            <div className='flex justify-center items-center gap-2'>
              <div className='flex justify-center items-center'>
                <span className='text-white font-bold text-2xl mr-1'>{t('win')}:</span>
                <Image
                  priority={false}
                  src={JOK_POINTS_UP}
                  alt='JOK Points'
                  width={24}
                  height={24}
                  className='w-6 h-6'
                />
                <span className='text-white font-bold text-2xl ml-1'>+{calculatedPoints}</span>

                {task.rewardStars && (
                  <>
                    <span className='font-bold ml-2'>+</span>
                    <Image
                      priority={false}
                      src={'/star.png'}
                      alt='Star'
                      width={24}
                      height={24}
                      className='w-6 h-6 mr-1 ml-2'
                    />
                    <span className='text-white font-bold text-2xl ml-1'>{task.rewardStars}</span>
                  </>
                )}
              </div>
            </div>
            <button
              className={`w-fit px-4 py-6 mt-2 text-xl font-bold text-white rounded-2xl flex items-center justify-center 
            ${!canCompleteTask() || isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-customGreen-700 animate-pulse'}`}
              onClick={() => {
                !wallet ? handleViewChange?.('profile') : handleTaskCompletion();
              }}
              disabled={!canCompleteTask() || isLoading}
            >
              {isLoading ? (
                <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin' />
              ) : !wallet ? (
                t('connectWallet')
              ) : !canCompleteTask() ? (
                formattedTime
              ) : (
                t('claimRewardTON')
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

TONTaskPopup.displayName = 'TONTaskPopup';

export default TONTaskPopup;
