import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  cardBg,
  cardsIcon,
  ellipse,
  star2,
  jokDuelOnboardingBtnBg,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import MatchHeader from "@/components/games/MatchHeader";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { borderTopLeftRadius } from "html2canvas/dist/types/css/property-descriptors/border-radius";
import GradientSlider from "@/components/games/GradientSlider";
import { useGameStore } from "@/utils/game-mechanics";

export interface LaunchBetProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onlinePlayers: number
}

const LaunchBet: FC<LaunchBetProps> = ({ currentView, setCurrentView, onlinePlayers }) => {
  const [value, setValue] = useState(30);
  const { totalStars } = useGameStore()

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


  const handleBet = () => {
    if (!value || value <= 0) return
    if (value > totalStars) return // try to bet over balance

    localStorage.setItem("amount", value.toString())
    setCurrentView("confirm-bet")
  }

  const addAmounts = [10, 100, 500, 1000];

  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div className="bg-black rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto overflow-hidden no-scrollbar p-[20px]">
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
                onlinePlayers={onlinePlayers}
              />

              <div className="relative w-full flex flex-col justify-center items-center gap-9 z-10">
                <p className="text-white/50 font-normal text-[38px]">
                  JOK<span className="text-[28px]">er</span> DUeL
                </p>
                <div className="relative">
                  <Image
                    priority={false}
                    src={cardsIcon}
                    alt="Card Icon"
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-10"
                  />
                  <Image
                    priority={false}
                    src={cardBg}
                    alt="Card Bg"
                    className=""
                  />
                  <div className="absolute top-[55px] left-1/2 -translate-x-1/2">
                    <div className="flex flex-col gap-1.5 justify-center items-center">
                      <p className="text-white font-normal text-base">
                        Enter amount
                      </p>
                      <div className="relative bg-stone-900  rounded-[10px]">
                        <input
                          className="no-arrows font-normal bg-transparent rounded-[10px] border border-white/0 placeholder-neutral-700 text-center text-base py-3 px-2 w-[88px] focus:outline-none focus:ring-0"
                          type="number"
                          placeholder="Your bet"
                          onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                        />
                        <div
                          className="absolute inset-0 rounded-[10px] border-[1.8px] border-neutral-400 pointer-events-none"
                          style={{
                            WebkitMaskImage:
                              "linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "100% 100%",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[165px] left-1/2 -translate-x-1/2 w-full px-3.5">
                    <GradientSlider value={value} onchange={(val: any) => setValue(val[0])} />
                  </div>
                  <div className="absolute top-[240px] left-1/2 -translate-x-1/2 w-full px-[14px] flex justify-between gap-1">
                    {addAmounts.map((amount) => (
                      <div
                        className="relative inline-block w-[55px]"
                        onClick={() => setValue(amount)}
                      >
                        <div
                          className={`${amount == value && "bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-[1px] rounded-[10px]"}`}
                        >
                          <div className="w-[53px] text-center py-2.5 uppercase text-[16px] font-normal bg-stone-900 rounded-[10px]">
                            +{amount}
                          </div>
                          {amount != value && <div
                            className="absolute inset-0 rounded-[10px] border-[1.8px] border-neutral-400 pointer-events-none"
                            style={{
                              WebkitMaskImage:
                                "linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
                              WebkitMaskRepeat: "no-repeat",
                              WebkitMaskSize: "100% 100%",
                            }}
                          ></div>}
                        </div>
                      </div>
                    ))}
                    <div
                      className={`${totalStars == value && "bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-[1px] rounded-[10px]"}`}
                    >
                      <div className="relative inline-block" onClick={() => setValue(totalStars)}>
                        <div className="w-12 text-center h-[5px] left-[3px] top-[35px] absolute bg-gradient-to-r from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] blur-[10px] z-10" />
                        <div className=" w-[55px] text-center py-2.5 uppercase text-[16px] font-normal bg-stone-900 rounded-[10px]">
                          All in
                        </div>
                        <div
                          className="absolute inset-0 rounded-[10px] border-[1.8px] border-neutral-400 pointer-events-none"
                          style={{
                            WebkitMaskImage:
                              "linear-gradient(to top, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "100% 100%",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-[25px] left-1/2 -translate-x-1/2 rounded-full animate-gradient-glow-blink">
                    <button
                      onClick={() => handleBet()}
                      className="block mx-auto w-fit relative"
                    >
                      <Image
                        priority={false}
                        src={jokDuelOnboardingBtnBg}
                        alt={""}
                        className="mt-[-5px] h-[20%] mx-auto object-contain"
                      />
                      <p className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2  text-[16px]">
                        🔥 it's hot
                      </p>
                    </button>
                  </div>
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
