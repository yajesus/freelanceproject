import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { shopImageMap, tonLogo } from '@/images';
import { ShopItem } from '@/utils/types';
import { formatNumber, formatFloat } from '@/utils/ui';
import { memo, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ShopViewProps {
  items: ShopItem[];
  handleBuyItem: (item: ShopItem) => Promise<void>;
  handleBuyWithTonItem: (item: ShopItem, number: number) => Promise<void>;
  tonPriceInUSD: number;
}

const ItemButton = memo(
  ({
    item,
    handleBuyItem,
    handleBuyWithTonItem,
    isLoading,
    isPurchasing,
    tonPriceInUSD
  }: {
    item: ShopItem;
    handleBuyItem: (item: ShopItem) => Promise<void>;
    handleBuyWithTonItem: (item: ShopItem, price: number) => Promise<void>;
    isLoading: boolean;
    isPurchasing: boolean;
    tonPriceInUSD: number;
  }) => {
    const t = useTranslations('Shop');
    const price = item.price;
    const usdPrice = price * 0.025;
    const tonPrice = usdPrice / tonPriceInUSD;

    return (
      <div className='flex flex-col'>
        <div className='bg-gradient-to-b from-[#000000] to-[#666666] bg-clip-border p-px rounded-full'>
          <button
            onClick={() => handleBuyItem(item)}
            disabled={isLoading || isPurchasing}
            className={`w-full flex items-center justify-center gap-[5px] whitespace-nowrap bg-gradient-to-tr from-[#000000] to-[#666666] px-[10px] py-[6px] rounded-full transition-opacity ${
              isLoading || isPurchasing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Image priority={false} src={'/star.png'} alt='Telegram Star' width={11} height={11} />
            )}
            <span className='text-xs font-medium text-white'>{formatNumber(item.price)}</span>
          </button>
        </div>
        <div className='mt-2 bg-gradient-to-b from-[#000000] to-[#666666] bg-clip-border p-px rounded-full'>
          <button
            onClick={() => handleBuyWithTonItem(item, tonPrice * 0.9)}
            disabled={isLoading || isPurchasing}
            className={`w-full min-w-[70px] flex items-center flex-col justify-center gap-[4px] whitespace-nowrap bg-gradient-to-tr from-[#000000] to-[#666666] px-[12px] py-[6px] rounded-full transition-opacity ${
              isLoading || isPurchasing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className='flex space-x-[5px] items-center'>
              {isLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : null}
              <Image priority={false} src={tonLogo} alt='-10% Off' width={16} height={16} className='w-4 h-4' />
              <span className='text-xs font-semibold'>{formatFloat(tonPrice * 0.9)}</span>
              <div className='absolute top-[-15px] left-[-20px] flex flex-col items-start'>
                <div className='flex items-center space-x-1 rounded-full bg-gradient-to-tr from-[#000000] to-[#666666] px-[6px] py-[3px] bg-clip-border border border-[#2D2D2D]'>
                  <Image src='/discount.png' alt='-10% Off' className='w-6 h-5' width={28} height={24} />
                  <p className='text-[10px] text-white font-semibold ml-1 mt-[-2px]'>{t('onlyTONPayment')}</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }
);

const ItemDetails = memo(
  ({
    item,
    handleBuyItem,
    handleBuyWithTonItem,
    isLoading,
    isPurchasing,
    tonPriceInUSD
  }: {
    item: ShopItem;
    handleBuyItem: (item: ShopItem) => Promise<void>;
    handleBuyWithTonItem: (item: ShopItem, price: number) => Promise<void>;
    isLoading: boolean;
    isPurchasing: boolean;
    tonPriceInUSD: number;
  }) => {
    const t = useTranslations('Shop');
    return (
      <div className='flex items-start gap-6'>
        <Image
          priority={false}
          src={shopImageMap[item.image]}
          alt={item.name}
          className={`${item.category === 'BOOST' ? 'w-[97px] h-[97px]' : 'w-[64px] h-[64px]'} rounded-lg`}
        />
        <div className='flex flex-col gap-2 flex-grow'>
          <div className='flex gap-[10px] justify-between'>
            <p className={`text-left ${item.category === 'BOOST' ? 'text-base' : 'text-sm'} text-white font-medium`}>
              {t(item.name)}
            </p>
            <ItemButton
              item={item}
              handleBuyItem={handleBuyItem}
              handleBuyWithTonItem={handleBuyWithTonItem}
              isLoading={isLoading}
              isPurchasing={isPurchasing}
              tonPriceInUSD={tonPriceInUSD}
            />
          </div>
          <span className={`font-medium ${item.category === 'BOOST' ? 'text-sm' : 'text-xs'} text-[#9C9C9C] text-left`}>
            {t(item.description)}
          </span>
        </div>
      </div>
    );
  }
);

const ShopItemCard = memo(
  ({
    item,
    handleBuyItem,
    handleBuyWithTonItem,
    isLoading,
    isPurchasing,
    tonPriceInUSD
  }: {
    item: ShopItem;
    handleBuyItem: (item: ShopItem) => Promise<void>;
    handleBuyWithTonItem: (item: ShopItem) => Promise<void>;
    isLoading: boolean;
    isPurchasing: boolean;
    tonPriceInUSD: number;
  }) => {
    return (
      <div className='w-full flex justify-between items-center bg-[#080808] border border-[#2D2D2D] rounded-2xl p-[10px] relative gap-4'>
        <ItemDetails
          item={item}
          handleBuyItem={handleBuyItem}
          handleBuyWithTonItem={handleBuyWithTonItem}
          isLoading={isLoading}
          isPurchasing={isPurchasing}
          tonPriceInUSD={tonPriceInUSD}
        />
      </div>
    );
  }
);

export default function ShopView({ items, handleBuyItem, handleBuyWithTonItem, tonPriceInUSD }: ShopViewProps) {
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  const buyItem = async (item: ShopItem) => {
    if (processingItemId) return;
    setProcessingItemId(item.id);
    try {
      await handleBuyItem(item);
    } finally {
      setProcessingItemId(null);
    }
  };

  const buyWithTonItem = async (item: ShopItem) => {
    if (processingItemId) return;
    setProcessingItemId(item.id);
    try {
      const usdPrice = item.price * 0.025;
      const tonPrice = usdPrice / tonPriceInUSD;
      const discountedPrice = tonPrice * 0.9;
      await handleBuyWithTonItem(item, discountedPrice);
    } finally {
      setProcessingItemId(null);
    }
  };

  const isPurchasing = processingItemId !== null;

  return (
    <div className='space-y-4'>
      {items.map((item) => (
        <ShopItemCard
          key={item.id}
          item={item}
          handleBuyItem={buyItem}
          handleBuyWithTonItem={buyWithTonItem}
          isLoading={processingItemId === item.id}
          isPurchasing={isPurchasing}
          tonPriceInUSD={tonPriceInUSD}
        />
      ))}
    </div>
  );
}
