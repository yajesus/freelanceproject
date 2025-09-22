import React from 'react';
import Image from 'next/image';
import { triggerHapticFeedback } from '@/utils/ui';
import { raffleBanner, raffleTicket } from '@/images';
import { RAFFLE_TICKETS } from '@/utils/consts';
import CountdownTimer from './CountdownTimer';
import PrizeInfo from './PrizeInfo';
import YieldProgress from './YieldProgress';
import TicketTier from './TicketTier';
import { useTranslations } from 'next-intl';

interface ClaimedTier {
  tier: number;
  claimed: boolean;
}

interface TodayRaffleProps {
  endDate: Date | string | null;
  onCountdownComplete?: () => void;
  userTickets: number;
  yieldPerHour: number;
  pointsProgress: number;
  maxEligibleTier: number;
  currentTier: number;
  claimedTiers: ClaimedTier[];
  onClaimTicket: (tierIndex: number) => void;
  bigReward: string;
  bigRewardPlayers: string | number;
  smallReward: string;
  smallRewardPlayers: string | number;
  waitingForNewRaffle: boolean;
}

export default function TodayRaffle({
  endDate,
  onCountdownComplete,
  userTickets,
  yieldPerHour,
  pointsProgress,
  maxEligibleTier,
  currentTier,
  claimedTiers,
  onClaimTicket,
  bigReward,
  bigRewardPlayers,
  smallReward,
  smallRewardPlayers,
  waitingForNewRaffle
}: TodayRaffleProps) {
  const t = useTranslations('Raffles');

  const targetYield =
    currentTier === RAFFLE_TICKETS.length - 1
      ? RAFFLE_TICKETS[currentTier].yield
      : RAFFLE_TICKETS[currentTier + 1].yield;

  // Show waiting state when countdown is complete but new raffle isn't ready
  if (waitingForNewRaffle) {
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
            <h2 className='text-xl font-bold'>{t('raffleEnded')}</h2>
          </div>
        </div>

        {/* Waiting Message */}
        <div className='flex-1 flex flex-col items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-6'></div>
          <h3 className='text-xl font-bold mb-2'>{t('selectingWinners')}</h3>
          <p className='text-gray-400 text-center px-4'>{t('raffleEndedDescription')}</p>
        </div>
      </div>
    );
  }

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

      {/* Countdown */}
      <CountdownTimer endDate={endDate} onComplete={onCountdownComplete} />

      {/* Prize Info */}
      <PrizeInfo
        bigReward={bigReward}
        bigRewardPlayers={bigRewardPlayers}
        smallReward={smallReward}
        smallRewardPlayers={smallRewardPlayers}
      />

      {/* Points Progress */}
      <YieldProgress pointsProgress={pointsProgress} yieldPerHour={yieldPerHour} targetYield={targetYield} />

      {/* Tickets Counter */}
      <div className='flex items-center justify-center mb-4'>
        <div className='flex items-center bg-gray-900 rounded-full px-4 py-2'>
          <Image priority={false} src={raffleTicket} alt='Ticket' width={24} height={24} />
          <span className='ml-2'>
            {userTickets}/{RAFFLE_TICKETS.reduce((acc, tier) => acc + tier.tickets, 0)} {t('tickets')}
          </span>
        </div>
      </div>

      {/* Ticket Tiers - Show all tiers */}
      {RAFFLE_TICKETS.map((tier, index) => {
        const isClaimed = claimedTiers[index]?.claimed;
        const isEligible = index <= maxEligibleTier;

        return (
          <TicketTier
            key={index}
            ticketCount={tier.tickets}
            yieldRequirement={tier.yield}
            isEligible={isEligible}
            isClaimed={isClaimed}
            onClaim={() => {
              triggerHapticFeedback(window);
              onClaimTicket(index);
            }}
          />
        );
      })}
    </div>
  );
}
