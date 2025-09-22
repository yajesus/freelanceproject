// components/popups/TaskPopup.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { imageMap, JOK_POINTS_UP } from '@/images';
import { useHydration } from '@/utils/useHydration';
import {
  TASK_WAIT_TIME,
  TASK_DAILY_RESET_TIME,
  ADD_TO_HOMESCREEN_TASK_NAME,
  SHARE_STORY_TASK_NAME,
  SHARE_AFFILIATE_LINK_TASK_NAME
} from '@/utils/consts';
import { useToast } from '@/contexts/ToastContext';
import { TaskPopupProps } from '@/utils/types';
import { useTranslations } from 'next-intl';
import { calculateYieldPerHour } from '@/utils/calculations';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import StoryTaskSharer from '@/components/StoryTaskSharer';
import { getUserTelegramId } from '@/utils/user';
import { initUtils } from '@telegram-apps/sdk';

const STORAGE_KEY = 'viewedTaskLinks';

const TaskButton: React.FC<{
  canStartTask: () => boolean;
  isLoading: boolean;
  isFullscreen: boolean;
  localTask: any;
  formattedTime: string;
  isExpired: boolean;
  isHydrated: boolean;
  hasViewedLink: boolean;
  handleOpenLink: () => void;
  handleStart: () => void;
  handleCheck: () => void;
  isHomescreenTask: boolean;
  isStoryTask: boolean;
  isAffiliateLinkTask: boolean;
  handleShareAffiliateLink: () => void;
  handleAddToHomescreen: () => void;
  taskError: string | null;
  clearTaskError: () => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  t: any;
}> = ({
  canStartTask,
  isLoading,
  isFullscreen,
  localTask,
  formattedTime,
  isExpired,
  isHydrated,
  hasViewedLink,
  handleOpenLink,
  handleStart,
  handleCheck,
  isHomescreenTask,
  isStoryTask,
  handleAddToHomescreen,
  isAffiliateLinkTask,
  handleShareAffiliateLink,
  taskError,
  clearTaskError,
  currentView,
  setCurrentView,
  t
}) => {
    if (isStoryTask) {
      return (
        <button
          className={`${isFullscreen ? 'w-fit px-4 py-2 ' : 'w-full py-6 '}  text-xl font-bold text-white rounded-2xl 
            flex items-center justify-center 
            ${!canStartTask() || isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-customGreen-700'}`}
          onClick={handleCheck}
          disabled={!canStartTask() || isLoading}
        >
          {isLoading ? (
            <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin' />
          ) : !canStartTask() ? (
            t('completed')
          ) : (
            t('check')
          )}
        </button>
      );
    }
    useEffect(() => {
      const currentParams = new URLSearchParams(window.location.search);

      window.history.pushState({}, '', `?${currentParams.toString()}`);
      console.log('View changed to:', currentView);
      triggerHapticFeedback(window);
    }, [currentView]);
    const handleViewChange = (view: string) => {
      triggerHapticFeedback(window);
      setCurrentView(view);
    };

    const handleErrorViewChange = () => {
      if (!taskError) return;

      if (localTask.title === 'Play one round of JOK Duel') {
        handleViewChange('myjok');
      } else {
        handleViewChange('upgrades');
      }
    };
    return (

      <button
        className={`${isFullscreen ? 'w-fit px-4 py-2 ' : 'w-full py-6 '} text-xl font-bold text-white rounded-2xl 
        flex items-center justify-center 
        ${(!canStartTask() || isLoading) ? 'bg-gray-500 cursor-not-allowed' : 'bg-customGreen-700 cursor-pointer'}`}
        onClick={() => {
          if (taskError) {
            handleErrorViewChange();
          } else {
            // Main click logic
            if (isHomescreenTask) {
              if (localTask.taskStartTimestamp) {
                // if (isExpired) {
                handleCheck();
                // }
              } else {
                handleAddToHomescreen();
              }
            } else if (isAffiliateLinkTask) {
              if (localTask.taskStartTimestamp) {
                // if (isExpired) {
                handleCheck();
                // }
              } else {
                handleShareAffiliateLink();
              }
            } else if (localTask.taskAction.name === 'VISIT') {
              if (localTask.taskStartTimestamp) {
                // if (isExpired) {
                handleCheck();
                // }
              } else {
                handleStart();
              }
            } else if (localTask.taskData.link && !hasViewedLink) {
              handleOpenLink();
            } else {
              handleCheck();
            }
          }
        }}
        disabled={!canStartTask() || isLoading} // Note: this disables only when taskError is false
      >
        {isLoading ? (
          <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin' />
        ) : taskError ? (
          taskError // show error message on button
        ) : !canStartTask() ? (
          t('completed')
        ) : isHomescreenTask || isAffiliateLinkTask ? (
          localTask.taskStartTimestamp ? (
            // isHydrated ? (
            // isExpired ? (
            t('check')
            // ) : (
            // formattedTime
            // )
            // ) : (
            //   t('loading')
            // )
          ) : (
            isHomescreenTask ? t('addToHomescreen') : localTask.callToAction ?? t('share')
          )
        ) : localTask.taskAction.name === 'VISIT' ? (
          localTask.taskStartTimestamp ? (
            //   isHydrated ? (
            //     isExpired ? (
            //       t('check')
            //     ) : (
            //       formattedTime
            //     )
            //   ) : (
            //     t('loading')
            //   )
            // ) 
            t('check')
          )
            : (
              t('start')
            )
        ) : (
          t('check')
        )}
      </button>


    );

  };


const TaskPopup: React.FC<TaskPopupProps> = React.memo(({ task: initialTask, onClose, onUpdate, currentView, setCurrentView }) => {
  const t = useTranslations('TaskPopup');
  const {
    userTelegramInitData,
    incrementPoints,
    setTotalStars,
    setEarnedStars,
    bonusYieldPerHour,
    upgradeYieldPerHour
  } = useGameStore();
  const showToast = useToast();
  const isHydrated = useHydration();

  const [isClosing, setIsClosing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localTask, setLocalTask] = useState(initialTask);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [hasViewedLink, setHasViewedLink] = useState(false);
  const [isPassportReady, setIsPassportReady] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [isInputFocused, setIsInputFocused] = useState(false);
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Check if this is the special homescreen task
  const isHomescreenTask = useMemo(() => {
    return localTask.title === ADD_TO_HOMESCREEN_TASK_NAME && localTask.taskAction.name === 'VISIT';
  }, [localTask]);

  // Check if this is a Story sharing task
  const isStoryTask = useMemo(() => {
    return localTask.title === SHARE_STORY_TASK_NAME && localTask.taskAction.name === 'STORY';
  }, [localTask]);

  // Check if this is an affiliate link sharing task
  const isAffiliateLinkTask = useMemo(() => {
    return localTask.title === SHARE_AFFILIATE_LINK_TASK_NAME;
  }, [localTask]);

  // Pre-load passport for story tasks
  useEffect(() => {
    if (isStoryTask) {
      // Reset passport ready state when opening story task
      setIsPassportReady(false);
    }
  }, [isStoryTask]);

  const getViewedLinksFromStorage = useCallback(() => {
    try {
      if (typeof window === 'undefined') return {};
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }, []);

  const isLinkViewed = useCallback(
    (taskId: string) => {
      try {
        const viewedLinks = getViewedLinksFromStorage();
        return !!viewedLinks[taskId];
      } catch (error) {
        console.error('Error checking viewed link:', error);
        return false;
      }
    },
    [getViewedLinksFromStorage]
  );

  const setLinkViewed = useCallback(
    (taskId: string) => {
      try {
        if (typeof window === 'undefined') return;
        const viewedLinks = getViewedLinksFromStorage();
        viewedLinks[taskId] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedLinks));
      } catch (error) {
        console.error('Error setting viewed link:', error);
      }
    },
    [getViewedLinksFromStorage]
  );

  const handleClose = () => {
    triggerHapticFeedback(window);
    setIsClosing(true);
    setTimeout(onClose, 280);
  };

  const startTaskInDB = async () => {
    try {
      const response = await fetch('/api/tasks/update/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          taskId: localTask.id
        })
      });

      if (!response.ok) {
        throw new Error(t('failedToStartTask', { task: '' }));
      }

      const data = await response.json();
      const updatedTask = {
        ...localTask,
        taskStartTimestamp: new Date(data.taskStartTimestamp)
      };
      setLocalTask(updatedTask);
      onUpdate(updatedTask);
      showToast(t('taskStarted'), 'success');
    } catch (error) {
      console.error('Error starting homescreen task:', error);
      throw error;
    }
  };

  // Check if the app is added to homescreen
  const checkHomeScreenStatus = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    try {
      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.ready();

      return new Promise<boolean>((resolve) => {
        WebApp.checkHomeScreenStatus((status) => {
          // HomeScreenStatus = "unsupported" | "unknown" | "added" | "missed"
          const isAdded = isIOS ? (status === 'added' || status === 'unknown') : status === 'added';
          resolve(isAdded);
        });
      });
    } catch (error) {
      console.error('Error checking homescreen status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleClose();
        return true;
      });
    };

    setupBackButton();

    // Check homescreen status when component mounts if this is a homescreen task
    if (isHomescreenTask) {
      checkHomeScreenStatus();
    }
  }, [isHomescreenTask, checkHomeScreenStatus]);

  useEffect(() => {
    setHasViewedLink(isLinkViewed(initialTask.id));
  }, [initialTask.id, isLinkViewed]);

  // Calculate initial wait time for VISIT tasks
  const initialWaitTime = useMemo(() => {
    if (!localTask.taskStartTimestamp) return 0;
    const startTime = new Date(localTask.taskStartTimestamp);
    const now = new Date();
    const waitTime = localTask.taskData.waitTime ? localTask.taskData.waitTime * 60000 : TASK_WAIT_TIME;
    return Math.max(0, waitTime - (now.getTime() - startTime.getTime()));
  }, [localTask.taskStartTimestamp, localTask.taskData.waitTime]);

  const { formattedTime, isExpired } = useCountdownTimer(initialWaitTime);

  // Check if task can be started/completed based on daily reset time
  const canStartTask = useCallback(() => {
    if (localTask.type !== 'DAILY') return true;

    if (localTask.completedAt) {
      const completedAt = new Date(localTask.completedAt);
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

      if (resetTime <= completedAt) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      }

      return now >= resetTime;
    }

    return true;
  }, [localTask.type, localTask.completedAt]);

  // Validate submission URL
  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Validate UID of Bitget and Gate.IO
  const validateUid = (uid: string) => {
    const uidPattern = /^\d+$/;
    return uidPattern.test(uid);
  };

  // Handle opening the link for non-VISIT tasks
  const handleOpenLink = async () => {
    if (!localTask.taskData.link) return;
    try {
      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        const url = localTask.taskData.link;

        // Function to extract tweet ID from URL (support x.com or twitter.com)
        function extractTweetId(url: string): string | null {
          const match = url.match(/(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/);
          return match ? match[1] : null;
        }

        const tweetId = extractTweetId(url);

        if (tweetId) {
          const twitterDeepLink = `twitter://status?id=${tweetId}`;

          // ✅ Deep link via window.open (NOT WebApp.openLink)
          window.open(twitterDeepLink);

          setTimeout(() => {
            WebApp.openLink(url);
          }, 1000);
        } else {
          // Not a Twitter URL, open normally
          WebApp.openLink(url);
        }

        setLinkViewed(localTask.id);
        setHasViewedLink(true);
      }
    } catch (err) {
      console.error('Error opening link:', err);
    }
    //     WebApp.openLink(localTask.taskData.link);
    //     setLinkViewed(localTask.id);
    //     setHasViewedLink(true);
    //   }
    // } catch (err) {
    //   console.error('Error opening link:', err);
    // }
  };

  const handleAddToHomescreen = async () => {
    if (!canStartTask()) {
      showToast(t('taskNotAvailable'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);

      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();

        // First check if already added
        const isAlreadyAdded = await checkHomeScreenStatus();

        if (isAlreadyAdded) {
          // If already added, start the task directly
          await startTaskInDB();
          return;
        }

        // Request to add the app to homescreen
        WebApp.addToHomeScreen();

        // Start the task (but completion will be verified later)
        await startTaskInDB();
      }
    } catch (error) {
      console.error('Error adding to homescreen:', error);
      showToast(t('homescreenError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };



  // Handle task start
  const handleStart = async () => {
    if (!canStartTask()) {
      showToast(t('taskNotAvailable'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);

      await startTaskInDB();

      // Open link for VISIT tasks
      if (localTask.taskAction.name === 'VISIT' && localTask.taskData.link) {
        handleOpenLink();
      }
    } catch (error) {
      console.error('Error starting task:', error);
      showToast(t('taskStartError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle passport ready
  const handlePassportReady = () => {
    setIsPassportReady(true);
  };

  // Handle story task start
  const handleStoryStart = async () => {
    if (!canStartTask()) {
      showToast(t('taskNotAvailable'), 'error');
      throw new Error(t('taskNotAvailable'));
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);
      const response = await fetch('/api/tasks/update/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          taskId: localTask.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('failedToStartTask', { task: 'story' }));
      }

      const data = await response.json();
      const updatedTask = {
        ...localTask,
        taskStartTimestamp: new Date(data.taskStartTimestamp)
      };

      console.log('updatedTask', updatedTask);

      setLocalTask(updatedTask);
      onUpdate(updatedTask);
      showToast(t('taskStarted'), 'success');
    } catch (error) {
      console.error('Error starting story task:', error);
      showToast(error instanceof Error ? error.message : t('taskStartError'), 'error');
      throw error; // Re-throw to prevent story sharing from continuing
    } finally {
      setIsLoading(false);
    }
  };

  // Handle affiliate link sharing
  const handleShareAffiliateLink = async () => {
    if (!canStartTask()) {
      showToast(t('taskNotAvailable'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);

      // Share the affiliate link
      const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
      const userTelegramId = getUserTelegramId(userTelegramInitData);

      const inviteLink = botUsername
        ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/${process.env.NEXT_PUBLIC_APP_URL_SHORT_NAME}?startapp=kentId${userTelegramId || ""}`
        : "https://t.me/JOKQuestsBot";

      const shareText = `🃏 Hey! I just started playing JokInTheBox, a crazy Telegram game where you can win rewards by playing, sharing, and bluffing!\n\nCome try it with me — it's free, fast, and addictive 👀\n\n🎁 Claim your welcome bonus here 👉 ${inviteLink}`;

      try {
        const utils = initUtils();
        const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
        utils.openTelegramLink(fullUrl);

        await startTaskInDB();
      } catch (error) {
        console.error('Error opening Telegram link:', error);
        showToast(t('errorShare'), 'error');

        // Fallback: copy the invite link to clipboard
        navigator.clipboard
          .writeText(inviteLink)
          .then(() => showToast(t('linkCopied'), 'success'))
          .catch(() => showToast(t('failedToShareOrCopy'), 'error'));
      }
    } catch (error) {
      console.error('Error starting task:', error);
      showToast(t('taskStartError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle task check/completion
  const handleCheck = async () => {
    if (!canStartTask()) {
      showToast(t('taskNotAvailable'), 'error');
      return;
    }

    // Check if the task has a link and hasn't been viewed yet
    if (localTask.taskData.link && !hasViewedLink && localTask.taskAction.name !== 'VISIT') {
      handleOpenLink();
      return;
    }

    if (localTask.taskData.requireSubmission) {
      if (
        localTask.taskAction.name === 'VISIT' &&
        localTask.type === 'OFFICIAL' &&
        (localTask.title === 'JokInTheBox X Gate.IO' || localTask.title === 'JokInTheBox X Bitget')
      ) {
        // UID validation for specific tasks
        if (!submissionUrl || !validateUid(submissionUrl)) {
          showToast(t('invalidUid'), 'error');
          return;
        }
      } else if (localTask.taskAction.name !== 'REFERRAL' && localTask.taskAction.name !== 'VISIT') {
        // URL validation for other tasks that require submission
        if (!submissionUrl || !validateUrl(submissionUrl)) {
          showToast(t('invalidUrl'), 'error');
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);

      // For homescreen task, verify that app was actually added to homescreen
      if (isHomescreenTask) {
        const isAdded = await checkHomeScreenStatus();

        if (!isAdded) {
          showToast(t('pleaseAddToHomescreen'), 'error');
          setIsLoading(false);
          return;
        }
      }

      const basePayload = {
        initData: userTelegramInitData,
        taskId: localTask.id
      };

      const payload = localTask.taskData.requireSubmission ? { ...basePayload, submissionUrl } : basePayload;

      const endpoint = `/api/tasks/check/${localTask.taskAction.name.toLowerCase()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('checkError'));


      }

      const data = await response.json();

      if (data.success) {
        const updatedTask = {
          ...localTask,
          taskStartTimestamp: data.taskStartTimestamp,
          isCompleted: data.isCompleted,
          completedAt: data.completedAt
        };
        setLocalTask(updatedTask);
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
        if (
          localTask.taskAction.name === 'REFERRAL' &&
          data.currentReferrals !== undefined &&
          data.requiredReferrals !== undefined
        ) {
          const remaining = data.requiredReferrals - data.currentReferrals;
          showToast(
            t('referralsRemaining', {
              count: remaining,
              current: data.currentReferrals,
              required: data.requiredReferrals
            }),
            'error'
          );
        } else {
          if (localTask.title === 'Play one round of JOK Duel') {
            setTaskError(t('Play JOK Duel'));
          } else if (localTask.title === 'Find 1 Combo Upgrades') {
            setTaskError(t('Go to Upgrades'));
          }
          showToast(data.message || t('taskCheckFailed'), 'error');
        }
      }
    } catch (error) {
      console.error('Error checking task:', error);
      showToast(error instanceof Error ? error.message : t('taskCheckFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate points with bonuses
  const points = useMemo(() => {
    const basePoints = localTask.points || 0;
    const bonusPoints = calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);
    const multiplier = localTask.multiplier || (localTask.type === 'DAILY' ? 2 : 1.5);
    return formatNumber(basePoints + bonusPoints * multiplier);
  }, [localTask, bonusYieldPerHour, upgradeYieldPerHour]);

  const handleInputFocus = () => {
    if (isIOS) {
      setIsInputFocused(true);
    }
  };

  const handleInputBlur = () => {
    if (isIOS) {
      setIsInputFocused(false);
    }
  };

  const isFullscreen = !!localTask.taskData.backgroundImage;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'>
      <div
        className={`relative bg-[#272a2f] rounded-3xl p-6 w-full max-w-xl 
          ${isClosing ? 'animate-slide-down' : 'animate-slide-up'} 
          ${isFullscreen ? 'h-full safe-area-top safe-area-bottom' : ''}
          `}
        style={{
          backgroundImage: localTask.taskData.backgroundImage ? `url(${localTask.taskData.backgroundImage})` : 'none',
          backgroundSize: 'cover'
        }}
      >
        <div
          className={`${isFullscreen ? 'h-full flex flex-col justify-end ' : ''} ${isIOS && isInputFocused ? 'translate-y-[-200px] transition-transform' : 'translate-y-0'
            }`}
        >
          {!isFullscreen && (
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
            <div className='w-8'></div>
            <h2 className={`text-3xl text-white text-center font-bold ${isFullscreen ? 'backdrop-brightness-50' : ''}`}>
              {localTask.title}
            </h2>
            <div className='w-8'></div>
          </div>

          {!isFullscreen && (
            <Image
              priority={false}
              src={localTask.partnerImage?.includes('http') ? localTask.partnerImage : imageMap[localTask.partnerImage]}
              alt={localTask.title}
              width={80}
              height={80}
              className='mx-auto mb-4'
            />
          )}

          <p
            className={`text-gray-300 text-center mb-4 
          ${isFullscreen ? 'text-lg backdrop-brightness-50' : ''}`}
          >
            {localTask.description}
          </p>

          {/* Custom UI for story task */}
          {isStoryTask && (
            <div className='flex flex-col items-center mb-4'>
              <div className='flex justify-center items-center mb-4'>
                <Image
                  priority={false}
                  src={JOK_POINTS_UP}
                  alt='JOK Points'
                  width={24}
                  height={24}
                  className='w-6 h-6'
                />
                <span className='text-white font-bold text-2xl ml-1'>+{points}</span>
                {localTask.rewardStars && (
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
                    <span className='text-white'>{localTask.rewardStars}</span>
                  </>
                )}
              </div>

              <div className='w-full mb-4'>
                <StoryTaskSharer
                  buttonText={t('shareStory')}
                  className={`py-3 px-6 rounded-xl w-full ${isPassportReady ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 cursor-not-allowed'}`}
                  onPassportReady={handlePassportReady}
                  disabled={!isPassportReady || !canStartTask() || isLoading}
                  onShareStart={handleStoryStart}
                  onShare={handleCheck}
                />
              </div>
            </div>
          )}

          {localTask.taskData.requireSubmission && !isStoryTask && (
            <div className='flex justify-center mb-4'>
              <input
                type={localTask.taskAction.name === 'VISIT' ? 'number' : 'url'}
                className='w-full px-4 py-3 text-xl font-bold bg-gray-700 text-white rounded-2xl'
                placeholder={localTask.taskAction.name === 'VISIT' ? t('enterUID') : t('enterPostUrl')}
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          )}

          {!isStoryTask && (
            <>
              {isFullscreen ? (
                <div className='flex justify-center items-center gap-2'>
                  <div className='flex justify-center items-center'>
                    <Image
                      priority={false}
                      src={JOK_POINTS_UP}
                      alt='JOK Points'
                      width={24}
                      height={24}
                      className='w-6 h-6'
                    />
                    <span className='text-white font-bold text-2xl ml-1'>+{points}</span>

                    {localTask.rewardStars && (
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
                        <span className='text-white'>{localTask.rewardStars}</span>
                      </>
                    )}
                  </div>

                  <TaskButton
                    canStartTask={canStartTask}
                    isLoading={isLoading}
                    isFullscreen={isFullscreen}
                    localTask={localTask}
                    formattedTime={formattedTime}
                    isExpired={isExpired}
                    isHydrated={isHydrated}
                    hasViewedLink={hasViewedLink}
                    handleOpenLink={isAffiliateLinkTask ? handleShareAffiliateLink : handleOpenLink}
                    handleStart={isAffiliateLinkTask ? handleShareAffiliateLink : handleStart}
                    handleCheck={handleCheck}
                    isHomescreenTask={isHomescreenTask}
                    isAffiliateLinkTask={isAffiliateLinkTask}
                    isStoryTask={isStoryTask}
                    handleAddToHomescreen={handleAddToHomescreen}
                    handleShareAffiliateLink={handleShareAffiliateLink}
                    taskError={taskError}
                    clearTaskError={() => setTaskError(null)}
                    currentView={currentView}
                    setCurrentView={setCurrentView}

                    t={t}
                  />
                </div>
              ) : (
                <>
                  <div className='flex justify-center items-center mb-4'>
                    <Image
                      priority={false}
                      src={JOK_POINTS_UP}
                      alt='JOK Points'
                      width={24}
                      height={24}
                      className='w-6 h-6'
                    />
                    <span className='text-white font-bold text-2xl ml-1'>+{points}</span>
                    {localTask.rewardStars && (
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
                        <span className='text-white'>{localTask.rewardStars}</span>
                      </>
                    )}
                  </div>

                  <TaskButton
                    canStartTask={canStartTask}
                    isLoading={isLoading}
                    isFullscreen={isFullscreen}
                    localTask={localTask}
                    formattedTime={formattedTime}
                    isExpired={isExpired}
                    isHydrated={isHydrated}
                    hasViewedLink={hasViewedLink}
                    handleOpenLink={handleOpenLink}
                    handleStart={handleStart}
                    handleCheck={handleCheck}
                    isHomescreenTask={isHomescreenTask}
                    isAffiliateLinkTask={isAffiliateLinkTask}
                    isStoryTask={isStoryTask}
                    handleAddToHomescreen={handleAddToHomescreen}
                    handleShareAffiliateLink={handleShareAffiliateLink}
                    taskError={taskError}
                    clearTaskError={() => setTaskError(null)}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    t={t}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default TaskPopup;
