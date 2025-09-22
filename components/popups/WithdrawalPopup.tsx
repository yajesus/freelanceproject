import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { triggerHapticFeedback } from '@/utils/ui';
import { useTranslations } from 'next-intl';
import { tonLogo } from '@/images';

interface WithdrawalHistory {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
  transactionHash?: string;
  notes?: string;
}

interface WithdrawalPopupProps {
  onClose: () => void;
  tonBalance: number;
  setTonBalance: (balance: number) => void;
  maxAmount: number;
  userTelegramInitData: string;
  cachedWithdrawalData?: { balance: number; withdrawals: WithdrawalHistory[] } | null;
  onRefreshData?: () => void;
}

const WithdrawalPopup: React.FC<WithdrawalPopupProps> = React.memo(
  ({ onClose, tonBalance, setTonBalance, maxAmount, userTelegramInitData, cachedWithdrawalData, onRefreshData }) => {
    const t = useTranslations('WithdrawalPopup');
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const [isInputFocused, setIsInputFocused] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState(maxAmount);
    const [isClosing, setIsClosing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [currentBalance, setCurrentBalance] = useState(maxAmount);
    const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');

    // Initialize with cached data if available
    useEffect(() => {
      if (cachedWithdrawalData) {
        setWithdrawalHistory(cachedWithdrawalData.withdrawals);
        setCurrentBalance(cachedWithdrawalData.balance);
        setSelectedAmount(cachedWithdrawalData.balance);
      }
    }, [cachedWithdrawalData]);

    // Fetch withdrawal history and current balance (only when user clicks refresh)
    const fetchWithdrawalData = async () => {
      try {
        setHistoryLoading(true);
        const response = await fetch(`/api/withdrawal?initData=${encodeURIComponent(userTelegramInitData)}`);
        const data = await response.json();

        if (response.ok) {
          const newBalance = data.balance || 0;
          setWithdrawalHistory(data.withdrawals || []);
          setCurrentBalance(newBalance);
          setSelectedAmount(newBalance);

          // Update game store if balance changed
          if (newBalance !== tonBalance) {
            setTonBalance(newBalance);
          }

          // Notify parent to refresh cached data
          if (onRefreshData) {
            onRefreshData();
          }
        }
      } catch (error) {
        console.error('Error fetching withdrawal data:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    // useEffect(() => {
    //   const setupBackButton = async () => {
    //     await showBackButton(() => {
    //       onClose();
    //     });
    //   };

    //   setupBackButton();
    // }, []);

    const handleClose = () => {
      triggerHapticFeedback(window);
      setIsClosing(true);
      setTimeout(onClose, 280);
    };

    const handleConfirm = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/withdrawal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initData: userTelegramInitData,
            amount: selectedAmount
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process withdrawal request');
        }

        // Update balance and refresh history
        const newBalance = currentBalance - selectedAmount;
        setCurrentBalance(newBalance);
        setSelectedAmount(newBalance);

        // Update game store
        setTonBalance(newBalance);

        // Refresh withdrawal history
        await fetchWithdrawalData();

        // Switch to history tab to show the new request
        setActiveTab('history');
      } catch (error) {
        console.error('Withdrawal error:', error);
        setError(error instanceof Error ? error.message : 'Failed to process withdrawal request');
      } finally {
        setLoading(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // If input is completely empty, set to 0 but don't return early
      if (inputValue === '') {
        setSelectedAmount(0);
        return;
      }

      // Handle leading zeros properly
      if (inputValue.length > 1 && inputValue.startsWith('0')) {
        // Remove leading zeros but keep at least one digit
        inputValue = inputValue.replace(/^0+/, '') || inputValue.slice(-1);
      }

      const value = parseFloat(inputValue);
      if (!isNaN(value) && value >= 0) {
        setSelectedAmount(Math.min(value, currentBalance));
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
      // Clamp the value between 0 and currentBalance
      if (selectedAmount < 0) {
        setSelectedAmount(0);
      } else if (selectedAmount > currentBalance) {
        setSelectedAmount(currentBalance);
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'COMPLETED':
          return 'text-green-400';
        case 'REJECTED':
          return 'text-red-400';
        case 'PENDING':
          return 'text-yellow-400';
        case 'PROCESSING':
          return 'text-blue-400';
        default:
          return 'text-gray-400';
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    };

    const isValidAmount = currentBalance > 0 && selectedAmount > 0 && selectedAmount <= currentBalance;

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'>
        <div
          className={`bg-[#272a2f] rounded-3xl p-6 w-full max-w-xl max-h-[80vh] overflow-hidden ${
            isClosing ? 'animate-slide-down' : 'animate-slide-up'
          } ${isInputFocused ? ' absolute top-16 ' : ''}`}
        >
          <div className='relative h-full flex flex-col'>
            <button
              onClick={handleClose}
              className='absolute top-0 right-0 w-6 h-6 aspect-square text-white bg-customGreen-700 rounded-full z-50'
            >
              &times;
            </button>

            <div className={`flex justify-between items-center mb-4`}>
              <div className='w-8'></div>
              <h2 className={`text-xl text-customGreen-700 text-center font-bold`}>{t('withdrawTON')}</h2>
              <div className='w-8'></div>
            </div>

            {/* Tab Navigation */}
            <div className='flex mb-4 bg-gray-700 rounded-lg p-1'>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'withdraw' ? 'bg-customGreen-700 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('withdraw')}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-customGreen-700 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('history')}
              </button>
            </div>

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
              <>
                <div className='flex justify-center items-center mb-4'>
                  <Image priority={false} src={tonLogo} alt={'TON'} width={24} height={24} className='w-6 h-6' />
                  <span className='text-white font-bold text-2xl ml-1'>{currentBalance.toFixed(2)}</span>
                  <span className='text-white font-bold text-base ml-1'>{t('available')}</span>
                </div>

                <div className='w-full mb-6'>
                  <div className='flex justify-between mb-2'>
                    <span className='text-white text-sm'>{t('amountToWithdraw')}</span>
                    <span className='text-white text-sm'>{selectedAmount}</span>
                  </div>

                  <div className='flex items-center gap-3 mb-4'>
                    <input
                      type='number'
                      min={0}
                      max={currentBalance}
                      step={0.01}
                      value={selectedAmount}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      onFocus={handleInputFocus}
                      className='w-full h-10 px-3 bg-gray-700 text-white rounded-lg appearance-none'
                      placeholder='Enter amount'
                    />
                    <Image
                      priority={false}
                      src={tonLogo}
                      alt={'TON'}
                      width={20}
                      height={20}
                      className='w-5 h-5 flex-shrink-0'
                    />
                  </div>

                  {error && <div className='text-red-500 text-sm mb-4 text-center'>{error}</div>}

                  <div className='text-gray-400 text-xs text-center mb-4'>{t('withdrawalNote')}</div>
                </div>

                <div className={`flex justify-between items-center gap-2 mb-4 mt-auto`}>
                  <button
                    className='w-full py-4 text-lg font-bold bg-gray-500 text-white rounded-2xl flex items-center justify-center'
                    onClick={handleClose}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    className={`w-full py-4 text-lg font-bold bg-customGreen-700 text-white rounded-2xl flex items-center justify-center ${
                      loading || !isValidAmount ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleConfirm}
                    disabled={loading || !isValidAmount}
                  >
                    {loading ? t('processing') : t('confirm')}
                  </button>
                </div>
              </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className='flex-1 overflow-y-auto'>
                {historyLoading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-customGreen-700 mr-3'></div>
                  </div>
                ) : withdrawalHistory.length === 0 ? (
                  <div className='text-center py-8 text-gray-400'>{t('noWithdrawals')}</div>
                ) : (
                  <div className='space-y-3'>
                    {withdrawalHistory.map((withdrawal) => (
                      <div key={withdrawal.id} className='bg-gray-700 rounded-lg p-4'>
                        <div className='flex justify-between items-start mb-2'>
                          <div className='flex items-center gap-2'>
                            <Image
                              priority={false}
                              src={tonLogo}
                              alt={'TON'}
                              width={16}
                              height={16}
                              className='w-4 h-4'
                            />
                            <span className='text-white font-medium'>{withdrawal.amount}</span>
                          </div>
                          <span className={`text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status}
                          </span>
                        </div>

                        <div className='text-gray-400 text-xs mb-2'>
                          {t('requested')}: {formatDate(withdrawal.requestedAt)}
                        </div>

                        {withdrawal.processedAt && (
                          <div className='text-gray-400 text-xs mb-2'>
                            {t('processed')}: {formatDate(withdrawal.processedAt)}
                          </div>
                        )}

                        {withdrawal.transactionHash && (
                          <a
                            href={`https://tonscan.org/tx/${withdrawal.transactionHash}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-400 hover:text-blue-300 text-xs block mb-2'
                          >
                            {t('viewTransaction')}
                          </a>
                        )}

                        {withdrawal.notes && (
                          <div className='bg-red-900 bg-opacity-30 border border-red-700 rounded p-2 mt-2'>
                            <div className='text-red-400 text-xs font-medium mb-1'>{t('rejectionReason')}:</div>
                            <div className='text-red-300 text-xs'>{withdrawal.notes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className='mt-4'>
                  <button
                    onClick={fetchWithdrawalData}
                    className='w-full py-3 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors'
                  >
                    {t('refresh')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default WithdrawalPopup;
