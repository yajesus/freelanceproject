import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { TELEGRAM_STORY_TEXT } from '@/utils/consts';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { useGameStore } from '@/utils/game-mechanics';
import PassportPopup from './popups/PassportPopup';
import { getUserTelegramId } from '@/utils/user';
import { useTranslations } from 'next-intl';

interface StoryTaskSharerProps {
  buttonText?: string;
  className?: string;
  onShare?: () => void;
  onShareStart?: () => Promise<void>;
  onPassportReady?: () => void;
  disabled?: boolean;
}

const StoryTaskSharer: React.FC<StoryTaskSharerProps> = ({
  buttonText = ' ',
  className = '',
  onShare = () => {},
  onShareStart = async () => {},
  onPassportReady = () => {},
  disabled = false
}) => {
  const t = useTranslations('PassportPopup');
  const [isSharing, setIsSharing] = useState(false);
  const [isPassportReady, setIsPassportReady] = useState(false);
  const { userTelegramInitData } = useGameStore();
  const passportRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();

  useEffect(() => {
    if (passportRef.current && passportRef.current.children.length > 0 && !isSharing) {
      setIsPassportReady(true);
      onPassportReady();
    }
  }, [isSharing, onPassportReady]);

  const handleStoryShare = async () => {
    if (!isPassportReady || disabled) return;

    triggerHapticFeedback(window);
    setIsSharing(true);

    try {
      // Call onShareStart to start the task in the database
      await onShareStart();

      // Wait a bit to ensure passport is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!passportRef.current) {
        throw new Error(t('passportNotReady'));
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
            throw new Error(t('failedToCreateImage'));
          }

          const formData = new FormData();
          formData.set('initData', userTelegramInitData);
          formData.set('file', blob);

          const response = await fetch('/api/user/passport', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(t('failedToUploadImage'));
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

            // Wait for 5 seconds to ensure the story is shared
            await new Promise((resolve) => setTimeout(resolve, 5000));

            showToast(t('verifyingYourStory'), 'success');
            onShare();
          }
        } catch (error) {
          console.error('Error sharing story:', error);
          showToast(t('errorSharingStory'), 'error');
        } finally {
          setIsSharing(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error starting story task:', error);
      showToast(t('failedToStartStoryTask'), 'error');
      setIsSharing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleStoryShare}
        className={`relative ${className}`}
        disabled={isSharing || disabled || !isPassportReady}
      >
        {isSharing && (
          <div className='absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 rounded-xl'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
          </div>
        )}
        <span className='text-white text-sm font-bold'>
          {isSharing ? t('sharing') : !isPassportReady ? t('preparing') : buttonText}
        </span>
      </button>

      {/* Hidden PassportPopup for capturing */}
      <PassportPopup
        isOpen={false}
        onClose={() => {}} // Don't allow closing during task
        onBack={() => {}} // Don't allow back during task
        ref={passportRef}
      />
    </>
  );
};

export default StoryTaskSharer;
