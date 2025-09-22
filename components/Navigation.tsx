// components/Navigation.tsx

'use client';

import Image, { StaticImageData } from 'next/image';
import { friends, MYJOK, quests, shop, upgrades } from '@/images';
import { FC, useState, useEffect, useCallback } from 'react';
import { IconProps } from '@/utils/types';
import { triggerHapticFeedback } from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuests } from '@/hooks/useQuests';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useGameStore } from '@/utils/game-mechanics';

type NavItem = {
  name: string;
  icon?: FC<IconProps> | null;
  image?: StaticImageData | null;
  view: string;
};

const navItems: NavItem[] = [
  { name: 'Quests', image: quests, view: 'quests' },
  { name: 'Upgrades', image: upgrades, view: 'upgrades' },
  { name: 'MyJOK', image: MYJOK, view: 'myjok' },
  { name: 'Friends', image: friends, view: 'friends' },
  { name: 'Shop', image: shop, view: 'shop' }
];

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}
const isWithin24Hours = (createdAt: Date, currentTime: Date) => {
  return currentTime.getTime() - createdAt.getTime() <= 24 * 60 * 60 * 1000;
};

export default function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('Navigation');
  const { tasks } = useQuests();
  const { upgrades } = useUpgrades();
  const { userUpgrades } = useGameStore();

  const [showFlashingDot, setShowFlashingDot] = useState(false);
  const [showUpgradesDot, setShowUpgradesDot] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const updateCurrentTime = useCallback(() => {
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    const timer = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(timer);
  }, [updateCurrentTime]);

  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setShowFlashingDot(false);
      return;
    }

    let dailyTasksCount = 0;
    let completedDailyCount = 0;

    for (const task of tasks) {
      if (task.type === 'DAILY') {
        dailyTasksCount++;
        if (task.isCompleted) {
          completedDailyCount++;
        }
      } else if (
        task.type === 'TEMPORARY' &&
        task.isCompleted &&
        isWithin24Hours(new Date(task.createdAt), currentTime)
      ) {
        completedDailyCount++;
      }
    }

    const dailyGoal = dailyTasksCount - 1;
    setShowFlashingDot(dailyGoal > 0 && completedDailyCount < dailyGoal);
  }, [tasks]);

  useEffect(() => {
    if (upgrades && userUpgrades) {
      // Check for special upgrades that haven't been acquired yet
      const specialUpgrades = upgrades.filter((upgrade) => upgrade.isSpecial);
      const hasUnacquiredSpecial = specialUpgrades.some((specialUpgrade) => {
        // Check if user has this upgrade
        const userUpgrade = userUpgrades.find((uu) => uu.upgradeId === specialUpgrade.id);
        return !userUpgrade || userUpgrade.level === 0;
      });

      setShowUpgradesDot(hasUnacquiredSpecial);
    }
  }, [upgrades, userUpgrades]);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('view');
        window.history.pushState({}, '', `?${newParams.toString()}`);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  if (typeof setCurrentView !== 'function') {
    console.error('setCurrentView is not a function. Navigation cannot be rendered properly.');
    return null; // or return some fallback UI
  }

  const isIntro = currentView === 'intro1';

  return (
    <div className='fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-40 px-5 '>
      {isIntro && (
        <div
          className='w-full h-full absolute top-0 left-0'
          style={{
            zIndex: 1000
          }}
        ></div>
      )}
      <div className='w-full relative rounded-[20px] bg-[#0000006B] border-l border-r border-[#998b82] backdrop-blur-[56.8px]'>
        <div className={'w-full flex items-center text-xs rounded-[20px]'}>
          {navItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => handleViewChange(item.view)}
              className={`flex-1 py-0.5 z-10 relative`}
            >
              <div
                className={`py-[1px] border-[#43433b] w-full flex justify-center ${index === 0 ? 'rounded-l-[66px] ' : ''
                  } ${index === navItems.length - 1 ? 'rounded-r-[66px] ' : ''}`}
              >
                <div
                  className={`flex flex-col items-center justify-center ${item.view === 'myjok' ? 'bg-gradient-navbar-myjok' : 'bg-[#1c1f24]'
                    } ${currentView === item.view ? ' bg-[#FFFFFF3D]' : ''} ${currentView === 'intro1' && (item.view === 'quests' || item.view === 'upgrades')
                      ? 'bg-[#FFFFFF3D] animate-bounce'
                      : ''
                    } w-12 h-12  m-1 p-2  rounded-full`}
                >
                  <div className={`${item.view === 'myjok' ? 'w-[80px] h-[80px] -top-5' : 'w-7 h-7'}  absolute `}>
                    {item.image && (
                      <Image
                        priority={false}
                        src={item.image}
                        alt={item.name}
                        fill
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    )}
                    {item.icon && <item.icon className='w-full h-full' />}
                  </div>
                </div>
              </div>
              <p className='mt-1'>{t(`${item.name}`)}</p>
              {item.view === 'quests' && showFlashingDot && (
                <div className='absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full' />
              )}
              {item.view === 'upgrades' && showUpgradesDot && (
                <div className='absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full' />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
