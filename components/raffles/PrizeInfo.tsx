import React from 'react';
import Image from 'next/image';
import { tonLogo } from '@/images';
import { useTranslations } from 'next-intl';

interface PrizeInfoProps {
  bigReward: string;
  bigRewardPlayers: string | number;
  smallReward: string;
  smallRewardPlayers: string | number;
}

export default function PrizeInfo({ bigReward, bigRewardPlayers, smallReward, smallRewardPlayers }: PrizeInfoProps) {
  const t = useTranslations('Raffles');
  return (
    <div className='flex mb-6 bg-gradient-to-r from-[#282828] to-[#080808] rounded-full p-2 border-b border-[#666666]'>
      <div className='flex-1 flex flex-col items-center justify-center gap-2'>
        <div className='flex items-center'>
          <Image priority={false} src={tonLogo} alt='TON' width={24} height={24} />
          <span className='text-base ml-1'>{bigReward}</span>
        </div>
        <span className='text-base font-medium'>
          {bigRewardPlayers} {t('players')}
        </span>
      </div>
      <div className='flex-1 flex flex-col items-center justify-center gap-2'>
        <div className='flex items-center'>
          <Image priority={false} src={tonLogo} alt='TON' width={24} height={24} />
          <span className='text-base ml-1'>{smallReward}</span>
        </div>
        <span className='text-base font-medium'>
          {smallRewardPlayers} {t('players')}
        </span>
      </div>
    </div>
  );
}
