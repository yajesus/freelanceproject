import Image, { StaticImageData } from "next/image";
import { useEffect, useMemo, useState } from "react";
import animation_1 from '../images/burning-card-blue-bg.json'
import animation_2 from '../images/burning-card-bg.json'
import Lottie from "lottie-react";
import {closedCard } from "../images";
import SmokeDissolveEffect from "./SmokeImage/SmokeDissolveEffect";

interface FlippingCardProps {
  backSrc: StaticImageData;
  position: string;
  canDrop: boolean;
  isFlipped: boolean;
  id: number;
  setFlippedCards: React.Dispatch<React.SetStateAction<any[]>>;
  round: number;
  isDrop: boolean;
  color: string;
  result: string;
  autoDrop: boolean;
  hasCardBeenDropped: boolean;
  setHasCardBeenDropped: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FlippingCard = ({
  backSrc,
  position,
  canDrop,
  isFlipped,
  id,
  setFlippedCards,
  isDrop,
  round,
  color,
  result,
  autoDrop,
  hasCardBeenDropped,
  setHasCardBeenDropped,
}: FlippingCardProps) => {
  const [isDropped, setIsDropped] = useState(isDrop);
  const [showShadow, setShowShadow] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);

  const dropPosition = useMemo(() => {
    return position === "first"
      ? `translate(37%, -53%) scale(0.8)`
      : position === "second"
        ? `translate(-80%, -53%) scale(0.8)`
        : `translate(-180%, -53%) scale(0.8)`;
  }, [round, position]);

  const handleClick = () => {
    if (!canDrop || isDropped || hasCardBeenDropped) return;
    setIsDropped(true);
    setHasCardBeenDropped(true);
    setFlippedCards((prevCards: any[]) =>
      prevCards.map((card) =>
        card.id === id
          ? { ...card, isDropped: true, isFlipped: false }
          : { ...card, canDrop: false }
      )
    );
  };

  useEffect(() => {
    if (autoDrop && !hasCardBeenDropped) {
      handleClick();
    }
  }, [autoDrop, id, setFlippedCards]);

  useEffect(() => {
    if (result == "1-0" && isDropped && isFlipped && !showShadow) {
      setTimeout(() => {
        setShowShadow(true);
      }, 1100);
    }
    if (result == "0-1" && isDropped && isFlipped && !showShadow) {
      setTimeout(() => {
        setShowSmoke(true);
      }, 1100);
    }
  }, [result, isDropped, isFlipped]);

  useEffect(() => {
    if (isDropped) {
      setTimeout(() => {
        setFlippedCards((prevCards) =>
          prevCards.map((card) =>
            card.id === id ? { ...card, isFlipped: true } : card
          )
        );
      }, 1685);
    }
  }, [isDropped, id, setFlippedCards]);

  return (
    <div
      className={` w-[66px] h-[91px] cursor-pointer absolute`}
      style={{
        perspective: "1000px",
        transform: `${isDropped && dropPosition}`,
        transitionDuration: "1s",
        top: `${isDropped ? "50%" : "65%"}`,
      }}
      onClick={handleClick}
    >
      {showShadow && (
        <div
          className={`absolute transform top-2 w-[54px] h-[75px] z-0 animate-fadeIn`}
          style={{
            filter: `drop-shadow(0px 0px 20px ${color}) drop-shadow(0px 0px 40px ${color})`,
            boxShadow: `0px 0px 20px 10px ${color}, 0px 0px 10px 0px ${color}`,
            transform: isFlipped ? "translateX(14%)" : "translate(0, 0)",
            border: `1px solid ${color}`,
            animationDelay: "1s",
          }}
        >
          <Lottie
            animationData={color === "blue" ? animation_1 : animation_2}
            loop={false}
            autoplay={true}
            style={{
              width: 120,
              height: 110,
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -55%)",
              zIndex: 0,
            }}
          />

        </div>
      )}

      {showSmoke ? (
        <SmokeDissolveEffect image={backSrc} position="" />
      ) : (
        <div
          className="absolute w-full h-full transition-transform duration-1000 ease-out"
          style={{
            transition: "transform 1s cubic-bezier(0.32, 1.25, 0.375, 1.15)",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            className="relative w-full h-full transition-transform duration-1000 ease-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 1s ease-in-out",
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
                width={88}
                height={111}
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
