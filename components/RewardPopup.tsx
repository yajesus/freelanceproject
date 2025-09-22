import React, { useState } from 'react';
import LottieOverlay from '@/components/LottieOverlay';
import Lottie from 'lottie-react';
import questAnimation from '@/public/animations/quest.json';
import { useTranslations } from 'next-intl';

interface RewardPopupProps {
  title: string;
  message: string;
  onClose: () => void;
  sendReward: () => void;
}

const RewardPopup = ({ title, message, onClose, sendReward }: RewardPopupProps) => {
  const t = useTranslations('RewardPopup');
  const [showAnimationPopup, setShowAnimationPopup] = useState(false);
  return (
    <>
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-white rounded-2xl p-6 w-96 text-center shadow-xl relative'>
          <h2 className='text-xl font-bold text-customGreen-700 mb-2'>{t('title')}</h2>

          <div className='relative w-full h-[200px] mb-2'>
            <Lottie
              animationData={questAnimation}
              loop
              autoplay
              style={{ width: 258, height: 258, margin: '0 auto' }}
            />
          </div>
          <h3 className='text-xl font-bold mt-2'>{title}</h3>
          <p className='text-sm text-gray-700 mt-1'>{message}</p>
          <button
            onClick={async () => {
              await sendReward();
              await setShowAnimationPopup(true);
              await onClose();
            }}
            className='mt-4 bg-customGreen-700 text-white px-4 py-2 rounded-lg hover:bg-green-600'
          >
            {t('claim')}
          </button>
        </div>
      </div>
      {showAnimationPopup && <LottieOverlay />}
    </>
  );
};

export default RewardPopup;
