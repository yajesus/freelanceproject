import { StaticImageData } from "next/image";
import Image from "next/image";
import { closedCard } from "../images";
import animation_1 from '../images/burning-card-blue-bg.json'
import animation_2 from '../images/burning-card-bg.json'
import Lottie from "lottie-react";
import { useEffect, useState } from "react";
import SmokeDissolveEffect from "./SmokeImage/SmokeDissolveEffect";

interface OpponentCardProps {
  isDropped: boolean;
  isFlipped: boolean;
  backSrc: StaticImageData;
  result: string;
  color: string;
}

export const OpponentCard = ({
  isDropped,
  isFlipped,
  backSrc,
  result,
  color,
}: OpponentCardProps) => {
  const [showShadow, setShowShadow] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [hasBeenDroppedOnce, setHasBeenDroppedOnce] = useState(false);

  useEffect(() => {
    setShowShadow(false);
    setShowSmoke(false);
  }, [result]);

  useEffect(() => {
    if (isDropped && !hasBeenDroppedOnce) {
      setHasBeenDroppedOnce(true);
    }

    if (!isDropped && hasBeenDroppedOnce) {
      setHasBeenDroppedOnce(false);
    }
  }, [isDropped, hasBeenDroppedOnce]);

  useEffect(() => {
    if (!isDropped || !isFlipped) return;
    let timeout: NodeJS.Timeout;

    if (result === "0-1") {
      timeout = setTimeout(() => setShowShadow(true), 1100);
    } else if (result === "1-0") {
      timeout = setTimeout(() => setShowSmoke(true), 1100);
    }

    return () => clearTimeout(timeout);
  }, [isDropped, isFlipped, result]);

  return (
    <div
      className="w-[66px] h-[91px] cursor-pointer absolute"
      style={{
        perspective: "1000px",
        transform: hasBeenDroppedOnce
          ? `translate(0, -53%) scale(0.8)`
          : "none",
        top: hasBeenDroppedOnce ? "50%" : "44.5%",
        right: hasBeenDroppedOnce ? "30%" : "0%",
        transitionDuration: !hasBeenDroppedOnce ? "1s" : "none",
      }}
    >
      {showShadow && (
        <div
          className="absolute transform left-1/2 -translate-x-1/2 top-2 w-[44px] h-[61px] z-0 animate-fadeIn"
          style={{
            filter: `drop-shadow(0px 0px 20px ${color}) drop-shadow(0px 0px 40px ${color})`,
            boxShadow: `0px 0px 20px 10px ${color}, 0px 0px 10px 0px ${color}`,
            border: `1px solid ${color}`,
          }}
        >
           <Lottie
            animationData={color === "blue" ? animation_1 : animation_2}
            loop={false}
            autoplay={true}
            style={{
              maxWidth: "140px", //170
              width: "120px", //150
              height: "110px", //140
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -48%)",
              zIndex: 0,
            }}
          />
          {/* <Image
            priority={false}
            src={color == "blue" ? burningCardBlueBg : burningCardBg}
            alt="not found"
            className={`absolute transform z-0 left-1/2 -translate-x-1/2 top-1/2 -translate-y-[48%]`}
            style={{
              maxWidth: "140px", //170
              width: "120px", //150
              height: "110px", //140
            }}
          /> */}
        </div>
      )}

      {showSmoke ? (
        <SmokeDissolveEffect image={backSrc} position="" />
      ) : (
        <div
          className="absolute w-full h-full transition-transform duration-1000 ease-out"
          style={{
            opacity: isDropped ? 1 : 0,
          }}
        >
          <div
            className="relative w-full h-full transition-transform duration-1000 ease-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="absolute w-full h-full"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <Image
                priority={false}
                src={backSrc}
                alt="Back Side"
                width={66}
                height={91}
              />
            </div>
            <div
              className="absolute w-full h-full"
              style={{ backfaceVisibility: "hidden" }}
            >
              <Image
                priority={false}
                src={closedCard}
                alt="Front Side"
                width={66}
                height={91}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
