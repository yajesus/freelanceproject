import React from 'react';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

interface ButtonProps {
  children: React.ReactNode;
  imageSrc: any;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
  imgSize?: {
    width: number;
    height: number;
  };
  active: boolean;
}

const AirButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = '',
  loading = false,
  imageSrc,
  imgSize,
  active = false
}) => {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        `max-w-[150px] w-full  flex gap-1 items-center from-[#002601] via-[#016901] to-[#007b01] hover:from-[#016901] hover:via-[#007b01] hover:to-[#009b01] focus:ring-[#016901]  font-bold  rounded-[30px] shadow-lg transition duration-300 ease-in-out focus:outline-none`,
        active ? 'bg-[#FFFFFF38] text-white' : 'bg-[#FFFFFF0F] text-[#FFFFFFB2]',
        className
      )}
      disabled={loading}
    >
      <Image priority={false} src={imageSrc} alt={''} width={imgSize?.width || 42} height={imgSize?.height || 42} />
      {children}
    </button>
  );
};

export default AirButton;
