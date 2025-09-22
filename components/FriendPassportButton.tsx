// components/FriendPassportButton.tsx

import React, { useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import PassportPopup from './popups/PassportPopup';
import { passport } from '@/images';
import Image from 'next/image';

interface FriendPassportButtonProps {
  userId: string; // The Telegram ID of the friend
  button?: React.ReactNode;
}

const FriendPassportButton: React.FC<FriendPassportButtonProps> = ({ userId, button }) => {
  const [isPassportOpen, setIsPassportOpen] = useState(false);

  const handleViewPassport = () => {
    triggerHapticFeedback(window);
    setIsPassportOpen(true);
  };

  const handleClose = () => {
    setIsPassportOpen(false);
  };

  return (
    <>
      {button ? (
        <button onClick={handleViewPassport} className='flex items-center justify-center w-12 h-12'>
          {button}
        </button>
      ) : (
        <button onClick={handleViewPassport} className='flex items-center justify-center w-12 h-12'>
          <Image priority={false} src={passport} alt='Pasport' className='w-full h-full' />
        </button>
      )}

      {isPassportOpen && (
        <PassportPopup isOpen={isPassportOpen} onClose={handleClose} onBack={handleClose} userId={userId} />
      )}
    </>
  );
};

export default FriendPassportButton;
