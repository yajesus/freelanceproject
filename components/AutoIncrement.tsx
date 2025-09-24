// components/AutoIncrement.tsx

'use client';

import { useGameStore } from '@/utils/game-mechanics';
import { useCallback, useEffect, useRef } from 'react';

export function AutoIncrement() {
  const { lastClickTimestamp, profitPerHour, pointsPerClick, incrementPoints } = useGameStore();

  // Use a ref to store the latest values without causing re-renders
  const stateRef = useRef({ profitPerHour, pointsPerClick, lastClickTimestamp });

  // Update the ref when these values change
  useEffect(() => {
    stateRef.current = { profitPerHour, pointsPerClick, lastClickTimestamp };
  }, [profitPerHour, pointsPerClick, lastClickTimestamp]);

  const autoIncrement = useCallback(() => {
    const { profitPerHour } = stateRef.current;
    const pointsPerSecond = profitPerHour / 3600;

    incrementPoints(pointsPerSecond);
  }, [incrementPoints]);

  useEffect(() => {
    const interval = setInterval(autoIncrement, 1000);
    return () => clearInterval(interval);
  }, [autoIncrement]);

  return null;
}
