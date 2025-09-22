import React from 'react';
import Image from 'next/image';
import { flag, raffleBanner } from '@/images';
import WinnersList from './WinnersList';
import { useTranslations } from 'next-intl';

interface Winner {
  user: {
    name: string;
    telegramId: string;
    inventory?: {
      equippedAvatarName?: string;
    };
  };
  prize: {
    amount: string;
  };
}

interface PreviousRaffleProps {
  winners: Winner[];
}

export default function PreviousRaffle({ winners }: PreviousRaffleProps) {
  const t = useTranslations('Raffles');
  return (
    <div className='flex-1 flex flex-col'>
      {/* Banner */}
      <div className='relative h-24 mb-6'>
        <Image
          priority={false}
          src={raffleBanner}
          className='absolute top-0 left-0 w-full h-full z-30 object-cover'
          alt='Raffle Banner'
          width={0}
          height={0}
        />
        <div className='absolute -top-1 left-0 w-full h-full flex items-center justify-center'>
          <h2 className='text-xl font-bold'>{t('nextRafflesIn')}</h2>
        </div>
      </div>

      <div className='flex justify-center items-center gap-2 mb-5'>
        <Image priority={false} src={flag} alt='Flag' width={36} height={36} />
        <h2 className='font-medium ml-2'>{t('finished')}</h2>
      </div>

      {/* Winners Section */}
      <WinnersList winners={winners} />
    </div>
  );
}
