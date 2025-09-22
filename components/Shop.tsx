// components/Shop.tsx

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGameStore } from '@/utils/game-mechanics';
import TopInfoSection from './TopInfoSection';
import { capitalizeFirstLetter, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { ShopItem } from '@/utils/types';
import ShopView from './shop/shopView';
import ShopViewWithTabs from './shop/shopViewWithTabs';
import { useToast } from '@/contexts/ToastContext';
import Image from 'next/image';
import { MAX_YIELD_HOURS } from '@/utils/consts';
import { formatTime } from '@/lib/utils';
import BoostTimer from './shop/BoostTimer';
import BoostRewardDisplay from './shop/BoostRewardDisplay';
import StarSelectionPopup from './popups/StarSelectionPopup';
import { useShop } from '@/hooks/useShop';

enum ShopCategory {
  AVATAR = 'AVATAR',
  BACKGROUND = 'BACKGROUND',
  BOOST = 'BOOST',
  OTHERS = 'OTHERS'
}

interface Category {
  name: string;
  items: ShopItem[];
}

interface ShopPageProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  handleOpenWithdrawalPopup?: () => void;
}

interface PurchaseResponse {
  success: boolean;
  data?: any;
  message?: string;
}

// Shop Page Component
const ShopPage: React.FC<ShopPageProps> = ({ currentView, setCurrentView, handleOpenWithdrawalPopup }) => {
  const t = useTranslations('Shop');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [popupMode, setPopupMode] = useState<'spend' | 'topup' | 'ton'>('spend');
  const [showStarPopup, setShowStarPopup] = useState<boolean>(false);
  const [tonPriceInUSD, setTonPriceInUSD] = useState(0);

  const { shopItems, isLoading, fetchShopItems } = useShop();

  const getTonPriceInUSD = async () => {
    const res = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
    const data = await res.json();
    const price = data?.rates?.TON?.prices?.USD || 0;
    setTonPriceInUSD(price);
  };

  const {
    userTelegramInitData,
    bonusYieldPerHour,
    bonusOfflineYieldDuration,
    activeOfflineBoostEndTime,
    activeRewardBoostEndTime,
    activeRewardBoostMultiplier,
    totalStars,
    setTotalStars,
    setEarnedStars,
    addToInventory,
    setEquippedAvatar,
    setEquippedWallpaper,
    setBonusOfflineYieldDuration,
    setBonusYieldPerHour,
    setOfflineBoost,
    setRewardBoost,
    incrementFakeFriends
  } = useGameStore();

  const showToast = useToast();
  const categories = Object.values(ShopCategory);

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
    fetchShopItems();
    getTonPriceInUSD();
  }, []);

  // Group shop items by category
  const groupedShopItems = useMemo(() => {
    const grouped = shopItems.reduce<Record<string, Category>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          name: capitalizeFirstLetter(item.category),
          items: []
        };
      }
      acc[item.category].items.push(item);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [shopItems]);

  // Initialize active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Filter items by active category
  const filteredShopItems = useMemo(() => {
    if (!activeCategory) {
      return groupedShopItems.map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.price - b.price)
      }));
    }

    const filtered = groupedShopItems
      .filter((cat) => cat.name === activeCategory)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.price - b.price)
      }));
    return filtered;
  }, [activeCategory, groupedShopItems]);

  // Purchase handling
  const handleBuyItem = async (item: ShopItem) => {
    if (totalStars > 0 && !item.isBasic) {
      setSelectedItem(item);
      setPopupMode('spend');
      setShowStarPopup(true);
      return;
    }
    await processPurchase(item);
  };

  const handleBuyWithTonItem = async (item: ShopItem) => {
    setSelectedItem(item);
    setPopupMode('ton');
    setShowStarPopup(true);
  };

  const handleStarConfirm = async (starsToUse: number, internal?: boolean) => {
    if (popupMode === 'spend' && selectedItem) {
      await processPurchase(selectedItem, starsToUse);
    } else if (popupMode === 'topup') {
      if (internal) handleInternalTopUpProcess(starsToUse);
      else await handleTopUpProcess(starsToUse);
    } else if (popupMode === 'ton') {
      if (selectedItem) {
        starsToUse = 0;
        const result = await processItemPurchase(selectedItem, starsToUse);

        if (result.success) {
          // Apply item effects based on category
          if (selectedItem.category === 'AVATAR') {
            setBonusYieldPerHour(bonusYieldPerHour + 5);
          } else if (selectedItem.category === 'BACKGROUND') {
            setBonusOfflineYieldDuration(bonusOfflineYieldDuration + 30);
          } else if (selectedItem.category === 'BOOST') {
            const boost = result.data.boost;
            if (boost.boostType === 'offline') {
              setOfflineBoost(boost.activeOfflineBoostDuration, boost.activeOfflineBoostEndTime);
            } else if (boost.boostType === 'rewards') {
              setRewardBoost(boost.activeRewardBoostMultiplier, boost.activeRewardBoostEndTime);
            }
          } else if (selectedItem.category === 'OTHERS' && selectedItem.name.includes('friend')) {
            incrementFakeFriends(result.data.friends?.fakeFriendsAdded || 0);
          }

          if (starsToUse > 0) {
            setTotalStars(result.data.remainingStars);
            setEarnedStars(result.data.remainingEearnedStars);
          }

          addToInventory(result.data.userInventoryItem);
          showToast(t('PurchaseSuccessful'), 'success');
        } else {
          throw new Error(result.message || t('purchaseFailed'));
        }
      }
    }
    setShowStarPopup(false);
    setSelectedItem(null);
  };

  const processPurchase = async (item: ShopItem, starsToUse: number = 0) => {
    try {
      if (typeof window === 'undefined') return;

      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.ready();

      let invoiceResult = false;

      // Handle payment based on stars usage
      if (!starsToUse) {
        // Regular payment
        invoiceResult = await new Promise<boolean>((resolve, reject) => {
          if (!item.invoiceUrl) {
            reject(new Error(t('invoiceUrlNotFound')));
            return;
          }

          WebApp.openInvoice(item.invoiceUrl, (status: string) => {
            status === 'paid' ? resolve(true) : reject(new Error(t('paymentNotCompleted')));
          });
        });
      } else if (starsToUse > 0) {
        // Discounted payment with stars
        const response = await fetch('/api/tg-invoice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userTelegramInitData,
            shopItemId: item.id,
            discount: starsToUse
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error generating invoice');
        }

        if (starsToUse >= item.price) {
          invoiceResult = true;
        } else {
          invoiceResult = await new Promise<boolean>((resolve, reject) => {
            if (!data.invoiceLink) {
              reject(new Error(t('invoiceUrlNotFound')));
              return;
            }

            WebApp.openInvoice(data.invoiceLink, (status: string) => {
              status === 'paid' ? resolve(true) : reject(new Error(t('paymentNotCompleted')));
            });
          });
        }
      }

      if (invoiceResult) {
        const result = await processItemPurchase(item, starsToUse);

        if (result.success) {
          // Apply item effects based on category
          if (item.category === 'AVATAR') {
            setBonusYieldPerHour(bonusYieldPerHour + 5);
          } else if (item.category === 'BACKGROUND') {
            setBonusOfflineYieldDuration(bonusOfflineYieldDuration + 30);
          } else if (item.category === 'BOOST') {
            const boost = result.data.boost;
            if (boost.boostType === 'offline') {
              setOfflineBoost(boost.activeOfflineBoostDuration, boost.activeOfflineBoostEndTime);
            } else if (boost.boostType === 'rewards') {
              setRewardBoost(boost.activeRewardBoostMultiplier, boost.activeRewardBoostEndTime);
            }
          } else if (item.category === 'OTHERS' && item.name.includes('friend')) {
            incrementFakeFriends(result.data.friends?.fakeFriendsAdded || 0);
          }

          if (starsToUse > 0) {
            setTotalStars(result.data.remainingStars);
            setEarnedStars(result.data.remainingEearnedStars);
          }

          addToInventory(result.data.userInventoryItem);
          showToast(t('PurchaseSuccessful'), 'success');
        } else {
          throw new Error(result.message || t('purchaseFailed'));
        }
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error processing purchase', 'error');
    }
  };

  const processItemPurchase = async (item: ShopItem, starsToUse: number = 0): Promise<PurchaseResponse> => {
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          itemId: item.id,
          starsToUse
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t('purchaseErrorDB'));

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : t('unexpectedError')
      };
    }
  };

  const handleEquipItem = async (item: ShopItem) => {
    try {
      const response = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          itemId: item.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t('equipErrorDB'));

      // Update UI based on item category
      if (item.category === 'AVATAR') {
        setEquippedAvatar(item.image);
      } else if (item.category === 'BACKGROUND') {
        setEquippedWallpaper(item.image);
      }

      showToast(t('equippedSuccessfully'), 'success');
    } catch (error) {
      console.error('Equip error:', error);
      showToast(t('unexpectedError'), 'error');
    }
  };

  // Show star topup popup
  const handleTopUpBalance = () => {
    setPopupMode('topup');
    setShowStarPopup(true);
  };

  // Process star topup
  const handleTopUpProcess = async (topupAmount: number) => {
    try {
      const response = await fetch('/api/user/star-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          topupAmount
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t('topUpError'));

      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.ready();
      WebApp.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          setTotalStars(totalStars + topupAmount);
          showToast(t('topUpSuccess'), 'success');
        } else {
          showToast(t('paymentNotCompleted'), 'error');
        }
      });
    } catch (error) {
      console.error('Top up error:', error);
      showToast(t('unexpectedError'), 'error');
    }
  };

  const handleInternalTopUpProcess = async (topupAmount: number) => {
    try {
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (!telegramUser || !telegramUser.id) {
        throw new Error('Telegram user ID not found.');
      }

      const telegramId = telegramUser.id;
      await fetch('/api/user/set-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramId.toString(),
          stars: topupAmount
        })
      });
      setTotalStars(totalStars + topupAmount);
      showToast(t('topUpSuccess'), 'success');
    } catch (error) {
      console.error('Top up error:', error);
      showToast(t('unexpectedError'), 'error');
    }
  };

  // Close the popup
  const handleClosePopup = () => {
    setShowStarPopup(false);
    setSelectedItem(null);
  };

  return (
    <div className='bg-black flex justify-center safe-min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <TopInfoSection setCurrentView={setCurrentView} handleOpenWithdrawalPopup={handleOpenWithdrawalPopup} />

        <div className='h-screen mt-4 bg-gradient-airdrop-page-header backdrop-blur-[18.5px] rounded-t-[48px] relative top-glow z-0'>
          <div className='bg-[#080808] flex-grow mt-[2px] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='px-4 pt-1 pb-[calc(90px+1.5rem+40px+55px)] margin-safe-area-top margin-safe-area-bottom'>
              {/* Stats Section */}
              <div
                className='mt-[27px] w-full p-px rounded-[54px] relative'
                style={{
                  background: 'linear-gradient(to bottom, #000000, #666666) padding-box'
                }}
              >
                <div className='relative z-10 w-full flex justify-around items-center px-[16px] py-[9px] rounded-[54px] bg-gradient-to-r from-[#282828] to-[#080808]'>
                  {/* Stars */}
                  <div className='flex justify-center gap-[2.4px]'>
                    <p className='text-sm'>+</p>
                    <div className='flex flex-col items-center gap-[1.61px]'>
                      <Image priority={false} src='/star.png' alt='Total Stars' width={19.2} height={17.99} />
                      <p className='text-xs text-right'>{totalStars}</p>
                    </div>
                  </div>

                  {/* Offline Rewards */}
                  <div className='border-x border-[#FFFFFF40] px-[11px] flex justify-center gap-[6px] max-w-[145px] w-full'>
                    {/* <Image
                      priority={false}
                      src="/offline-rewards-icon.png"
                      alt=""
                      width={20}
                      height={20}
                    /> */}
                    <div className='flex flex-col items-center'>
                      <p className='text-white text-xs font-medium'>{t('offlineRewards')}</p>
                      <p className='text-white text-[10px] font-bold'>
                        {formatTime(
                          (MAX_YIELD_HOURS + (bonusOfflineYieldDuration ? bonusOfflineYieldDuration / 60 : 0)) *
                            60 *
                            60 *
                            1000,
                          'S'
                        )}
                      </p>
                      <BoostTimer endTime={activeOfflineBoostEndTime} />
                    </div>
                  </div>

                  {/* Reward Boosts */}
                  <div className='max-w-[111px] w-full pl-[4px] flex justify-center'>
                    {/* <Image
                      priority={false}
                      src="/boost-rewards-icon.png"
                      alt="Reward Boost"
                      width={20}
                      height={20}
                    /> */}
                    <div className='flex flex-col items-center text-center'>
                      <p className='text-white text-xs font-medium'>{t('boostRewards')}</p>
                      <p className='text-white text-[10px] font-bold'>
                        {bonusYieldPerHour ? `+${bonusYieldPerHour}%` : '0'}
                        {activeRewardBoostMultiplier && activeRewardBoostMultiplier !== 0 && (
                          <BoostRewardDisplay
                            value={activeRewardBoostMultiplier * 100}
                            endTime={activeRewardBoostEndTime}
                          />
                        )}
                      </p>
                      <BoostTimer endTime={activeRewardBoostEndTime} />
                    </div>
                  </div>
                </div>
                <div className='absolute left-1/2 -translate-x-1/2 bottom-0 w-[80%] h-[20px] bg-gradient-to-r from-[#E546D8] via-[#A6DA93] to-[#BEE110] blur-[14.2px]'></div>
              </div>

              <div className='flex justify-center items-center my-5'>
                <button
                  onClick={handleTopUpBalance}
                  className='relative flex items-center gap-2 px-[12px] py-[15px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs'
                >
                  <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-black w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
                  <Image
                    priority={false}
                    src='/star.png'
                    alt='Shop Icon'
                    width={20}
                    height={20}
                    className='relative z-20'
                  />
                  <span className='relative z-40 text-nowrap'>{t('topupBalance')}</span>
                </button>
              </div>

              {/* Category Tabs */}
              <div className='p-[3px] flex justify-between rounded-[54px] overflow-hidden bg-[#1E2023]'>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`text-sm font-medium px-[13px] py-[7px] rounded-[29px] border transition ${
                      activeCategory === category
                        ? 'bg-black text-[#FFFFFF] border-[#2e2e2e]'
                        : 'text-[#BBBCBD] border-transparent'
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {t(category)}
                  </button>
                ))}
              </div>

              {/* Shop Items */}
              <div className='mt-[30px] mb-3'>
                {isLoading ? (
                  <div className='text-center text-gray-400'>{t('loading')}</div>
                ) : !filteredShopItems.length ? (
                  <div className='text-center text-gray-400'>{t('noItems')}</div>
                ) : (
                  filteredShopItems.map((category) =>
                    ['AVATAR', 'BACKGROUND'].includes(category.name) ? (
                      <ShopViewWithTabs
                        key={category.name}
                        items={category.items}
                        handleBuyItem={handleBuyItem}
                        handleBuyWithTonItem={handleBuyWithTonItem}
                        handleEquipItem={handleEquipItem}
                        tonPriceInUSD={tonPriceInUSD}
                      />
                    ) : (
                      <ShopView
                        key={category.name}
                        items={category.items}
                        handleBuyItem={handleBuyItem}
                        handleBuyWithTonItem={handleBuyWithTonItem}
                        tonPriceInUSD={tonPriceInUSD}
                      />
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {showStarPopup && (
          <StarSelectionPopup
            onClose={handleClosePopup}
            onConfirm={handleStarConfirm}
            selectedItem={selectedItem || undefined}
            mode={popupMode}
            maxStars={popupMode === 'topup' ? 1000 : undefined}
            title={popupMode === 'spend' ? 'spending' : 'adding'}
            onBack={handleClosePopup}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(ShopPage);
