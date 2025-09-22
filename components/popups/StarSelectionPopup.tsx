// components/popups/StarSelectionPopup.tsx

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { ShopItem } from '@/utils/types';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { Cell, toNano } from '@ton/ton';
import { DAILY_TON_TRANSACTION_ADDRESS } from '@/utils/consts';

interface StarSelectionPopupProps {
  onClose: () => void;
  onConfirm: (stars: number, internal?: boolean) => void;
  selectedItem?: ShopItem; // Optional for topup mode
  mode: 'spend' | 'topup' | 'ton'; // New mode prop to determine behavior
  maxStars?: number; // Optional max stars for spend mode
  title?: string; // Optional custom title
  onBack: () => void; // Optional back button handler
}

const StarSelectionPopup: React.FC<StarSelectionPopupProps> = React.memo(
  ({ onClose, onConfirm, selectedItem, mode = 'spend', maxStars = 1000, title, onBack }) => {
    const t = useTranslations('StarSelectionPopup');
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const { totalStars } = useGameStore();
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const [isInputFocused, setIsInputFocused] = useState(false);
    const [selectedStars, setSelectedStars] = useState(() => {
      if (mode === 'spend') {
        if (selectedItem?.price != null) {
          return totalStars > selectedItem.price ? selectedItem.price : totalStars;
        } else if (maxStars) {
          return maxStars;
        }
        return 0;
      } else {
        return 100;
      }
    });
    const [isClosing, setIsClosing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tonPriceInUSD, setTonPriceInUSD] = useState(0);

    const getTonPriceInUSD = async () => {
      const res = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
      const data = await res.json();
      const price = data?.rates?.TON?.prices?.USD || 0;
      setTonPriceInUSD(price);
    };

    const starPacks = [
      { display: 265, value: 250, price: 5.69, bonus: 5 },
      { display: 550, value: 500, price: 11.5, bonus: 10 },
      { display: 1150, value: 1000, price: 22.99, bonus: 15 },
      { display: 3000, value: 2500, price: 56.99, bonus: 20 },
      { display: 6250, value: 5000, price: 113.99, bonus: 25 },
      { display: 13000, value: 10000, price: 229, bonus: 30 }
    ];

    useEffect(() => {
      // const setupBackButton = async () => {
      //   await showBackButton(() => {
      //     onBack();
      //   });
      // };

      // setupBackButton();
      getTonPriceInUSD();
    }, []);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchTransactionWithRetry = async (hashHex: string, maxRetries = 5, retryDelay = 10000) => {
      let retries = 0;
      let success = false;
      let transactionData = null;

      while (retries < maxRetries && !success) {
        try {
          const response = await fetch(`https://tonapi.io/v2/blockchain/transactions/${hashHex}`);

          if (response.ok || response.status === 200) {
            transactionData = await response.json();

            if (
              transactionData &&
              transactionData.success !== false &&
              !transactionData.aborted &&
              !transactionData.destroyed &&
              !transactionData.error &&
              transactionData.out_msgs?.[0]?.value
            ) {
              success = true;
            } else {
              console.log(`Attempt ${retries + 1}: Transaction data not fully populated yet, retrying...`);
              await sleep(retryDelay);
            }
          } else {
            console.log(`Attempt ${retries + 1}: Transaction not found, retrying...`);
            await sleep(retryDelay);
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1}: Error fetching transaction:`, error);
          await sleep(retryDelay);
        }

        retries++;
      }

      if (!success) {
        throw new Error('Transaction verification failed after multiple attempts');
      }

      return transactionData;
    };

    const handleClose = () => {
      triggerHapticFeedback(window);
      setIsClosing(true);
      setTimeout(onClose, 280);
    };

    const handleConfirm = async (stars: number) => {
      try {
        setLoading(true);
        if (mode === 'ton') {
          console.log(stars);
          const nanoAmount = toNano(stars);
          const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60,
            messages: [
              {
                address: DAILY_TON_TRANSACTION_ADDRESS,
                amount: nanoAmount.toString()
              }
            ]
          };

          const result = await tonConnectUI.sendTransaction(transaction, {
            modals: ['before', 'error']
          });
          if (!result.boc) {
            throw new Error('Transaction failed - no BOC returned');
          }

          const cell = Cell.fromBase64(result.boc);
          const buffer = cell.hash();
          const hashHex = buffer.toString('hex');

          await fetchTransactionWithRetry(hashHex);
          await onConfirm(stars);
        } else {
          onConfirm(stars);
        }
        handleClose();
      } finally {
        setLoading(false);
      }
    };

    // Determine max value based on mode - no limit for topup mode
    const maxValue =
      mode === 'spend'
        ? selectedItem && totalStars > selectedItem.price
          ? selectedItem.price
          : totalStars
        : Number.MAX_SAFE_INTEGER; // No limit for topup mode

    const minValue = mode === 'spend' ? 0 : 10; // Minimum for topup is 10 stars

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // If input is completely empty, set to 0 but don't return early
      if (inputValue === '') {
        setSelectedStars(0);
        return;
      }

      // Handle leading zeros properly
      if (inputValue.length > 1 && inputValue.startsWith('0')) {
        // Remove leading zeros but keep at least one digit
        inputValue = inputValue.replace(/^0+/, '') || inputValue.slice(-1);
      }

      const value = parseInt(inputValue);
      if (!isNaN(value) && value >= 0) {
        setSelectedStars(value);
      }
    };

    const handleInputFocus = () => {
      if (isIOS) {
        setIsInputFocused(true);
      }
    };

    const handleInputBlur = () => {
      if (isIOS) {
        setIsInputFocused(false);
      }
      // Only clamp the minimum value, no maximum limit for topup mode
      if (selectedStars < minValue) {
        setSelectedStars(minValue);
      } else if (mode === 'spend' && selectedStars > maxValue) {
        // Only apply max limit for spend mode
        setSelectedStars(maxValue);
      }
    };

    const handleTonPackPurchase = async (pack: (typeof starPacks)[number]) => {
      try {
        if (!tonPriceInUSD) {
          return;
        }
        setLoading(true);
        const tonAmount = pack.price / tonPriceInUSD;
        const nanoAmount = toNano(tonAmount.toFixed(9));

        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 60,
          messages: [
            {
              address: DAILY_TON_TRANSACTION_ADDRESS,
              amount: nanoAmount.toString()
            }
          ]
        };

        const result = await tonConnectUI.sendTransaction(transaction, {
          modals: ['before', 'error']
        });

        if (!result.boc) throw new Error('Transaction failed - no BOC returned');

        const cell = Cell.fromBase64(result.boc);
        const buffer = cell.hash();
        const hashHex = buffer.toString('hex');

        await fetchTransactionWithRetry(hashHex);
        await onConfirm(pack.display, true);
        await setLoading(false);
        handleClose();
      } catch (error) {
        console.error('TON payment error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Default titles based on mode
    const defaultTitle = mode === 'spend' ? 'spending' : 'adding';

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'>
        <div
          className={`bg-[#272a2f] rounded-3xl p-6 w-full max-w-xl ${
            isClosing ? 'animate-slide-down' : 'animate-slide-up'
          } ${isInputFocused ? ' absolute top-16 ' : ''}`}
        >
          <div className='relative'>
            <button
              onClick={handleClose}
              className='absolute top-0 right-0 w-6 h-6 aspect-square text-white bg-customGreen-700 rounded-full z-50'
            >
              &times;
            </button>

            {mode !== 'spend' && mode !== 'ton' && (
              <>
                <p className='pt-5 text-2xl font-semibold text-center drop-shadow-sm tracking-wide mb-2'>
                  {t('topupTelegram')}
                </p>
              </>
            )}
            <div className={`flex justify-between items-center mb-4`}>
              <div className='w-8'></div>
              <h2 className={`text-xl text-customGreen-700 text-center font-bold`}>
                {mode != 'ton' ? t(title || defaultTitle) : t('tonToSend')}
              </h2>
              <div className='w-8'></div>
            </div>

            {mode === 'spend' && (
              <div className='flex justify-center items-center mb-4'>
                <Image priority={false} src={'/star.png'} alt={'Stars'} width={24} height={24} className='w-6 h-6' />
                <span className='text-white font-bold text-2xl ml-1'>{formatNumber(totalStars)}</span>
                <span className='text-white font-bold text-base ml-1'>{t('available')}</span>
              </div>
            )}

            {mode != 'ton' ? (
              <div className='w-full mb-6'>
                <div className='flex justify-between mb-2'>
                  <span className='text-white text-sm'>{t(mode === 'spend' ? 'starsToSpend' : 'starsToAdd')}</span>
                  <span className='text-white text-sm'>{selectedStars}</span>
                </div>

                <div className='flex items-center gap-3 mb-4'>
                  <input
                    type='number'
                    min={minValue}
                    max={mode === 'spend' ? maxValue : undefined}
                    value={selectedStars === 0 ? '' : selectedStars}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onFocus={handleInputFocus}
                    disabled={mode === 'spend'}
                    className='w-full h-10 px-3 bg-gray-700 text-white rounded-lg appearance-none'
                    placeholder={mode === 'topup' ? 'Enter amount' : '0'}
                  />
                  <Image
                    priority={false}
                    src={'/star.png'}
                    alt={'Stars'}
                    width={20}
                    height={20}
                    className='w-5 h-5 flex-shrink-0'
                  />
                </div>
              </div>
            ) : null}

            {mode !== 'spend' && mode !== 'ton' && (
              <>
                <p className='pt-5 text-2xl font-semibold text-center drop-shadow-sm tracking-wide '>{t('topupTON')}</p>
                <div className='grid grid-cols-2 gap-4 pt-3 mb-6'>
                  {starPacks.map((pack) => (
                    <button
                      key={pack.display}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-700 text-white border-2 ${
                        selectedStars === pack.display ? 'border-customGreen-700' : 'border-transparent'
                      }`}
                      onClick={() => handleTonPackPurchase(pack)}
                    >
                      <span className='text-xl font-bold flex items-center gap-1'>
                        {pack.display}{' '}
                        <Image
                          priority={false}
                          src={'/star.png'}
                          alt={'Stars'}
                          width={40}
                          height={40}
                          className='w-6 h-6'
                        />
                      </span>
                      <span className='text-sm text-gray-300'>${pack.price.toFixed(2)}</span>
                      <span className='text-xs text-customGreen-700'>
                        +{pack.bonus}% {t('bonus')}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className={`flex justify-between items-center gap-2 mb-4`}>
              <button
                className='w-full py-4 text-lg font-bold bg-gray-500 text-white rounded-2xl flex items-center justify-center'
                onClick={handleClose}
              >
                {t('cancel')}
              </button>
              {mode === 'ton' && (!wallet || !tonConnectUI) ? (
                <button
                  className='w-full py-4 text-lg font-bold bg-blue-600 text-white rounded-2xl flex items-center justify-center'
                  onClick={() => tonConnectUI.connectWallet()}
                >
                  {t('connectWallet')}
                </button>
              ) : mode === 'ton' ? (
                <button
                  className={`w-full py-4 text-lg font-bold bg-customGreen-700 text-white rounded-2xl flex items-center justify-center ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => {
                    if (!selectedItem || !tonPriceInUSD || typeof selectedItem.price !== 'number') {
                      return;
                    }
                    const usdPrice = selectedItem?.price * 0.025;
                    const tonPrice = usdPrice / tonPriceInUSD;
                    const discountedStars = tonPrice * 0.9;
                    handleConfirm(discountedStars);
                  }}
                  disabled={loading}
                >
                  {t('confirm')}
                </button>
              ) : (
                <button
                  className={`w-full py-4 text-lg font-bold bg-customGreen-700 text-white rounded-2xl flex items-center justify-center ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleConfirm(selectedStars)}
                  disabled={loading}
                >
                  {t('confirm')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default StarSelectionPopup;
