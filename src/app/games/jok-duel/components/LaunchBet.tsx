import { FC, useMemo, useEffect, useRef, useState } from "react";
import { ellipse } from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import MatchHeader from "@/components/games/MatchHeader";

export interface LaunchBetProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const LaunchBet: FC<LaunchBetProps> = ({ currentView, setCurrentView }) => {
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

  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div className="bg-black rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto no-scrollbar p-[20px]">
            <div className="flex flex-col gap-8 relative">
              <Image
                priority={false}
                src={ellipse}
                alt="Ellipse"
                className="z-0 opacity-40 absolute top-[30px] right-0 rotate-[166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl"
              />
              <Image
                priority={false}
                src={ellipse}
                alt="Ellipse"
                className="z-0 opacity-20 absolute -bottom-[300px] -left-[50px] rotate-[-166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl"
              />
              {/* Header */}
              <MatchHeader
                currentView={currentView}
                setCurrentView={setCurrentView}
              />

              <div className="relative">
                <div className="bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5]">
                <div className="bg-black/50 h-[380px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LaunchBet;
