import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  cardBg,
  cardsIcon,
  ellipse,
  star2,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import MatchHeader from "@/components/games/MatchHeader";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { borderTopLeftRadius } from "html2canvas/dist/types/css/property-descriptors/border-radius";

export interface LaunchBetProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const CustomSlider = styled(Slider)({
  height: 31,
  "& .MuiSlider-thumb": {
    background: `url(${star2.src}) center center no-repeat`,
    backgroundSize: "24px 24px",
    width: 40,
    height: 40,
    border: "2px solid #3f3c40",
    backgroundColor: "#262426",
    marginLeft: -20,
  },
  "& .MuiSlider-track": {
    borderRadius: 80,
    background: "linear-gradient(to right, #C27CBC, #D3FF00, #3BE32D)",
  },
  "& .MuiSlider-rail": {
    borderRadius: 80,
    border: "2px solid #3f3c40",
    backgroundColor: "#262426", // inactive part
  },
  "& .MuiSlider-valueLabel": {
    background: "#262426",
    color: "#fff",
    fontSize: "16px",
    fontFamily: "Poppins, sans-serif",
    padding: "4px 8px",
  },
});

const LaunchBet: FC<LaunchBetProps> = ({ currentView, setCurrentView }) => {
  const [value, setValue] = useState(30);
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

  const addAmounts = [10, 100, 500, 1000];

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

              <div className="relative w-full flex flex-col justify-center items-center gap-9">
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
                      <div className="bg-gradient-to-b from-white to-neutral-400  rounded-[10px]">
                        <input
                          className="font-normal bg-transparent rounded-[10px] border border-white/0 text-white/10 text-base py-3 px-2 w-[88px]"
                          type="text"
                          placeholder="Your bet"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[165px] left-1/2 -translate-x-1/2 w-full px-3.5">
                    <CustomSlider
                      min={1}
                      max={10000}
                      defaultValue={30}
                      step={10}
                      value={value}
                      onChange={(e: Event, newValue: number | number[]) =>
                        setValue(newValue as number)
                      }
                      valueLabelDisplay="on"
                    />
                  </div>
                  <div className="absolute top-[240px] left-1/2 -translate-x-1/2 w-full px-3.5 flex justify-between">
                    {addAmounts.map((amount) => (
                      <div className="relative inline-block" onClick={() => setValue(amount)}>
                        <div className="w-[55px] text-center py-2.5 uppercase text-[16px] font-normal bg-stone-900 rounded-[10px]">
                          +{amount}
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
                    ))}
                    <div className="relative inline-block">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LaunchBet;
