import { FC, useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { createPortal } from 'react-dom';
import { AirdropPopupBg, AirdropPopupJok } from '@/images';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { AIRDROP_REGISTRATION_AMOUNT, DAILY_TON_TRANSACTION_ADDRESS } from '@/utils/consts';

interface AirdropStartPopupProps {
  isOpen: boolean;
  onClose: () => void;
  handleViewChange: (view: string) => void;
}

const AirdropStartPopup: FC<AirdropStartPopupProps> = ({ isOpen, onClose, handleViewChange }) => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { userTelegramInitData, setAirdropRequirementMet } = useGameStore();
  const showToast = useToast();
  const t = useTranslations('AirdropStartPopup');

  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('airdrop');
      });
    };

    setupBackButton();
  }, []);

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

  const executeTONTransaction = async (walletAddress: string, amount: number) => {
    if (!tonConnectUI) {
      throw new Error(t('tonConnectUIError'));
    }

    if (!wallet) {
      throw new Error(t('walletNotConnected'));
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: walletAddress,
          amount: toNano(amount).toString()
        }
      ]
    };

    try {
      await tonConnectUI.sendTransaction(transaction);
      return true;
    } catch (error) {
      console.error('TON transaction failed:', error);
      throw new Error(t('transactionFailed'));
    }
  };

  const markRequirementCompletion = async () => {
    try {
      const payload = {
        initData: userTelegramInitData
      };

      const response = await fetch('/api/user/airdrop-requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('error'));
      }

      if (data.success) {
        setAirdropRequirementMet(true);
        showToast(data.message || t('success'), 'success');
      } else {
        showToast(data.message || t('error'), 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('error');
      showToast(errorMessage, 'error');
    }
  };

  const initiateTask = async () => {
    if (!wallet) {
      showToast(t('addressNotFound'), 'error');
      return;
    }

    setIsLoading(true);
    triggerHapticFeedback(window);

    try {
      await executeTONTransaction(DAILY_TON_TRANSACTION_ADDRESS, AIRDROP_REGISTRATION_AMOUNT);
      await markRequirementCompletion();
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('error');
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className={`fixed top-0 left-0 w-full h-screen ${
        isOpen ? 'bg-[#000000B2] z-30' : 'bg-[#00000000] -z-50'
      } transition-all duration-300`}
    >
      <div
        className={`w-full max-w-xl min-h-[500px] absolute flex flex-col  items-center text-white text-center text-xs  ${
          isOpen ? 'top-0 ' : '-top-full'
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
        <p className={'mt-8 px-[9px]'}>{t('description')}</p>
        <div className={'flex flex-col items-center mt-11 gap-3'}>
          {!wallet && (
            <button
              onClick={() => handleViewChange('profile')}
              className={`h-[52px] w-[268px] relative   py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs`}
            >
              <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#3f3842] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
              <div className='relative z-20 flex justify-center items-center'>{t('openProfile')}</div>
            </button>
          )}
          <button
            onClick={initiateTask}
            className={`h-[52px] w-[268px] relative py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs ${
              !wallet ? ' cursor-not-allowed' : ''
            }`}
            disabled={!wallet}
          >
            <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#3f3842] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>

            <div className='relative z-20 flex justify-center items-center px-4'>
              {isLoading ? (
                <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin' />
              ) : (
                t('makeTransaction')
              )}
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.querySelector('#modal')!
  );
};

AirdropStartPopup.displayName = 'AirdropStartPopup';

export default AirdropStartPopup;
