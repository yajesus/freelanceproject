// components/Settings.tsx

import { useState, useEffect, memo } from 'react';
import { useToast } from '@/contexts/ToastContext';
import Toggle from '@/components/Toggle';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import LocaleSwitcher from './LocaleSwitcher';
import { useTranslations } from 'next-intl';
import Angle from '@/icons/Angle';

interface SettingsProps {
  setCurrentView: (view: string) => void;
}

const HowtoPlay = memo(() => {
  const t = useTranslations('Settings');

  return (
    <div className='relative w-full flex justify-center items-center'>
      <a
        href={'https://docs.jokinthebox.com/telegram-apps/how-to-play-it'}
        target={'_blank'}
        rel={'noopener noreferrer'}
        className='w-[163px] relative pl-[32px] pr-[5px] py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs z-50'
      >
        <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#151515] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
        <div className='relative z-20 flex justify-between items-center'>
          <div></div>
          <div className='flex items-center'>
            <span className='font-medium'>{t('howToPlay')}</span>
          </div>
          <div className='w-[30px] h-[30px] bg-[#000000] rounded-full flex justify-center items-center '>
            <Angle size={40} className='text-white' />
          </div>
        </div>
      </a>
    </div>
  );
});

export default function Settings({ setCurrentView }: SettingsProps) {
  const showToast = useToast();
  const t = useTranslations('Settings');

  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  // const [animationEnabled, setAnimationEnabled] = useState(true);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();

    const storedVibration = localStorage.getItem('vibrationEnabled');
    // const storedAnimation = localStorage.getItem('animationEnabled');

    setVibrationEnabled(storedVibration !== 'false');
    // setAnimationEnabled(storedAnimation !== 'false');
  }, []);

  const handleVibrationToggle = () => {
    const newValue = !vibrationEnabled;
    if (vibrationEnabled) {
      triggerHapticFeedback(window);
    }
    setVibrationEnabled(newValue);
    localStorage.setItem('vibrationEnabled', newValue.toString());
    showToast(newValue ? 'Vibration enabled' : 'Vibration disabled', 'success');
  };

  // const handleAnimationToggle = () => {
  //     triggerHapticFeedback(window);
  //     const newValue = !animationEnabled;
  //     setAnimationEnabled(newValue);
  //     localStorage.setItem('animationEnabled', newValue.toString());
  //     showToast(newValue ? 'Animation enabled' : 'Animation disabled', 'success');
  // };

  const handleBackToGame = () => {
    triggerHapticFeedback(window);
    setCurrentView('myjok');
  };

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 bg-customGreen-700 rounded-t-[48px] relative top-glow z-0'>
          <div className='mt-[2px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'>
            <div className='px-4 pt-1 pb-24'>
              <h1 className='text-2xl text-center mt-4'>{t('title')}</h1>

              <div className='bg-[#272a2f] rounded-lg p-4 my-6'>
                <div className='flex justify-between items-center mb-4'>
                  <p>{t('vibration')}</p>
                  <Toggle enabled={vibrationEnabled} setEnabled={handleVibrationToggle} />
                </div>
                {/* // ! We are not using this feature
                <div className='flex justify-between items-center mb-4'>
                  <p>Floating points animation</p>
                  <Toggle enabled={animationEnabled} setEnabled={handleAnimationToggle} />
                </div> */}
                <div className='flex justify-between items-center'>
                  <p>{t('language')}</p>
                  <LocaleSwitcher />
                </div>
              </div>

              <HowtoPlay />

              <button onClick={handleBackToGame} className='mx-auto block my-6 text-center text-customGreen-700'>
                {t('back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
