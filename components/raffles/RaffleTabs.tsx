import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useTranslations } from 'next-intl';

interface RaffleTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function RaffleTabs({ activeTab, onTabChange }: RaffleTabsProps) {
  const t = useTranslations('Raffles');

  const tabs = [
    { id: 'today', label: t('today') },
    { id: 'previous', label: t('previous') }
  ];

  return (
    <div className='flex items-center gap-2 mb-6'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            triggerHapticFeedback(window);
            onTabChange(tab.id);
          }}
          className={`relative flex flex-1 items-center justify-center gap-2 px-[12px] py-[15px] rounded-[35px] cursor-pointer pointer text-white text-center ${
            activeTab === tab.id ? 'bg-gradient-button' : 'bg-[#151515]'
          }`}
        >
          <div
            className={`rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#1E1E1E] w-[calc(100%-3px)] h-[calc(100%-3px)] ${
              activeTab === tab.id ? ' ' : 'hidden'
            }`}
          ></div>
          <span className='relative z-40 text-nowrap'>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
