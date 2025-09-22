import { cn } from '@/lib/utils';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, className = '', loading = false, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block bg-gradient-to-r from-[#002601] via-[#016901] to-[#007b01] hover:from-[#016901] hover:via-[#007b01] hover:to-[#009b01] focus:ring-[#016901] text-white font-bold py-2 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
    >
      {loading ? <div className='animate-spin rounded-full h-3 w-3 border-b-2 border-white'></div> : children}
    </button>
  );
};

export default Button;
