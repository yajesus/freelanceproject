import React from 'react';

interface ProgressBarProps {
  progress: number;
  total: number;
}

const ProgressBar = ({ progress, total }: ProgressBarProps) => {
  const percentage = Math.min((progress / total) * 100, 100);
  return (
    <div className='w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-2'>
      <div className='h-full bg-green-600 transition-all' style={{ width: `${percentage}%` }} />
    </div>
  );
};

export default ProgressBar;
