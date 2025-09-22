// components/popups/BuyJOKPopup.tsx

import React, { useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { showBackButton } from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { BITSTORAGE_URL, UNISWAP_URL } from '@/utils/consts';
import UniSwap from '@/icons/UniSwap';
import BitStorage from '@/icons/BitStorage';

interface BuyJOKPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

const BuyJOKPopupComponent: React.FC<BuyJOKPopupProps> = ({ isOpen, onClose, onBack }) => {
  const t = useTranslations('Profile');

  useEffect(() => {
    if (!isOpen) return;

    const setupBackButton = async () => {
      try {
        await showBackButton(() => {
          onBack();
          return true;
        });
      } catch (error) {
        console.warn('Failed to setup back button:', error);
      }
    };

    setupBackButton();
  }, [isOpen, onBack]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = 'auto';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContainer = document.querySelector('#modal');
  if (!modalContainer) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center' onClick={handleBackdropClick}>
      <div className='bg-[#181818] rounded-2xl p-6 w-[320px] max-w-[90vw] mx-4' onClick={(e) => e.stopPropagation()}>
        <h3 className='text-lg font-bold mb-4 text-center text-white'>{t('buyJOK')}</h3>

        <div className='flex flex-col gap-3'>
          <a
            href={BITSTORAGE_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-3 bg-[#232224] rounded-lg px-4 py-3 hover:bg-[#2c2c2c] transition-colors'
          >
            <BitStorage />
            <span className='font-medium text-white'>Bitstorage</span>
          </a>

          <a
            href={UNISWAP_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-3 bg-[#232224] rounded-lg px-4 py-3 hover:bg-[#2c2c2c] transition-colors'
          >
            <UniSwap />
            <span className='font-medium text-white'>Uniswap</span>
          </a>
        </div>
      </div>
    </div>,
    modalContainer
  );
};

const BuyJOKPopup = memo(BuyJOKPopupComponent);
BuyJOKPopup.displayName = 'BuyJOKPopup';

export default BuyJOKPopup;
