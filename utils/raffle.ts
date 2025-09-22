// utils/raffle.ts

import { RAFFLE_TICKETS } from './consts';

/**
 * Calculates the number of raffle tickets based on points balance
 * @param pointsBalance User's current points balance
 * @returns Number of tickets the user is eligible for
 */
export function calculateEligibleTickets(pointsBalance: number): number {
  if (!pointsBalance) return 0;

  // Find the appropriate ticket tier
  for (let i = RAFFLE_TICKETS.length - 1; i >= 0; i--) {
    if (pointsBalance >= RAFFLE_TICKETS[i].yield) {
      return RAFFLE_TICKETS[i].tickets;
    }
  }

  return 0;
}

/**
 * Calculates the next points target to get more tickets
 * @param currentPointsBalance User's current points balance
 * @returns The next points target or null if at max
 */
export function calculateNextPointsTarget(currentPointsBalance: number): number | null {
  if (!currentPointsBalance) return RAFFLE_TICKETS[0].yield;

  // Find the next ticket tier
  for (let i = 0; i < RAFFLE_TICKETS.length; i++) {
    if (currentPointsBalance < RAFFLE_TICKETS[i].yield) {
      return RAFFLE_TICKETS[i].yield;
    }
  }

  // Already at the highest tier
  return null;
}

/**
 * Formats the countdown time in a readable format
 * @param remainingTime Time remaining in milliseconds
 * @returns Formatted time string
 */
export function formatCountdown(remainingTime: number): string {
  if (remainingTime <= 0) return 'Ended';

  const totalSeconds = Math.floor(remainingTime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculates progress percentage for points balance
 * @param pointsBalance User's current points balance
 * @returns Progress percentage (0-100)
 */
export function calculatePointsProgress(pointsBalance: number): number {
  const maxPoints = RAFFLE_TICKETS[RAFFLE_TICKETS.length - 1].yield;
  return Math.min((pointsBalance / maxPoints) * 100, 100);
}
