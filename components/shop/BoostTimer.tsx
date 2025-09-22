import React, { useEffect, useMemo, useState } from 'react';

const useCountdownTimer = (endTime: Date | null) => {
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      return difference > 0 ? difference : 0;
    };

    setRemainingTime(calculateTimeLeft());

    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft();
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const formattedTime = useMemo(() => {
    if (remainingTime <= 0) return '00:00:00';

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingTime]);

  return {
    remainingTime,
    formattedTime,
    isExpired: remainingTime <= 0
  };
};

interface BoostTimerProps {
  endTime: Date | null;
}

const BoostTimer: React.FC<BoostTimerProps> = ({ endTime }) => {
  const { formattedTime, isExpired } = useCountdownTimer(endTime);

  if (!endTime || isExpired) {
    return null;
  }

  return <p className='text-xs font-medium text-[#57D63B]'>{formattedTime}</p>;
};

export default BoostTimer;
