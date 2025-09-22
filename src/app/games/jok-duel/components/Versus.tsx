"use client";

import { vsNames } from "@/src/app/games/jok-duel/images";
import { useGameStore } from "@/utils/game-mechanics";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import Image from "next/image";
import { useEffect, useState } from "react";

interface VersusProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  opponentUsername: string;
}

const Versus: React.FC<VersusProps> = ({
  currentView,
  setCurrentView,
  opponentUsername,
}) => {
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const { userTelegramName } = useGameStore();
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (count > 0) {
      interval = setInterval(() => {
        setCount((prev) => prev - 1);
        setProgress((prev) => prev + 33.33);
      }, 1000);
    } else {
      setCurrentView("game");
    }

    return () => clearInterval(interval);
  }, [count]);

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
        handleViewChange("myProfile");
      });
    };

    setupBackButton();
  }, []);

  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div className="relative rounded-t-[46px] w-full h-screen overflow-hidden">
            {/* <video
              className="absolute top-0 left-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={versusBg} type="video/mp4" />
            </video> */}

            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="absolute top-[100px]">
                <Image priority={false} src={vsNames} alt="not found" />
                <p className="absolute top-[20px] left-[30px] text-[13px] font-extralight text-white mt-4">
                  {userTelegramName}
                </p>
                <p className="absolute top-[52px] right-[30px] text-[13px] text-white font-extralight mt-4">
                  {opponentUsername}
                </p>
              </div>

              <div className="flex items-center justify-center absolute bottom-[20%]">
                <svg width="62" height="62" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="gray"
                    strokeWidth="10"
                    fill="none"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#gradient)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (progress / 100) * 283}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{
                      transition: "stroke-dashoffset 1s ease-in-out",
                    }}
                  />

                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#44F756" />
                      <stop offset="33%" stopColor="#D3EB2F" />
                      <stop offset="66%" stopColor="#D684F5" />
                      <stop offset="100%" stopColor="#ADA3D9" />
                    </linearGradient>
                  </defs>

                  <text
                    x="52"
                    y="62"
                    textAnchor="middle"
                    fill="white"
                    fontSize="36"
                    fontWeight="bold"
                  >
                    {count > 0 ? count : "Go!"}
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Versus;
