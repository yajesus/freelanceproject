// hooks/useCountdownTimer.ts

import { useState, useEffect, useCallback } from 'react';

export const useCountdownTimer = (initialTimeMs: number) => {
  const [remainingTime, setRemainingTime] = useState(initialTimeMs);

  // Reset remaining time when initialTimeMs changes
  useEffect(() => {
    setRemainingTime(initialTimeMs);
  }, [initialTimeMs]);

  useEffect(() => {
    if (remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - 1000;
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  const formatTime = useCallback((ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return [hours, minutes, seconds].map((num) => String(num).padStart(2, '0')).join(':');
  }, []);

  return {
    remainingTime,
    formattedTime: formatTime(remainingTime),
    isExpired: remainingTime <= 0
  };
};
