import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Task } from '@/utils/types';
import TaskCard from './TaskCard';
import SocialMediaTasks from './SocialMediaTasks';
import CompletedTasks from './CompletedTasks';
import { useTranslations } from 'next-intl';
import ProgressBar from '@/components/ProgressBar';
import RewardPopup from '@/components/RewardPopup';
import { FaShieldAlt } from 'react-icons/fa';
import { FaShield } from 'react-icons/fa6';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { FaQuestionCircle } from 'react-icons/fa';
import { formatNumber } from '@/utils/ui';
import Lottie from 'lottie-react';
import flameAnimation from '@/public/animations/flame.json';
import { JOK_POINTS } from '@/images';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

interface TaskListProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  completedTasks: Task[];
  handleOpenStarPopup: () => void;
  shieldStatus: boolean;
  setShieldStatus: (shieldStatus: boolean) => void;
}

const isWithin24Hours = (createdAt: Date, currentTime: Date) => {
  return currentTime.getTime() - createdAt.getTime() <= 24 * 60 * 60 * 1000;
};

const TaskList = ({
  tasks,
  onTaskSelect,
  completedTasks,
  handleOpenStarPopup,
  shieldStatus,
  setShieldStatus
}: TaskListProps) => {
  const t = useTranslations('Quests');
  const {
    totalStars,
    setTotalStars,
    userTelegramName,
    dailyQuestStreakCount,
    lastDailyQuestCompletedDate,
    lastStreakClaim,
    isSheildActive,
    setDailyQuestStreakCount,
    setLastDailyQuestCompletedDate,
    setLastStreakClaim,
    setIsSheildActive,
    userTelegramInitData,
    upgradeYieldPerHour,
    setPointsBalance,
    setPoints,
    points
  } = useGameStore();

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [shieldExpiryTime, setShieldExpiryTime] = useState<Date | null>(null);
  const dailyGoal = 5;


  useEffect(() => {
    if (!lastDailyQuestCompletedDate) return;
    const lastDate = dayjs(lastDailyQuestCompletedDate);
    const now = dayjs();
    const daysSinceLastCompletion = now.diff(lastDate, 'day');
    if (daysSinceLastCompletion > 1) {
      setStreakCount(0);
    } else {
      setStreakCount(dailyQuestStreakCount || 0);
    }
  }, [lastDailyQuestCompletedDate, dailyQuestStreakCount])


  const updateCurrentTime = useCallback(() => {
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    const timer = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(timer);
  }, [updateCurrentTime]);

  const filteredTasks = useMemo(() => {
    const officialTasks = [];
    const tempAndDailyTasks = [];
    const socialTasks = [];
    let completedDailyCount = 0;

    for (const task of tasks) {
      const taskCreatedAt = new Date(task.createdAt);
      const isWithin24HoursRange = task.type === 'TEMPORARY' ? isWithin24Hours(taskCreatedAt, currentTime) : false;

      switch (task.type) {
        case 'OFFICIAL':
          if (!task.isCompleted) {
            officialTasks.push(task);
          }
          break;

        case 'DAILY':
          tempAndDailyTasks.push(task);
          if (task.isCompleted) {
            completedDailyCount++;
          }
          break;

        case 'TEMPORARY':
          if (isWithin24HoursRange) {
            tempAndDailyTasks.push(task);
            if (task.isCompleted) {
              completedDailyCount++;
            }
          } else if (!task.isCompleted) {
            socialTasks.push(task);
          }
          break;
      }
    }

    return {
      officialTasks,
      tempAndDailyTasks,
      completedDailyCount,
      socialTasks
    };
  }, [tasks, currentTime]);

  useEffect(() => {
    if (!lastDailyQuestCompletedDate) return;

    const lastDate = dayjs(lastDailyQuestCompletedDate);
    const now = dayjs();
    const diffInHours = now.diff(lastDate, 'hour');

    // if (diffInHours <= 24 && completedDailyCount <= 4) {
    if (isSheildActive && diffInHours <= 24) {
      setShieldStatus(true);
      const expiry = lastDate.add(24, 'hour');
      setShieldExpiryTime(expiry.toDate());
    } else {
      setShieldStatus(false);
      setShieldExpiryTime(null);
    }
  }, [lastDailyQuestCompletedDate, currentTime]);

  useEffect(() => {
    if (!shieldExpiryTime || !shieldStatus) return;

    const timer = setInterval(() => {
      const now = dayjs();
      if (now.isAfter(dayjs(shieldExpiryTime))) {
        setShieldStatus(false);
        setShieldExpiryTime(null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [shieldExpiryTime, shieldStatus]);

  // const formatRemainingTime = (expiry: Date) => {
  //   const now = dayjs();
  //   const expiryTime = dayjs(expiry);
  //   const diffHours = expiryTime.diff(now, 'hour');
  //   const diffMinutes = expiryTime.diff(now, 'minute') % 60;

  //   return `${diffHours}h ${diffMinutes}m`;
  // };

  const handleTaskSelect = useCallback(
    (task: Task) => {
      onTaskSelect(task);
    },
    [onTaskSelect]
  );

  const { officialTasks, tempAndDailyTasks, socialTasks, completedDailyCount } = filteredTasks;

  const sendReward = async () => {
    try {
      const res = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData })
      });

      if (!res.ok) throw new Error('Failed to claim daily quest reward');

      const data = await res.json();
      setDailyQuestStreakCount(data.dailyQuestStreakCount);
      if (setLastDailyQuestCompletedDate) setLastDailyQuestCompletedDate(data.lastDailyQuestCompletedDate);
      if (setLastStreakClaim) setLastStreakClaim(data.lastStreakClaim);
      if (setIsSheildActive) setIsSheildActive(data.isSheildActive);
      setStreakCount(data.dailyQuestStreakCount);
      setTotalStars(data.totalStars);
      setPointsBalance(data.points);
      setPoints(data.points);
      setShowRewardPopup(false);
    } catch (error) {
      console.error('Error sending reward:', error);
    }
  };

  useEffect(() => {
    const now = dayjs().utc();
    const questDayStart = now.hour() < 10 ? now.subtract(1, 'day').startOf('day').add(10, 'hour') : now.startOf('day').add(10, 'hour');

    const lastCompleted = lastStreakClaim ? dayjs(lastStreakClaim).utc() : null;
    const lastCompletedQuestDayStart = lastCompleted && (lastCompleted.hour() < 10
      ? lastCompleted.subtract(1, 'day').startOf('day').add(10, 'hour')
      : lastCompleted.startOf('day').add(10, 'hour'));

    const shouldTriggerReward =
      completedDailyCount == dailyGoal &&
      (!lastCompletedQuestDayStart || !lastCompletedQuestDayStart.isSame(questDayStart));

    if (shouldTriggerReward) {
      setShowRewardPopup(true);
    }
  }, [completedDailyCount, dailyGoal, lastStreakClaim, userTelegramName])

  return (
    <>
      <div>
        {showRewardPopup && (
          <>
            <RewardPopup
              title={t('congrats')}
              message={t('dailyBonusUnlocked')}
              onClose={() => setShowRewardPopup(false)}
              sendReward={sendReward}
            />
          </>
        )}

        <section>
          <div className="mb-4 p-4 border rounded-lg border-green-500">
            <div className="font-semibold mb-2">🎁 {t('dailyCompletionBonus')}</div>
            <div className="text-sm">
              → {Math.floor(upgradeYieldPerHour * 120 / 2) > 50000 ? `+${formatNumber(Math.floor(upgradeYieldPerHour * 120 / 2))}` : "+50k"}
              <Image
                priority={false}
                alt="JOK Points"
                src={JOK_POINTS}
                width={30}
                className='ml-1 inline-block'
              />  <br />
              → +25
              <Image
                priority={false}
                src="/star.png"
                alt="Star"
                width={30}
                height={30}
                className="w-4 h-4 mr-1 ml-1 inline-block"
              />

            </div>
            <div className="mt-2 text-sm">
              {t('completeAllDailyQuests')} {completedDailyCount} / {dailyGoal}
            </div>
            <ProgressBar progress={completedDailyCount} total={dailyGoal} />
          </div>
        </section>

        <section>
          <div className='streak-section flex  flex-col justify-between items-center'>
            <div className='flex items-center space-x-2'>
              <div className={`streak-icon ${streakCount > 0 ? 'active' : ''}`}>
                <div className='flex items-center'>
                  <div className='w-8 h-8'>
                    <Lottie animationData={flameAnimation} loop autoplay />
                  </div>
                  <span>{t('streakNbonus', { streak: streakCount, bonus: (1 + streakCount * 0.1).toFixed(1) })}</span>
                </div>
              </div>

              <div className='relative inline-block'>
                <FaQuestionCircle className='w-4 h-4 text-gray-400 cursor-pointer peer' />
                <div className='absolute z-10 w-48 p-2 text-sm text-white bg-black rounded-md opacity-0 peer-hover:opacity-100 transition-opacity left-1/2 -translate-x-1/2 mt-2 pointer-events-none'>
                  {t('streakNote')}
                </div>
              </div>
            </div>

            <div className='shield-section'>
              <button
                onClick={() => {
                  if (!shieldStatus) {
                    handleOpenStarPopup();
                  }
                }}
                className='shield-button flex items-center space-x-2 p-2 rounded-lg bg-[#272a2f] text-white mt-2'
              >
                {shieldStatus ? (
                  <>
                    <FaShieldAlt className='h-6 w-6 mr-2 text-green-500' />
                    {/* <span>
                      {shieldExpiryTime ? (
                        `Expires in ${formatRemainingTime(shieldExpiryTime)}`
                      ) : (
                        'Activated'
                      )}
                    </span> */}
                    <span>Activated</span>
                  </>
                ) : (
                  <>
                    <FaShield className='h-6 w-6 mr-2 text-red-500' />
                    <span>
                      {t('activate')} (170
                      <Image
                        priority={false}
                        src='/star.png'
                        alt='Star'
                        width={40}
                        height={40}
                        className='w-6 h-6  mx-1 inline-block'
                      />
                      )
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
        {tempAndDailyTasks.length > 0 && (
          <section>
            <h2 className='text-base mt-8 mb-4'>{t('daily')}</h2>
            <div className='space-y-2'>
              {tempAndDailyTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSelect={handleTaskSelect}
                  gradient={task.type === 'TEMPORARY' || task.title === 'TON Daily Check-In'}
                />
              ))}
            </div>
          </section>
        )}
        {officialTasks.length > 0 && (
          <section>
            <h2 className='text-base mt-8 mb-4'>{t('official')}</h2>
            <div className='space-y-2'>
              {officialTasks.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={handleTaskSelect} />
              ))}
            </div>
          </section>
        )}


        {/* Social Tasks */}
        <SocialMediaTasks tasks={socialTasks} onTaskSelect={handleTaskSelect} />

        {/* Completed Tasks */}
        <CompletedTasks tasks={completedTasks} />
      </div>
    </>
  );
};

export default memo(TaskList);
