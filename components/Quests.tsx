// components/Quests.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { JOK_POINTS, pageBackground } from '@/images';
import TaskPopup from './popups/TaskPopup';
import { Task } from '@/utils/types';
import { useTranslations } from 'next-intl';
import { getTaskSearchString } from '@/utils/taskUtils';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import TaskList from './quests/TaskList';
import TONTaskPopup from './popups/TONTaskPopup';
import { useQuests } from '@/hooks/useQuests';
import StarSelectionPopup from './popups/StarSelectionPopup';
import { useToast } from '@/contexts/ToastContext';
import { useGameStore } from '@/utils/game-mechanics';

interface QuestsProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Quests = ({ currentView, setCurrentView }: QuestsProps) => {
  const showToast = useToast();
  const t = useTranslations('Quests');
  const searchParams = useSearchParams();
  const { tasks, completedTasks, isLoading, fetchTasks, handleTaskUpdate } = useQuests();
  const { totalStars, setTotalStars, setLastDailyQuestCompletedDate, setIsSheildActive, userTelegramInitData, setDailyQuestStreakCount } = useGameStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showStarPopup, setShowStarPopup] = useState<boolean>(false);
  const [shieldStatus, setShieldStatus] = useState<boolean>(false);

  const handleCloseStarPopup = useCallback(() => {
    setShowStarPopup(false);
  }, []);

  const handleOpenStarPopup = useCallback(() => {
    setShowStarPopup(true);
  }, []);

  const handleViewChange = useCallback((view: string) => {
    triggerHapticFeedback(window);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('task');
    newParams.delete('view', 'quests');
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setCurrentView(view);
  }, []);

  // Set up back button and revalidate tasks when component mounts
  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();

    if (tasks?.length === 0) {
      fetchTasks();
    }
  }, []);

  // Handle task selection based on URL params
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam && tasks?.length) {
      const searchString = getTaskSearchString(taskParam);
      if (searchString) {
        const task = tasks?.find((t) => t.title.toLowerCase().includes(searchString.toLowerCase()));
        if (task) {
          handleTaskSelection(task);
        }
      }
    }
  }, [searchParams, tasks]);

  const handleClosePopup = () => {
    setSelectedTask(null);
    // Remove the task parameter from URL
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('task');
    window.history.pushState({}, '', `?${newParams.toString()}`);
  };

  const handleTaskSelection = useCallback((task: Task) => {
    triggerHapticFeedback(window);
    // Check if the task is already completed and within cooldown period
    if (task.type === 'DAILY' && task.completedAt) {
      const completedAt = new Date(task.completedAt);
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

      if (resetTime <= completedAt) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      }

      if (now < resetTime) {
        return; // Don't allow selection if task is in cooldown
      }
    }

    setSelectedTask(task);
  }, []);

  const activateShield = async () => {
    try {
      const requiredStars = 170;

      if (totalStars < requiredStars) {
        showToast(t('notEnoughStars'), 'error');
        return;
      }

      const response = await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData
        })
      });

      if (!response.ok) throw new Error(t('failedToActivateShield'));

      const data = await response.json();
      if (setLastDailyQuestCompletedDate) setLastDailyQuestCompletedDate(data.lastDailyQuestCompletedDate);
      if (setIsSheildActive) setIsSheildActive(data.isSheildActive);
      if (setDailyQuestStreakCount) setDailyQuestStreakCount(data.dailyQuestStreakCount);
      setTotalStars(data.totalStars);

      setShieldStatus(true);
      showToast(t('shieldActivated'), 'success');
    } catch (err) {
      console.error('Shield activation failed:', err);
      showToast(t('failedToActivateShield'), 'error');
    }
  };

  const processPurchase = async (starsToUse: number = 0) => {
    try {
      if (totalStars >= starsToUse) {
        activateShield();
        return;
      }
      const response = await fetch('/api/user/star-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          topupAmount: starsToUse
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t('topUpError'));

      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.ready();
      WebApp.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          setTotalStars(totalStars + starsToUse);
          activateShield();
        } else {
          showToast(t('paymentNotCompleted'), 'error');
        }
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Purchase failed', 'error');
    }
  };

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
          <div className='flex-grow mt-[2px] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='px-4 pt-1 pb-24'>
              <div className='relative mt-4 mb-32'>
                <div className='flex justify-center mb-4'>
                  <Image
                    priority={false}
                    src={JOK_POINTS}
                    alt='JOK Points'
                    width={100}
                    height={100}
                    className='w-24 h-24 mx-auto'
                  />
                </div>
                <h1 className='text-2xl text-center mb-4'>{t('title')}</h1>

                {isLoading ? (
                  <div className='text-center text-gray-400 mt-8 mb-4'>{t('loading')}</div>
                ) : (
                  <TaskList
                    tasks={tasks || []}
                    onTaskSelect={handleTaskSelection}
                    completedTasks={completedTasks || []}
                    handleOpenStarPopup={handleOpenStarPopup}
                    shieldStatus={shieldStatus}
                    setShieldStatus={setShieldStatus}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedTask &&
        (selectedTask.type === 'DAILY' && selectedTask.title === 'TON Daily Check-In' ? (
          <TONTaskPopup
            task={selectedTask}
            onClose={handleClosePopup}
            onUpdate={handleTaskUpdate}
            handleViewChange={handleViewChange}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        ) : (
          <TaskPopup
            task={selectedTask}
            onClose={handleClosePopup}
            onUpdate={handleTaskUpdate}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        ))}

      {showStarPopup && (
        <StarSelectionPopup
          onClose={handleCloseStarPopup}
          onConfirm={processPurchase}
          selectedItem={undefined}
          mode={'spend'}
          maxStars={170}
          title={'spending'}
          onBack={() => handleCloseStarPopup}
        />
      )}
    </div>
  );
};

export default Quests;
