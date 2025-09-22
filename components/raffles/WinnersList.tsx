import React from 'react';
import Image from 'next/image';
import { character1, trophy, tonLogo, shopImageMap, passport } from '@/images';
import FriendPassportButton from '../FriendPassportButton';
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

interface WinnersListProps {
  winners: Winner[];
}

export default function WinnersList({ winners }: WinnersListProps) {
  const t = useTranslations('Raffles');

  return (
    <div className='bg-transparent border border-[#363636] rounded-3xl p-4 mb-6'>
      <div className='flex items-center justify-center mb-4'>
        <Image priority={false} src={trophy} alt='Trophy' width={24} height={24} />
        <h3 className='text-xl font-bold ml-2'>{t('winners')}</h3>
      </div>

      {winners.map((winner, index) => {
        const userImage = winner.user?.inventory?.equippedAvatarName;

        return (
          <div key={index} className='border border-[#363636] rounded-xl p-4 mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Image priority={false} src={trophy} alt='Trophy' width={34} height={34} />
              <Image
                priority={false}
                src={userImage ? shopImageMap[userImage] : character1}
                alt='User'
                width={48}
                height={48}
                className='rounded-full'
              />
            </div>
            <div className='flex flex-col flex-1 ml-3'>
              <h4 className='font-semibold text-base'>{winner.user.name || ' '}</h4>

              <div className='flex items-center'>
                <Image priority={false} src={tonLogo} alt='TON' width={20} height={20} />
                <span className='ml-1 text-sm font-normal'>{winner.prize.amount}</span>
              </div>
            </div>
            <FriendPassportButton userId={winner.user.telegramId} />
          </div>
        );
      })}
    </div>
  );
}
