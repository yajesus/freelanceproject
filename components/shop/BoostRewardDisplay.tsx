import React, { useEffect, useState } from 'react';

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

  return {
    remainingTime,
    isExpired: remainingTime <= 0
  };
};

interface BoostRewardDisplayProps {
  endTime: Date | null;
  value: number;
}

const BoostRewardDisplay: React.FC<BoostRewardDisplayProps> = ({ endTime, value }) => {
  const { isExpired } = useCountdownTimer(endTime);

  if (!endTime || isExpired) {
    return null;
  }

  return <span className='text-[10px] font-medium text-[#57D63B]'>+{value}%</span>;
};

export default BoostRewardDisplay;
