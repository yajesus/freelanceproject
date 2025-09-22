// components/UpgradeYieldPerHour.tsx

import React, { useEffect, memo, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { triggerHapticFeedback } from '@/utils/ui';
import OfflinePointsPopup from './popups/OfflinePointsPopup';

interface YieldBreakdown {
  actualOfflineHours: number;
  maxAllowedHours: number;
  bonusHours: number;
  usedHours: number;
  hasBonusTime: boolean;
}

interface AutoIncrementProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const AutoIncrementYieldPerHour = ({ currentView, setCurrentView }: AutoIncrementProps) => {
  const { userTelegramInitData, incrementPoints, updateLastYieldTimestamp } = useGameStore();

  const [showPopup, setShowPopup] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [effectiveDuration, setEffectiveDuration] = useState(0);
  const [yieldBreakdown, setYieldBreakdown] = useState<YieldBreakdown | null>(null);
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
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowPopup(false);
    }, 280);
  };

  const updatePoints = async (requestType: 'startup' | 'periodic') => {
    try {
      const response = await fetch('/api/upgrade/skill/yield-per-hour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          requestType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update points');
      }

      const result = await response.json();
      updateLastYieldTimestamp(result.lastTimestamp);
      if (result.earnedPoints > 0) {
        incrementPoints(result.earnedPoints);
      }

      if (requestType === 'startup' && result.earnedPoints > 0) {
        setEarnedPoints(result.earnedPoints);
        setEffectiveDuration(result.effectiveDuration);
        setYieldBreakdown(result.yieldBreakdown);
        setShowPopup(true);
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };

  // Handle startup points
  useEffect(() => {
    if (!hasShownStartupPopup) {
      updatePoints('startup');
      setHasShownStartupPopup(true);
    }
  }, [hasShownStartupPopup]);

  // Handle periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      updatePoints('periodic');
    }, 120000); // Run every 2 minutes

    return () => clearInterval(interval);
  }, []);

  if (!showPopup) {
    return null;
  }

  return (
    <OfflinePointsPopup
      earnedPoints={earnedPoints}
      effectiveDuration={effectiveDuration}
      yieldBreakdown={yieldBreakdown}
      onClose={handleClose}
      handleViewChange={handleViewChange}
      isClosing={isClosing}
      setIsClosing={setIsClosing}
    />
  );
};

export default memo(AutoIncrementYieldPerHour);
