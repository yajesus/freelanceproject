import React from 'react';
import Image from 'next/image';
import { formatNumber } from '@/utils/ui';
import { JOK_POINTS_UP, raffleTicket } from '@/images';
import { useTranslations } from 'next-intl';

interface YieldProgressProps {
  pointsProgress: number;
  yieldPerHour: number;
  targetYield: number;
}

export default function YieldProgress({ pointsProgress, yieldPerHour, targetYield }: YieldProgressProps) {
  const t = useTranslations('Raffles');

  return (
    <div className='bg-transparent rounded-2xl p-4 mb-6'>
      <h3 className='text-center text-sm font-bold mb-3 capitalize'>{t('boostYieldPerHour')}</h3>
      <div className='relative bg-red-300 rounded-full'>
        <div className='relative h-6 bg-gray-800 rounded-full overflow-hidden'>
          <div
            className='absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF9011] via-[#7FC664] to-[#BEE110'
            style={{ width: `${pointsProgress}%` }}
          ></div>
        </div>
        <div className='w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-t from-[#2A2931] to-[#0A0A0C] border-b border-[#898891] absolute -top-4 -left-4'>
          <Image priority={false} src={JOK_POINTS_UP} alt='Ticket' width={36} height={36} />
        </div>
        {/* Ticket images */}
        <div className='absolute -top-4 -right-4 rotate-[30deg]'>
          <Image priority={false} src={raffleTicket} alt='Ticket' width={36} height={36} className='w-16' />
        </div>
        <div className='absolute -top-4 -right-4 -rotate-45'>
          <Image priority={false} src={raffleTicket} alt='Ticket' width={36} height={36} className='w-16' />
        </div>
      </div>
      <div className='flex justify-center items-center mt-4'>
        <span className='text-sm'>
          {formatNumber(yieldPerHour)} /{formatNumber(targetYield)}
        </span>
      </div>
    </div>
  );
}
