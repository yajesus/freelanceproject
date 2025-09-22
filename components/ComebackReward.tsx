// components/ComebackReward.tsx

import React, { useEffect, memo, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { triggerHapticFeedback } from '@/utils/ui';
import ComebackRewardPopup from './popups/ComebackRewardPopup';

interface ComebackRewardProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const ComebackReward = ({ currentView, setCurrentView }: ComebackRewardProps) => {
  const { userTelegramInitData, totalStars, setTotalStars, incrementPoints } = useGameStore();

  const [showPopup, setShowPopup] = useState(false);
  const [rewardType, setRewardType] = useState('');
  const [rewardAmount, setRewardAmount] = useState(0);
  const [reminderType, setReminderType] = useState('');
  const [hasShownStartupPopup, setHasShownStartupPopup] = useState(false);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    }
  };

  const handleClose = () => {
    try {
      triggerHapticFeedback(window);
      setShowPopup(false);
    } catch (error) {
      console.error('Error occurred while closing:', error);
    }
  };

  const updatePoints = async () => {
    try {
      const response = await fetch('/api/user/comeback-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update points');
      }

      const result = await response.json();

      if (result.success) {
        if (result.rewardType === 'STARS' && result.rewardAmount > 0) {
          setTotalStars(totalStars + result.rewardAmount);
        } else if (result.rewardType === 'POINTS' && result.rewardAmount > 0) {
          incrementPoints(result.rewardAmount);
        }

        setRewardType(result.rewardType);
        setRewardAmount(result.rewardAmount);
        setReminderType(result.reminderType);

        setShowPopup(true);
      } else {
        console.warn('Reward update was not successful:', result.message);
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };

  // Handle startup points
  useEffect(() => {
    if (!hasShownStartupPopup) {
      updatePoints();
      setHasShownStartupPopup(true);
    }
  }, [hasShownStartupPopup]);

  return (
    <ComebackRewardPopup
      data={{
        rewardType,
        rewardAmount,
        reminderType
      }}
      isOpen={showPopup}
      onClose={handleClose}
      handleViewChange={handleViewChange}
    />
  );
};

export default memo(ComebackReward);
