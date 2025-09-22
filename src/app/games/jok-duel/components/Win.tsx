import { useCallback, useEffect, useRef, useState } from "react";
import { congratsTop, starIcon, winChestBg, winPrizeBg } from "../images";
import Image from "next/image";
import animationData from "@/public/chests/red_chest.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

import { GameHeader } from "./GameHeader";
import {
  formatNumber,
  showBackButton,
  triggerHapticFeedback,
} from "@/utils/ui";
import { JOK_POINTS, shopImageMap } from "@/images";

interface WinProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameUser: any;
  gameId: any;
}
const OPEN_ANIMATION_FRAMES: [number, number] = [10, 90];
const IDLE_ANIMATION_FRAMES: [number, number] = [0, 10];

const Win = ({ currentView, setCurrentView, gameUser, gameId }: WinProps) => {
  const [showGift, setShowGift] = useState(false);
  const earned = Number(localStorage.getItem("earned"));
  const chestAnimationRef = useRef<LottieRefCurrentProps | null>(null);
  const [animationStarted, setAnimationStarted] = useState(false);
  const hasPlayedFullAnimation = useRef(false);
  const clickLockRef = useRef(false);
  const [rewardImg, setRewardImg] = useState(null)
  const [game, setGame] = useState({
    status: "",
    round1: { me: 0, pc: 0 },
    round2: { me: 0, pc: 0 },
    round3: { me: 0, pc: 0 },
    prizeId: "",
    userId: "",
  });
  const [prize, setPrize] = useState({
    result: {
      stars: null as number[] | null,
      reward: null as string | null,
      multiplier: null,
    },
    type: null,
  });
  const [showPrize, setShowPrize] = useState({
    data: null,
    img: null
  });
  const [chestOpened, setChestOpened] = useState(false);
  const canClaim = true;
  const premiumAvatarOrBg = localStorage.getItem("premium") || "";
  const premiumName = localStorage.getItem("premiumName") || "";
  useEffect(() => {
    if (!chestOpened && chestAnimationRef.current) {
      chestAnimationRef.current.setSpeed(1);
      chestAnimationRef.current.playSegments(IDLE_ANIMATION_FRAMES, true);
    }
  }, [chestOpened]);


  useEffect(() => {
    const fetchGameResult = async () => {
      try {
        const response = await fetch(`/api/duelGame?gameId=${gameId.current}`);
        const data = await response.json();
        if (!response.ok) return;
        setGame(data.data);
      } catch (error) {
        console.error("Error fetching game data:", error);
      }
    };
    fetchGameResult();
  }, [gameId]);

  useEffect(() => {
    if (game?.prizeId) {
      const fetchPrize = async () => {
        try {
          const response = await fetch(`/api/prize?id=${game.prizeId}`);
          const data = await response.json();
          if (!response.ok) return;
          setPrize(data.data);
          setShowPrize({
            data: data.data,
            img: data.data.result.reward,
          });
        } catch (error) {
          console.error("Error fetching prize data:", error);
        }
      };
      fetchPrize();
    }
  }, [game]);

  useEffect(() => {
    if (showPrize.img) {
      switch (showPrize.img) {
        case "12h offline boost":
          setRewardImg(shopImageMap["boost12h"])
          break;
        case "2-day offline boost":
          setRewardImg(shopImageMap["boost2day"])
          break;
        case "12h reward boost":
          setRewardImg(shopImageMap["boost12hReward"])
          break;
        case "3 mini-friends":
          setRewardImg(shopImageMap["friendThree"])
          break;
        case "5 mini-friends":
          setRewardImg(shopImageMap["friendFive"])
          break;
        case "7-day boost":
          setRewardImg(shopImageMap["boost1week"])
          break;
        case "Premium Avatar":
          setRewardImg(shopImageMap[premiumAvatarOrBg])
          break;
        case "Premium Background":
          setRewardImg(shopImageMap[premiumAvatarOrBg])
          break;
        default:
          setRewardImg(null)
      }
    }
  }, [showPrize])

  const handleOpenChest = () => {
    try {
      if (showGift) {
        setCurrentView("onboarding");
        clickLockRef.current = true;
        return;
      }

      if (clickLockRef.current) {
        chestAnimationRef?.current?.goToAndStop(90, true);
        chestAnimationRef?.current?.pause();
        setShowGift(true);
        hasPlayedFullAnimation.current = true;
        clickLockRef.current = false;
        return;
      }

      if (!canClaim) {
        clickLockRef.current = false;
        return;
      }

      setAnimationStarted(true);
      if (clickLockRef.current) return;
      clickLockRef.current = true;

      hasPlayedFullAnimation.current = false;
      playChestAnimation(OPEN_ANIMATION_FRAMES, false);
      setShowGift(false);
      setChestOpened(true);
    } catch (error) {
      console.error("Error playing animation:", error);
    }
  };

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === "function") {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error("Error occurred while changing view:", error);
      }
    } else {
      console.error("setCurrentView is not a function:", setCurrentView);
    }
  };

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange("onboarding");
      });
    };

    setupBackButton();
  }, []);
  const playChestAnimation = useCallback((segments: [number, number], loop: boolean) => {
    if (chestAnimationRef.current && !hasPlayedFullAnimation.current) {
      chestAnimationRef.current.playSegments(segments, loop);
    }
  }, []);
  const handleAnimationComplete = useCallback(() => {

    if (animationStarted && !hasPlayedFullAnimation.current) {
      setShowGift(true);
      hasPlayedFullAnimation.current = true;
    } else if (canClaim && !animationStarted) {
      playChestAnimation(IDLE_ANIMATION_FRAMES, true);
    }
  }, [animationStarted, canClaim, playChestAnimation]);
  return (
    <div className="relative w-full h-screen overflow-hidden z-0"
      style={{
        backgroundImage: `url(${winChestBg.src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "bottom center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backgroundBlendMode: "multiply",
      }}>
      <div className="relative z-50">
        <div
          className="w-full h-[100px] rounded-[31px] pt-1"
          style={{
            background:
              "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
          }}
        >
          <div className="bg-[#000314] h-full w-full rounded-t-[31px]"></div>
        </div>
        <div>
          <Image
            priority={false}
            src={congratsTop}
            alt="not found"
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <h1 className="absolute left-1/2 -translate-x-1/2 top-[75%] font-extralight text-[22.83px]">
            Congrats
          </h1>
        </div>
      </div>
      <Lottie
        lottieRef={chestAnimationRef}
        animationData={animationData}
        autoplay={false}
        loop={false}
        onComplete={handleAnimationComplete}
        style={{
          width: 400,
          height: 400,
          cursor: "pointer",
          transform: "translateX(50%)",
        }}
        className="lottie-chest absolute bottom-[19%] right-1/2"
        onClick={handleOpenChest}
      />
      <GameHeader
        setCurrentView={setCurrentView}
        popupActive={false}
        gameUser={gameUser}
        updateDuelGameUser={() => { }}
        bgShow={false}
      />

      {showGift && prize?.result && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-1/4 transform flex items-center justify-center w-[200px] h-[200px] transition-all duration-1000 ${showGift ? "opacity-100" : "opacity-0"
            } object-contain`}
          style={{
            animation: showGift ? "giftAppear 1s ease-out forwards" : "none",
          }}
        >
          <style jsx>{`
                        @keyframes giftAppear {
                          0% {
                            transform: translate(-50%, 100%) scale(0.2);
                            opacity: 0;
                          }
                          50% {
                            transform: translate(-50%, 50%) scale(0.8);
                            opacity: 0.8;
                          }
                          100% {
                            transform: translate(-50%, 0) scale(1);
                            opacity: 1;
                          }
                        }
                      `}</style>
          <Image priority={true} src={winPrizeBg} alt="Rewards" width={showPrize.img == null && !prize.result.stars ? 160 : 200} />
          <h1 className={`absolute ${showPrize.img == null ? "top-14" : "top-8"} left-1/2 -translate-x-1/2 transform whitespace-nowrap text-center text-lg font-light`}>
            {prize.type === "stars"
              ? `You earned ${prize.result.stars} stars!`
              : "You earned"}
          </h1>

          {prize.type === "stars" && (
            <div className="absolute left-1/2 -translate-x-1/2 transform mt-8 flex space-x-1/2">
              {[...Array(Math.min(Number(prize.result.stars) || 0, 5))].map((_, index) => (
                <span className="text-yellow-400 text-[24px] flex items-center justify-center" style={{
                  filter: "drop-shadow(0px 0px 10px yellow)"
                }}>
                  <Image src={starIcon} alt="Rewards" width={24} />
                </span>
              ))}
            </div>
          )}

          {prize.type === "points" && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-12 text-2xl font-bold flex justify-center items-center">
              <div>{formatNumber(earned)}</div>
              <Image
                priority={false}
                alt="JOK Points"
                src={JOK_POINTS}
                width={20}
              />
            </div>
          )}
          {
            rewardImg && (
              <Image priority={false} src={rewardImg} alt="Rewards" className="absolute left-1/2 -translate-x-1/2 transform rounded-[8px] w-[50px] h-[50px] object-cover" style={{
                filter: "drop-shadow(0px 4px 10px  #48810066)"
              }} />
            )
          }
          {prize.type === "boost" && (
            <div className="absolute text-center mt-28 white-space-nowrap text-sm font-bold flex justify-around items-center flex-col">
              <p>{prize.result.reward == "Premium Avatar"  ? "Premium Avatar" : prize.result.reward == "Premium Background" ? "Premium Background" : ""}</p>
              <p>{prize.result.reward == "Premium Avatar" || prize.result.reward == "Premium Background" ? premiumName : prize.result.reward}</p>
            </div>
          )}
        </div>
      )}

      {canClaim && (
        <div
          className="h-full w-full cursor-pointer"
        >
          <h1 className="absolute bottom-[15%] text-[20px] left-1/2 -translate-x-1/2">
            {animationStarted ? "Tap to skip" : "Tap to Open"}
          </h1>
        </div>
      )}
    </div>
  );
};
export default Win;
