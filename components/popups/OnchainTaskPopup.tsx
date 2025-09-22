// components/popups/OnchainTaskPopup.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useToast } from '@/contexts/ToastContext';
import { Address, beginCell, toNano } from '@ton/core';
import { useGameStore } from '@/utils/game-mechanics';
import { useTranslations } from 'next-intl';

interface OnchainTask {
  id: string;
  smartContractAddress: string;
  price: string;
  collectionMetadata: {
    name: string;
    description: string;
    image: string;
  };
  itemMetadata: any;
  points: number;
  isActive: boolean;
}

interface OnchainTaskPopupProps {
  task: OnchainTask;
  onClose: () => void;
  onUpdate: (updatedTask: OnchainTask) => void;
  onBack: () => void;
}

const OnchainTaskPopup: React.FC<OnchainTaskPopupProps> = React.memo(({ task, onClose, onUpdate, onBack }) => {
  const t = useTranslations('OnchainTaskPopup');
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const showToast = useToast();
  const { userTelegramInitData, incrementPoints } = useGameStore();

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        onBack();
      });
    };

    setupBackButton();
  }, []);

  const handleMint = useCallback(async () => {
    if (!tonConnectUI.account) {
      showToast(t('pleaseConnectWallet'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      triggerHapticFeedback(window);

      const nftCollectionAddress = Address.parse(task.smartContractAddress);
      const userAddress = Address.parse(tonConnectUI.account.address);
      const totalMintCost = BigInt(task.price) + BigInt(toNano(0.05));

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: nftCollectionAddress.toString(),
            amount: totalMintCost.toString(),
            payload: beginCell().storeUint(0, 32).storeStringTail('Mint').endCell().toBoc().toString('base64')
          }
        ]
      });

      showToast(t('mintingTransactionSent'), 'success');
    } catch (error) {
      console.error('Error minting NFT:', error);
      showToast(t('errorMintingNFT'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [task, tonConnectUI, showToast]);

  const handleCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      triggerHapticFeedback(window);
      const response = await fetch('/api/onchain-tasks/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          taskId: task.id
        })
      });

      const data = await response.json();

      // Even if response.ok is false, we want to show the message from the server
      if (data.success) {
        incrementPoints(task.points);
        const updatedTask = { ...task, isCompleted: true };
        onUpdate(updatedTask);
        showToast(data.message || t('taskCompleted'), 'success');
        onClose(); // Close the popup after successful completion
      } else {
        // Show the error message from the server
        showToast(data.error || data.message || t('taskFailed'), 'error');
      }
    } catch (error) {
      // This will only trigger for network errors or other exceptions
      console.error('Error checking NFT:', error);
      showToast(t('errorCheckingNFT'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [task, userTelegramInitData, incrementPoints, showToast, onClose, onUpdate]);

  const handleClose = useCallback(() => {
    triggerHapticFeedback(window);
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280); // Match this to the animation duration
  }, [onClose]);

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'>
      <div
        className={`bg-[#272a2f] rounded-t-3xl p-6 w-full max-w-xl ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className='flex justify-between items-center mb-4'>
          <div className='w-8'></div>
          <h2 className='text-3xl text-white text-center font-bold'>{task.collectionMetadata.name}</h2>
          <button onClick={handleClose} className='text-gray-400 hover:text-white text-2xl'>
            &times;
          </button>
        </div>
        <Image
          priority={false}
          src={task.collectionMetadata.image}
          alt={task.collectionMetadata.name}
          width={80}
          height={80}
          className='mx-auto mb-4 rounded-lg'
        />
        <p className='text-gray-300 text-center mb-4'>{task.collectionMetadata.description}</p>
        <p className='text-center mb-4'>
          {t('price')}: {formatTON(task.price)} TON
        </p>
        <button
          className={`w-full py-6 text-xl font-bold text-white rounded-2xl flex items-center justify-center ${
            isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500'
          }`}
          onClick={handleMint}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin'></div>
          ) : (
            t('mintNFT')
          )}
        </button>
        <button
          className={`w-full mt-4 py-6 text-xl font-bold text-white rounded-2xl flex items-center justify-center ${
            isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500'
          }`}
          onClick={handleCheck}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className='w-6 h-6 border-t-2 border-white border-solid rounded-full animate-spin'></div>
          ) : (
            t('check')
          )}
        </button>
      </div>
    </div>
  );
});

OnchainTaskPopup.displayName = 'OnchainTaskPopup';

// Helper function to format TON amount
function formatTON(nanoTON: string): string {
  return (parseInt(nanoTON) / 1e9).toFixed(2);
}

export default OnchainTaskPopup;
