import React, { useEffect, useRef } from 'react';

interface CountdownTimerProps {
  endDate: Date | string | null;
  onComplete?: () => void;
}

export default function CountdownTimer({ endDate, onComplete }: CountdownTimerProps) {
  const daysRef = useRef<HTMLSpanElement>(null);
  const hoursRef = useRef<HTMLSpanElement>(null);
  const minutesRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef<boolean>(false);

  const updateDisplay = (days: number, hours: number, minutes: number, seconds: number) => {
    if (daysRef.current) daysRef.current.textContent = days.toString();
    if (hoursRef.current) hoursRef.current.textContent = hours.toString().padStart(2, '0');
    if (minutesRef.current) minutesRef.current.textContent = minutes.toString().padStart(2, '0');
    if (secondsRef.current) secondsRef.current.textContent = seconds.toString().padStart(2, '0');
  };

  const updateCountdown = (timeRemaining: number) => {
    if (timeRemaining <= 0) {
      updateDisplay(0, 0, 0, 0);
      if (onComplete && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
      return;
    }

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    updateDisplay(days, hours, minutes, seconds);
  };

  useEffect(() => {
    if (!endDate) return;

    // Reset completion flag when endDate changes
    hasCompletedRef.current = false;

    // Convert endDate to Date object if it's a string
    const targetDate = typeof endDate === 'string' ? new Date(endDate) : endDate;

    // Check if the date is valid
    if (isNaN(targetDate.getTime())) {
      console.error('Invalid endDate provided to CountdownTimer:', endDate);
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial update
    const timeRemaining = targetDate.getTime() - Date.now();
    updateCountdown(timeRemaining);

    // Set up interval
    intervalRef.current = setInterval(() => {
      const timeRemaining = targetDate.getTime() - Date.now();
      updateCountdown(timeRemaining);

      if (timeRemaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endDate, onComplete]);

  const timeItems = [
    { ref: daysRef, label: 'DAYS' },
    { ref: hoursRef, label: 'HOURS' },
    { ref: minutesRef, label: 'MINS' },
    { ref: secondsRef, label: 'SEC' }
  ];

  return (
    <div className='grid grid-cols-4 gap-2 mb-6'>
      {timeItems.map((item, index) => (
        <div
          key={index}
          className='w-20 h-20 rounded-full bg-[#181818] border-b border-[#BADF15] flex items-center justify-center'
        >
          <div className='flex flex-col items-center justify-center'>
            <span ref={item.ref} className='text-xl font-bold'>
              00
            </span>
            <span className='text-sm mt-1'>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
