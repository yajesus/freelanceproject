// components/PassportSharer.tsx

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { TELEGRAM_STORY_TEXT } from '@/utils/consts';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { useGameStore } from '@/utils/game-mechanics';
import Image from 'next/image';
import { telegramIcon } from '@/images';
import { useTranslations } from 'next-intl';
import { getUserTelegramId } from '@/utils/user';

interface PassportSharerProps {
  className?: string;
  passportRef?: React.RefObject<HTMLDivElement>;
}

const PassportSharer: React.FC<PassportSharerProps> = ({ className = '', passportRef = null }) => {
  const t = useTranslations('Profile');
  const [isSharing, setIsSharing] = useState(false);
  const { userTelegramInitData } = useGameStore();
  const showToast = useToast();

  const handleStoryShare = async () => {
    triggerHapticFeedback(window);
    setIsSharing(true);

    try {
      // Give a small delay for the DOM to update
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Wait for passport to load and render
      const waitForPassport = () => {
        return new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 20;

          const checkPassport = () => {
            attempts++;

            if (passportRef?.current && passportRef.current.children.length > 0) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Passport failed to load'));
            } else {
              setTimeout(checkPassport, 500);
            }
          };

          checkPassport();
        });
      };

      await waitForPassport();

      if (!passportRef?.current) {
        throw new Error('Passport passportRef is null');
      }

      const canvas = await html2canvas(passportRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 2,
        width: 340,
        height: 600
      });

      canvas.toBlob(async (blob) => {
        try {
          if (!blob) {
            throw new Error('Failed to create image');
          }

          const formData = new FormData();
          formData.set('initData', userTelegramInitData);
          formData.set('file', blob);

          const response = await fetch('/api/user/passport', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const data = await response.json();

          // Share to Telegram story
          if (typeof window !== 'undefined') {
            const WebApp = (await import('@twa-dev/sdk')).default;
            WebApp.ready();

            // Generate user's referral link
            const userTelegramId = getUserTelegramId(userTelegramInitData);
            const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
            const inviteLink = botUsername
              ? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/${
                  process.env.NEXT_PUBLIC_APP_URL_SHORT_NAME
                }?startapp=kentId${userTelegramId || ''}`
              : 'https://t.me/JOKQuestsBot';

            // Replace placeholder with actual link
            const storyText = TELEGRAM_STORY_TEXT?.replace('[YOUR_AFFILIATE_LINK]', inviteLink);

            WebApp.shareToStory(data.url, {
              text: storyText
            });

            showToast('Story shared successfully!', 'success');
          }
        } catch (error) {
          console.error('Error sharing story:', error);
          showToast('Error sharing story', 'error');
        } finally {
          setIsSharing(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error in share process:', error);
      showToast(t('errorSharingPassport'), 'error');
      setIsSharing(false);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleStoryShare}
      className={`relative rounded-full flex justify-center items-center ${className}`}
      disabled={isSharing || !passportRef}
    >
      {isSharing && (
        <div className='absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 rounded-full'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
        </div>
      )}
      <div className='w-[87px] h-[87px] overflow-hidden rounded-full relative flex justify-center items-center'>
        <div
          className={`rounded-full mx-auto telegram_qr absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
        ></div>
        <div className='relative z-10 w-[50px] h-[50px] flex flex-col items-center bg-black rounded-full mb-[10px]'>
          <p className='text-[6px] text-nowrap'>{t('telegramShare.share')}</p>
          <Image priority={false} src={telegramIcon} alt={''} width={22} height={22} className='mt-[4px]' />
          <p className='text-[8.5px] mt-[4px]'>{t('telegramShare.telegram')}</p>
          <p className='text-[6px] mt-[1px]'>{t('telegramShare.story')}</p>
        </div>
      </div>
    </button>
  );
};

export default PassportSharer;
