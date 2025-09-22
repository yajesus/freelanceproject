// components/quests/CompletedTaskCard.tsx

import { memo, useMemo } from 'react';
import Image from 'next/image';
import { Task } from '@/utils/types';
import { useGameStore } from '@/utils/game-mechanics';
import { calculateYieldPerHour } from '@/utils/calculations';
import { imageMap, JOK_POINTS_UP } from '@/images';
import { formatNumber } from '@/utils/ui';

interface CompletedTaskCardProps {
  task: Task;
}

const CompletedTaskCard = memo(function CompletedTaskCard({ task }: CompletedTaskCardProps) {
  const { upgradeYieldPerHour, bonusYieldPerHour } = useGameStore();

  const points = useMemo(() => {
    const basePoints = task.points || 0;
    const multiplier =
      (task.multiplier || (task.type === 'DAILY' ? 2 : 1.5)) *
      calculateYieldPerHour(bonusYieldPerHour, upgradeYieldPerHour);
    return formatNumber(basePoints + multiplier);
  }, [task.points, task.multiplier, task.type, bonusYieldPerHour, upgradeYieldPerHour]);

  return (
    <>
      <div className='flex justify-between items-center bg-[#272a2f] bg-opacity-90 rounded-lg p-4 cursor-pointer  opacity-50'>
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
            </div>
          </div>
        </div>
        <svg className='w-6 h-6 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
        </svg>
      </div>
    </>
  );
});

export default CompletedTaskCard;
