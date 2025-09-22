'use client';

import { useEffect, useRef, useState } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

const LottieOverlay: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(true);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/animations/claim.json'
      });
    }

    return () => {
      animationRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]'>
      <div ref={containerRef} className='w-full  h-screen transform rotate-180' />
    </div>
  );
};

export default LottieOverlay;
