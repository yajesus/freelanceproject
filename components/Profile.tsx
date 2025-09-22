// components/Profile.tsx

'use client';

import { useToast } from '@/contexts/ToastContext';
import Angle from '@/icons/Angle';
import Copy from '@/icons/Copy';
import Cross from '@/icons/Cross';
import Wallet from '@/icons/Wallet';
import {
  character1,
  gecko,
  hatIcon,
  profileAvatarGradient,
  profileBgGradient,
  profileBuy,
  profileWebsite,
  shopImageMap,
  subtract,
  tonWallet
} from '@/images';
import { useGameStore } from '@/utils/game-mechanics';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { Address } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { JOK_IN_THE_BOX_URL, LEVELS, TOKEN_INFO_URL } from '@/utils/consts';

import OnchainTaskPopup from './popups/OnchainTaskPopup';
import PassportSharer from './PassportSharer';
import PassportPopup from './popups/PassportPopup';
import BuyJOKPopup from './popups/BuyJOKPopup';
import { getUnsupportedWalletMessage, getWalletName, isWalletSupported } from '@/utils/wallet';

interface ProfileProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

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

interface EditState {
  isTwitterEditing: boolean;
  isWalletEditing: boolean;
}

export default function Profile({ currentView, setCurrentView }: ProfileProps) {
  const t = useTranslations('Profile');
  const [tonConnectUI] = useTonConnectUI();

  const {
    tonWalletAddress,
    setTonWalletAddress,
    userTelegramInitData,
    erc20Wallet,
    twitterHandle,
    updateErc20Wallet,
    updateTwitterHandle,
    userTelegramName,
    gameLevelIndex,
    equippedAvatar,
    onChainCount,
    setOnChainCount
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [percent, setPercent] = useState(0);

  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [onchainTasks, setOnchainTasks] = useState<OnchainTask[]>([]);
  const [activeMint, setActiveMint] = useState<number | null>(null);
  const [selectedOnchainTask, setSelectedOnchainTask] = useState<OnchainTask | null>(null);
  const [editState, setEditState] = useState<EditState>({
    isTwitterEditing: false,
    isWalletEditing: false
  });
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [showBuyJokPopup, setShowBuyJokPopup] = useState(false);

  const getNftType = (taskName: string): number => {
    if (taskName.includes('X5')) return 5;
    if (taskName.includes('X3')) return 3;
    return 1; // Default for single NFT
  };

  const getTaskForButtonIndex = (buttonIndex: number): OnchainTask | null => {
    const expectedNftCounts = [1, 3, 5];
    const expectedCount = expectedNftCounts[buttonIndex];

    return onchainTasks.find((task) => getNftType(task.itemMetadata.name) === expectedCount) || null;
  };

  const handleViewPassport = () => {
    triggerHapticFeedback(window);
    setIsPassportOpen(true);
  };

  const handlePassportHide = () => {
    setIsPassportOpen(false);
  };

  const twitterInputRef = useRef<HTMLInputElement>(null);
  const walletInputRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLDivElement>(null);

  const showToast = useToast();

  useEffect(() => {
    setPercent((onChainCount / 5) * 100);
  }, [onChainCount]);

  const handleWalletConnection = useCallback(
    async (address: string, walletName: string) => {
      // Check if wallet is unsupported
      if (!isWalletSupported(walletName)) {
        showToast(getUnsupportedWalletMessage(walletName), 'error');

        // Immediately disconnect
        try {
          await tonConnectUI.disconnect();
        } catch (error) {
          console.error('Error disconnecting unsupported wallet:', error);
        }

        setIsConnecting(false);
        return;
      }

      setIsLoading(true);
      try {
        const success = await saveWalletAddress(address);
        if (!success) {
          if (tonConnectUI.account?.address) {
            await tonConnectUI.disconnect();
          }
          showToast(t('failedToSaveWallet'), 'error');
        } else {
          showToast(t('walletConnected'), 'success');
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast(t('errorConnectingWallet'), 'error');
      } finally {
        setIsLoading(false);
        setIsConnecting(false);
      }
    },
    [tonConnectUI, showToast]
  );

  const handleWalletDisconnection = useCallback(async () => {
    setIsLoading(true);
    try {
      await disconnectWallet();
      setTonWalletAddress(null);
      showToast(t('walletDisconnected'), 'success');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      showToast(t('errorDisconnectingWallet'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [setTonWalletAddress, showToast]);

  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (wallet && isConnecting) {
        const walletName = getWalletName(wallet);
        console.log('Wallet name detected:', walletName);

        await handleWalletConnection(wallet.account.address, walletName);
      } else if (!wallet && !isConnecting) {
        await handleWalletDisconnection();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection, isConnecting]);

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
    fetchOnchainTasks();
  }, []);

  const fetchOnchainTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const response = await fetch(`/api/onchain-tasks?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (!response.ok) {
        throw new Error(t('failedToLoadOnchainTasks'));
      }
      const data = await response.json();
      setOnchainTasks(data);
    } catch (error) {
      console.error('Error fetching onchain tasks:', error);
      showToast(t('failedToLoadOnchainTasks'), 'error');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const saveWalletAddress = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          walletAddress: address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save wallet address');
      }

      const data = await response.json();
      setTonWalletAddress(data.walletAddress);
      return true;
    } catch (error) {
      console.error('Error saving wallet address:', error);
      return false;
    }
  };

  const disconnectWallet = async () => {
    try {
      const response = await fetch('/api/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect wallet');
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  const handleWalletAction = async () => {
    triggerHapticFeedback(window);
    if (tonConnectUI.account?.address) {
      await tonConnectUI.disconnect();
    } else {
      setIsConnecting(true);
      await tonConnectUI.openModal();
    }
  };

  const formatAddress = (address: string) => {
    try {
      const tempAddress = Address.parse(address).toString({
        bounceable: false,
        urlSafe: true,
        testOnly: false
      });
      return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
    } catch (e) {
      showToast(t('unknownAddressType'), 'error');
      return '';
    }
  };

  const copyToClipboard = () => {
    if (tonWalletAddress) {
      triggerHapticFeedback(window);
      navigator.clipboard.writeText(tonWalletAddress);
      setCopied(true);
      showToast(t('addressCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShopClick = () => {
    triggerHapticFeedback(window);
    setCurrentView('shop');
  };

  const handleOnchainTaskClick = (index: number) => {
    setActiveMint(index);
  };

  const handleMintClick = () => {
    const task = getTaskForButtonIndex(activeMint as number);
    if (task) {
      triggerHapticFeedback(window);
      setSelectedOnchainTask(task);
    }
  };

  const handleTaskUpdate = useCallback(
    (updatedTask: OnchainTask) => {
      setOnchainTasks((prevTasks) => prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

      // extract nft count from task name
      const nftCount = getNftType(updatedTask.itemMetadata.name);
      setOnChainCount(onChainCount + nftCount);
    },
    [onChainCount]
  );

  const saveTwitterHandle = async () => {
    try {
      const newTwitterHandle = twitterInputRef.current?.value || '';
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          twitterHandle: newTwitterHandle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save Twitter handle');
      }

      const { updatedUser } = await response.json();
      updateTwitterHandle(updatedUser.twitterHandle);
      setEditState((prev) => ({ ...prev, isTwitterEditing: false }));
      showToast(t('twitterHandleSaved'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save Twitter handle', 'error');
    }
  };

  const saveERCAddress = async () => {
    try {
      const newWalletAddress = walletInputRef.current?.value || '';
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          erc20Wallet: newWalletAddress
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save wallet address');
      }

      const { updatedUser } = await response.json();
      updateErc20Wallet(updatedUser.erc20Wallet);
      setEditState((prev) => ({ ...prev, isWalletEditing: false }));
      showToast(t('walletAddressSaved'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('failedToSaveWallet'), 'error');
    }
  };

  const handleTwitterEdit = () => {
    if (editState.isTwitterEditing) {
      saveTwitterHandle();
    } else {
      setEditState((prev) => ({ ...prev, isTwitterEditing: true }));
    }
  };

  const handleERCEdit = () => {
    if (editState.isWalletEditing) {
      saveERCAddress();
    } else {
      setEditState((prev) => ({ ...prev, isWalletEditing: true }));
    }
  };

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='h-screen mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0'>
          <div className='flex-grow mt-[2px] bg-[#080808] rounded-t-[46px] h-full overflow-y-auto no-scrollbar'>
            <div className='relative px-4 pt-1 pb-32'>
              <div className='relative mt-4 mb-24 z-10'>
                {/* Profile */}
                <div className='flex justify-between mb-4 gap-4'>
                  {/* Profile Information */}
                  <div className='flex space-x-5'>
                    {/* Avatar */}
                    <div className='flex flex-col items-center'>
                      <div className='relative'>
                        <Image
                          priority={false}
                          src={
                            equippedAvatar
                              ? shopImageMap[`${equippedAvatar}`]
                              : shopImageMap[`character${gameLevelIndex + 1}`] || character1
                          }
                          alt='Avatar Thumbnail'
                          width={85}
                          height={85}
                          className='relative z-30 rounded-lg mr-2'
                        />
                        <Image
                          priority={false}
                          src={profileAvatarGradient}
                          alt={''}
                          width={95}
                          height={95}
                          className='absolute z-20 top-5 left-0'
                        />
                      </div>
                      <button
                        onClick={handleShopClick}
                        className='relative px-[12px] py-[15px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs'
                      >
                        <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-black w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
                        <span className='relative z-40 text-nowrap'>{t('changeAvatar')}</span>
                      </button>
                    </div>

                    {/* Info */}
                    <div className='flex flex-col items-start justify-between'>
                      <p className='text-sm'>{userTelegramName || 'User'}</p>
                      <p className='text-sm bg-[#ffffff17] rounded-[32px] px-[13px] py-[4px]'>
                        {t('level')} {gameLevelIndex + 1}
                      </p>
                      <p className='text-sm'>{LEVELS[gameLevelIndex].name}</p>

                      <button onClick={handleViewPassport} className='text-[#57D63B] text-xs underline text-nowrap'>
                        {t('viewMyPassport')}
                      </button>
                    </div>
                  </div>

                  {/* Telegram Share */}
                  <PassportSharer className='w-[93px] h-[93px] bg-[#1e1e1e]' passportRef={passportRef} />
                </div>

                {/* Change Profile Information */}
                <div className='px-[18px] py-[12px] bg-[#D9E5FF0D] rounded-[20px]'>
                  <p className='text-gray-300 text-center mb-4 font-normal text-xs'>{t('enterProfileInfo')}</p>

                  <div className='flex items-center gap-2 mb-4 relative z-10 h-[36px]'>
                    <div className='flex-1'>
                      <input
                        ref={twitterInputRef}
                        placeholder='X Handle (e.g. @JokInTheBox)'
                        className='w-full bg-[#3a3d42] p-3 rounded-[24px] text-xs h-full'
                        autoComplete='off'
                        defaultValue={twitterHandle}
                        disabled={!editState.isTwitterEditing}
                      />
                    </div>
                    <button
                      onClick={handleTwitterEdit}
                      className='bg-black rounded-[29px] p-2 text-white px-5 text-xs h-full'
                    >
                      {t(editState.isTwitterEditing ? 'save' : 'edit')}
                    </button>
                  </div>

                  <div className='flex items-center gap-2 relative z-10 h-[36px]'>
                    <div className='flex-1'>
                      <input
                        ref={walletInputRef}
                        placeholder='ERC-20 wallet'
                        className='w-full bg-[#3a3d42] p-3 rounded-[24px] text-xs h-full'
                        autoComplete='off'
                        defaultValue={erc20Wallet}
                        disabled={!editState.isWalletEditing}
                      />
                    </div>
                    <button
                      onClick={handleERCEdit}
                      className='bg-black rounded-[29px] p-2 text-white px-5 text-xs h-full'
                    >
                      {t(editState.isWalletEditing ? 'save' : 'edit')}
                    </button>
                  </div>
                </div>

                {/* Wallet Info */}
                <div className='px-[26px]'>
                  {/* Title */}
                  <p className='text-gray-300 text-center mt-8 mb-4 font-normal text-xs'>{t('addWalletInfo')}</p>

                  {/* Content */}
                  <div>
                    {/* Icons */}
                    <div className='relative'>
                      <Image
                        priority={false}
                        src={subtract}
                        alt={''}
                        width={0}
                        height={0}
                        sizes='100vw'
                        style={{ width: '100%', height: 'auto' }}
                      />
                      <div className='w-[calc(100%-39px)] sm:w-[calc(100%-80px)] absolute flex justify-between top-1/2 left-1/2 translate-y-[-50%] translate-x-[-50%]'>
                        <a href={TOKEN_INFO_URL} target='_blank' rel='noopener noreferrer' className=''>
                          <Image
                            priority={false}
                            src={gecko}
                            alt='Gecko Token'
                            width={window.innerWidth >= 640 ? 42 : 32}
                            height={window.innerWidth >= 640 ? 42 : 32}
                            className='rounded-lg'
                          />
                        </a>
                        <button type='button' onClick={() => setShowBuyJokPopup(true)}>
                          <Image
                            priority={false}
                            src={profileBuy}
                            alt='Buy JOK Token'
                            width={window.innerWidth >= 640 ? 42 : 32}
                            height={window.innerWidth >= 640 ? 42 : 32}
                            className='rounded-lg'
                          />
                        </button>
                        <a
                          href={JOK_IN_THE_BOX_URL}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex flex-col items-center justify-center gap-2'
                        >
                          <Image
                            priority={false}
                            src={profileWebsite}
                            alt='Ice Token'
                            width={window.innerWidth >= 640 ? 42 : 32}
                            height={window.innerWidth >= 640 ? 42 : 32}
                            className='rounded-lg'
                          />
                        </a>
                      </div>
                    </div>

                    {/* Texts */}
                    <div className='w-[calc(100%-39px)] sm:w-[calc(100%-80px)] mx-auto mt-[13px]  flex justify-between text-sm font-medium'>
                      <a href={TOKEN_INFO_URL} target='_blank' rel='noopener noreferrer' className='-translate-x-[20%]'>
                        {t('tokenInfo')}
                      </a>
                      <button type='button' className='-translate-x-[10%]' onClick={() => setShowBuyJokPopup(true)}>
                        {t('buyJOK')}
                      </button>
                      <a
                        href={JOK_IN_THE_BOX_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='translate-x-[20%]'
                      >
                        {t('website')}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                <div className='relative z-20'>
                  <h2 className='text-sm mt-8 mb-4'>{t('wallet')}</h2>

                  {isLoading ? (
                    <div className='flex justify-between items-center bg-[#272a2f] rounded-lg p-4 w-full'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-gray-300 rounded-lg animate-pulse mr-2'></div>
                        <div className='flex flex-col'>
                          <div className='w-32 h-4 bg-gray-300 rounded animate-pulse'></div>
                        </div>
                      </div>
                      <div className='w-20 h-8 bg-gray-300 rounded animate-pulse'></div>
                    </div>
                  ) : !tonWalletAddress ? (
                    <button
                      onClick={handleWalletAction}
                      className='w-full relative pl-[17px] pr-[5px] py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs'
                    >
                      <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#3f3842] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
                      <div className='relative z-20 flex justify-between items-center'>
                        <div className='flex items-center'>
                          <Image
                            priority={false}
                            src={tonWallet}
                            alt='Ton wallet'
                            width={40}
                            height={40}
                            className='rounded-lg mr-2'
                          />
                          <div className='flex flex-col'>
                            <span className='font-medium'>{t('connectTONWallet')}</span>
                          </div>
                        </div>
                        <div className='w-[54px] h-[54px] bg-[#232224] rounded-full flex justify-center items-center'>
                          <Angle size={40} className='text-white' />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className='flex gap-2'>
                      <button
                        onClick={handleWalletAction}
                        className='w-12 h-12 bg-[#33363b] rounded-lg text-white font-bold flex items-center justify-center'
                        disabled={isLoading}
                      >
                        <Cross className='text-[#8b8e93]' />
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className='flex-grow justify-between py-3 bg-[#33363b] rounded-lg text-white font-medium'
                        disabled={isLoading}
                      >
                        <div className='w-full flex justify-between px-4 items-center'>
                          <div className='flex items-center gap-2'>
                            <Wallet className='text-[#8b8e93]' />
                            <span>{formatAddress(tonWalletAddress)}</span>
                          </div>
                          <div>
                            <Copy className='text-[#8b8e93]' />
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* NFT's */}
                <div className='relative z-10'>
                  {/* Title */}
                  <div className='mt-[18px]'>
                    <h2 className='text-xs mb-1 text-center font-medium'>{t('nfts.title')}</h2>
                    <p className='text-gray-300 mb-4 font-normal text-center text-xs'>{t('nfts.description')}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className='relative w-full'>
                    {/* Icon */}
                    <div>
                      <div className='absolute left-0 top-[calc(50%-1px)] transform -translate-y-1/2 z-20 w-[50px] h-[50px] bg-gradient-to-t from-[#2A2931] to-[#0A0A0C] rounded-full'>
                        <Image
                          priority={false}
                          src={hatIcon}
                          alt='Jester Hat Icon'
                          sizes='100vw'
                          className='min-w-[80px] h-auto translate-x-[-12.5px] translate-y-[-12.5px]'
                        />
                      </div>
                      <div className='absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-[50px] h-[50px] bg-gradient-to-t from-[#898890] via-[#63626C] to-[#3A3949] rounded-full'></div>
                    </div>

                    {/* Progress Bar */}
                    <div className='relative w-[calc(100%-40px)] ml-auto h-[24px] bg-gray-800 rounded-full overflow-hidden bg-[#FFFFFF26] border-[#FFFFFF0D] border'>
                      <div
                        className='relative z-0 h-full bg-gradient-to-r from-[#E546D8] via-[#7FC664] to-[#BEE110] transition-all duration-300'
                        style={{ width: `${percent}%` }}
                      >
                        <div className="relative z-10 w-full h-full bg-[url('/bg-progress.png')] bg-contain bg-repeat-x"></div>
                      </div>
                    </div>
                  </div>

                  {/* Count */}
                  <div className='mt-[10px] w-full flex justify-end'>
                    <div className='w-max px-[10px] py-[2px] bg-gradient-to-bl from-[#FFFFFF21] to-[#99999921] rounded-[15px] text-xs font-medium'>
                      {`${Math.max(0, onChainCount)}/5 NFTs`}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className='mt-[17px]'>
                    <div className='mt-17 flex justify-center gap-[38px]'>
                      {isLoadingTasks
                        ? [...Array(3)].map((_, index) => (
                            <button
                              key={index}
                              className='flex-1 text-xs font-medium bg-gradient-to-bl from-[#FFFFFF1F] to-[#23232321] w-[86px] h-[38px] text-[#FFFFFF8A] rounded-[10px]'
                            >
                              {t('nfts.pic', { number: 0 })}
                            </button>
                          ))
                        : [...Array(3)].map((_, index) => {
                            const task = getTaskForButtonIndex(index);
                            const nftCounts = [1, 3, 5]; // Button labels
                            const nftCount = nftCounts[index];
                            const disabled = !task || onChainCount >= 5;
                            return (
                              <button
                                key={index}
                                className={`relative overflow-hidden flex-1 text-xs font-medium bg-gradient-to-bl from-[#FFFFFF1F] to-[#23232321] w-[86px] h-[38px] text-[#FFFFFF8A] rounded-[10px] ${
                                  !task ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={() => task && onChainCount < 5 && handleOnchainTaskClick(index)}
                                disabled={disabled}
                              >
                                {t('nfts.pic', { number: nftCount })}

                                {task && onChainCount < 5 && activeMint === index && (
                                  <div className='w-[80%] h-[11px] absolute bottom-[1px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#E546D8] via-[#7FC664] to-[#BEE110] blur-[7px]'></div>
                                )}
                              </button>
                            );
                          })}
                    </div>
                    <div className='mt-[23px] flex justify-center'>
                      <button
                        onClick={handleMintClick}
                        className='text-xs font-medium bg-[#FFFFFF1F] border-[#FFFFFF0F] rounded-[35px] px-[50px] py-[13px]'
                      >
                        {t('nfts.mint')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Background Image */}
              <div className='absolute -left-[1rem] top-[200px]'>
                <Image
                  priority={false}
                  src={profileBgGradient}
                  alt={''}
                  width={0}
                  height={0}
                  draggable={false}
                  sizes='100vw'
                  className='h-auto select-none'
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedOnchainTask && (
        <OnchainTaskPopup
          task={selectedOnchainTask}
          onClose={() => setSelectedOnchainTask(null)}
          onUpdate={handleTaskUpdate}
          onBack={() => handleViewChange('profile')}
        />
      )}
      <PassportPopup
        isOpen={isPassportOpen}
        onClose={handlePassportHide}
        onBack={handlePassportHide}
        ref={passportRef}
      />

      <BuyJOKPopup
        isOpen={showBuyJokPopup}
        onClose={() => setShowBuyJokPopup(false)}
        onBack={() => setShowBuyJokPopup(false)}
      />
    </div>
  );
}
