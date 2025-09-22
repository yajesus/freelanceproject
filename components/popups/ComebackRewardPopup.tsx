// components/popups/ComebackRewardPopup.tsx

import { FC, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AirdropPopupBg, AirdropPopupJok } from '@/images';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { showBackButton } from '@/utils/ui';

interface ComebackRewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    rewardType: string;
    rewardAmount: number;
    reminderType: string;
  };
  handleViewChange: (view: string) => void;
}

const ComebackRewardPopup: FC<ComebackRewardPopupProps> = ({ isOpen, onClose, data, handleViewChange }) => {
  const t = useTranslations('ComebackRewardPopup');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
  }, []);

  return createPortal(
    <div
      className={`fixed top-0 left-0 w-full h-screen ${
        isOpen ? 'bg-[#000000B2] z-30' : 'bg-[#00000000] -z-50'
      } transition-all duration-300`}
    >
      <div
        className={`w-full max-w-xl min-h-[500px] absolute flex flex-col  items-center text-white text-center text-xs  ${
          isOpen ? 'top-1/2 -translate-y-1/2' : '-top-full'
        } rounded-[23.93px] z-50 left-1/2 -translate-x-1/2 transform transition-all duration-300 py-5 px-8 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `url('${AirdropPopupBg.src}')`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div>
          <Image priority={false} src={AirdropPopupJok} alt={'Jok'} width={200} height={200} />
        </div>
        <p className={'mt-8 px-[9px]'}>
          {t('welcome', {
            rewardAmount: data.rewardAmount,
            rewardType: data.rewardType
          })}
        </p>
        <div className={'flex flex-col items-center mt-11 gap-3'}>
          <button
            onClick={handleClose}
            className={`h-[52px] w-[268px] relative py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs `}
          >
            <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#3f3842] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>

            <div className='relative z-20 flex justify-center items-center px-4'>{t('close')}</div>
          </button>
        </div>
      </div>
    </div>,
    document.querySelector('#comeback-modal')!
  );
};

export default ComebackRewardPopup;
