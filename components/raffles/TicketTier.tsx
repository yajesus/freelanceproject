import React from 'react';
import Image from 'next/image';
import { formatNumber } from '@/utils/ui';
import { JOK_POINTS_UP, raffleTicket } from '@/images';
import { useTranslations } from 'next-intl';

interface TicketTierProps {
  ticketCount: number;
  yieldRequirement: number;
  isEligible: boolean;
  isClaimed: boolean;
  onClaim: () => void;
}

export default function TicketTier({ ticketCount, yieldRequirement, isEligible, isClaimed, onClaim }: TicketTierProps) {
  const t = useTranslations('Raffles');

  return (
    <div
      className={`bg-transparent border border-[#363636] rounded-3xl pr-2 py-3 mb-3 flex items-center justify-between gap-4 ${
        !isEligible ? 'opacity-50' : ''
      }`}
    >
      <div className='flex items-center' style={{ flex: 2 }}>
        <div className='relative flex-1 flex items-center justify-center'>
          <Image priority={false} src={raffleTicket} alt='Ticket' width={36} height={36} className='w-full' />
          <p className={`absolute right-1 bottom-0 ${isEligible ? 'text-white' : 'text-gray-400'}`}>+{ticketCount}</p>
        </div>
        <div className='ml-3'>
          <p className={`font-bold text-base ${isEligible ? 'text-white' : 'text-gray-400'}`}>{t('raffleTicket')}</p>
          <p className={`font-normal text-xs ${isEligible ? 'text-customGreen-700' : 'text-gray-400'}`}>
            {t('freeTicket')}
          </p>
          <div className='flex items-center mt-1'>
            <Image priority={false} src={JOK_POINTS_UP} alt='JOK Points' width={20} height={20} className='mr-1' />
            <p className={`text-xs ${isEligible ? 'text-white' : 'text-gray-400'}`}>
              {formatNumber(yieldRequirement)} {t('yieldPerHour')}
            </p>
          </div>
        </div>
      </div>
      <div className='flex items-center' style={{ flex: 1 }}>
        {isClaimed ? (
          <button
            disabled
            className='w-full bg-gray-700 text-gray-400 px-7 py-5 rounded-full border border-gray-600 text-center'
          >
            {t('claimed')}
          </button>
        ) : (
          <button
            onClick={onClaim}
            disabled={!isEligible}
            className={`w-full text-center px-7 py-5 rounded-full border ${
              isEligible
                ? 'bg-gradient-radial from-[#FF8011] from-40% to-[#FF9C12] text-white border-[#FFD073]'
                : 'bg-gray-700 text-gray-400 border-gray-600'
            }`}
          >
            {isEligible ? t('claim') : t('locked')}
          </button>
        )}
      </div>
    </div>
  );
}
