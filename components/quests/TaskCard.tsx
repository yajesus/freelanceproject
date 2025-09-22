// components/quests/TaskCard.tsx

import { memo, useMemo } from 'react';
import Image from 'next/image';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Task } from '@/utils/types';
import { useGameStore } from '@/utils/game-mechanics';
import { calculateYieldPerHour } from '@/utils/calculations';
import { imageMap, JOK_POINTS_UP } from '@/images';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import Time from '@/icons/Time';
import { formatNumber } from '@/utils/ui';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';

dayjs.extend(utc);

interface TaskCardProps {
  task: Task;
  onSelect: (task: Task) => void;
  disabled?: boolean;
  gradient?: boolean;
}

const TaskCard = memo(function TaskCard({ task, onSelect, disabled = false, gradient = false }: TaskCardProps) {
  const { upgradeYieldPerHour, bonusYieldPerHour } = useGameStore();

  const initialTime = useMemo(() => {
    if (task.type === 'DAILY' && task.completedAt) {
      const now = dayjs.utc();
      const completedAt = dayjs.utc(task.completedAt);

      let resetTime = completedAt
        .utc()
        .hour(TASK_DAILY_RESET_TIME)
        .minute(0)
        .second(0)
        .millisecond(0);


      if (completedAt.isAfter(resetTime)) {
        resetTime = resetTime.add(1, 'day');
      }

      return Math.max(0, resetTime.diff(now));
    }
    return 0;
  }, [task.completedAt]);

  const { formattedTime, isExpired } = useCountdownTimer(initialTime);

  const isDisabled = useMemo(
    () => disabled || (task.type === 'DAILY' && task.completedAt && !isExpired),
    [disabled, task.type, task.completedAt, isExpired]
  );

  const points = useMemo(() => {
    const basePoints = task.points || 0;
    const multiplier =
      (task.multiplier || (task.type === 'DAILY' ? 2 : 1.5)) *
      calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);
    return formatNumber(basePoints + multiplier);
  }, [task.points, task.multiplier, task.type, bonusYieldPerHour, upgradeYieldPerHour]);

  const handleClick = () => {
    if (!isDisabled) onSelect(task);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-opacity-90 rounded-lg p-4 cursor-pointer ${gradient ? ' bg-gradient-button ' : ''} ${isDisabled ? 'opacity-50' : ''
        } `}
    >
      <div className='rounded-lg absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#272a2f] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>

      <div className='relative z-20 flex justify-between items-center'>
        <div className='flex items-center'>
          <Image
            priority={false}
            src={task.partnerImage?.includes('http') ? task.partnerImage : imageMap[task.partnerImage]}
            alt={task.title}
            width={40}
            height={40}
            className='rounded-lg mr-2'
          />
          <div className='flex flex-col'>
            <span className='font-medium'>{task.title}</span>
            <div className='flex items-center'>
              <Image
                priority={false}
                src={JOK_POINTS_UP}
                alt='JOK Points'
                width={40}
                height={40}
                className='w-6 h-6 mr-1'
              />
              <span className='text-white mr-1'>+{points}</span>

              {task.rewardStars && (
                <>
                  <span className='font-bold ml-2'>+</span>
                  <Image
                    priority={false}
                    src={'/star.png'}
                    alt='Star'
                    width={40}
                    height={40}
                    className='w-6 h-6 mr-1 ml-2'
                  />
                  <span className='text-white'>{task.rewardStars}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {task.type === 'DAILY' ? (
          task.completedAt &&
          !isExpired && (
            <span className='text-customGreen-700 gap-3 flex items-center'>
              <Time />
              {formattedTime}
            </span>
          )
        ) : task.isCompleted ? (
          <svg className='w-6 h-6 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        ) : task.taskStartTimestamp ? (
          <span className='text-customGreen-700'>
            <Time />
          </span>
        ) : null}
      </div>
    </div>
  );
});

export default TaskCard;
