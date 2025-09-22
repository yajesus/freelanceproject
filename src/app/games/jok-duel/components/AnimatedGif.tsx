import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";

interface AnimatedGifProps {
  src: any; 
  isPlaying: boolean;
  repeat?: "infinite" | "once";
  onAnimationEnd?: () => void;
  width?: number;
  height?: number;
  className?: string;
}

export const AnimatedGif: React.FC<AnimatedGifProps> = ({
  src,
  isPlaying,
  repeat = "infinite",
  onAnimationEnd,
  width = 315,
  height = 315,
  className,
}) => {
  const lottieRef = useRef<any>(null);
  const [shouldPlay, setShouldPlay] = useState(isPlaying);

  useEffect(() => {
    if (isPlaying) {
      setShouldPlay(true);
      if (repeat === "once") {
        const timeout = setTimeout(() => {
          setShouldPlay(false);
          onAnimationEnd?.();
        }, 2000); 
        return () => clearTimeout(timeout);
      }
    }
  }, [isPlaying, src]);

  if (!shouldPlay) return null;

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={src}
      loop={repeat === "infinite"}
      autoplay={true}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`pointer-events-none select-none ${className ?? ""}`}
    />
  );
};
