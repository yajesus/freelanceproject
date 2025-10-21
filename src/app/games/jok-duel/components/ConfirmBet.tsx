import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  cardBg,
  sword,
  ellipse,
  star2,
  jokDuelOnboardingBtnBg,
  defeatTextBg,
  starGlow,
  AmountBg,
  starIcon2
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import MatchHeader from "@/components/games/MatchHeader";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { borderTopLeftRadius } from "html2canvas/dist/types/css/property-descriptors/border-radius";

export interface ConfirmBetProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  telegramId: string,
  onlinePlayers: number;
}

const ConfirmBet: FC<ConfirmBetProps> = ({ currentView, setCurrentView, telegramId, onlinePlayers }) => {
  const [amount, setAmount] = useState<number>(0)

  useEffect(() => {
    const getAmount = localStorage.getItem("amount")
    if (!getAmount || parseInt(getAmount) <= 0) {
      setCurrentView('launch-bet')
      return
    }
    setAmount(parseInt(getAmount))
  })

  const placeBet = async () => {
    const res = await fetch("/api/lobby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: telegramId.toString(),
        amount: amount
      }),
    })

    const data = await res.json()

    if (data.success) {
      setCurrentView('opponent-selection')
    }
  }

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
                showTabs={false}
                onlinePlayers={onlinePlayers}
              />

              <div className="relative w-full flex flex-col justify-center items-center gap-3.5">
                <p className="text-white/50 font-normal text-[38px]">
                  JOK<span className="text-[28px]">er</span> DUeL
                </p>
                <div
                  className="w-[322px] h-[405px] rounded-lg px-5 py-2 flex flex-col items-center text-white relative z-[10000]"
                  style={{
                    backgroundImage: `url(${defeatTextBg.src})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col justify-center items-center py-4">
                    <p className="text-white font-normal text-[18px]">
                      You are about to place a bet of
                    </p>
                    <p className="flex gap-1 items-center ">
                      <span>+{amount}</span>
                      <Image
                        priority={false}
                        src={star2}
                        alt="Star Icon"
                        className="h-[20px] w-[21px]"
                      />
                    </p>

                    <div className="py-4 text-center">
                      <p className="text-[14px] font-normal">🎭 "Your bet is ready! Will an opponent dare to take up the challenge?</p>
                    </div>

                    <div className="bg-[#1D1D1D] h-[172px] relative rounded-xl w-full pb-1">
                      <p className="absolute left-1/2 -translate-x-1/2 text-[16px] font-normal mt-[15px] w-full text-center">Potential Winnings</p>
                      <Image
                        priority={false}
                        src={starGlow}
                        alt="Star Glow Icon"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[143px] animate-fadeOut"
                      />
                      <Image
                        priority={false}
                        src={starIcon2}
                        alt="Star Glow Icon"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[143px]"
                      />

                      {/* <div className="relative  -mt-[30px] ">
                        <Image
                          priority={false}
                          src={starGlow}
                          alt="Star Glow Icon"
                          className="absolute h-[143px]"
                        />
                      </div> */}
                      {/* <Image
                        priority={false}
                        src={starIcon2}
                        alt="star"
                        className="h-[109px] w-[109px]"
                      /> */}

                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[5px]">
                        <Image
                          priority={false}
                          src={AmountBg}
                          alt="Amount bg"
                          className=""
                        />
                        <p className="text-[20px] font-normal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">+{amount * 2}</p>
                      </div>
                    </div>

                    <div className="absolute bottom-[25px] flex gap-2 items-center justify-between px-5">
                      <button
                        onClick={() => setCurrentView('launch-bet')}
                        className="block mx-auto relative"
                      >
                        <Image
                          priority={false}
                          src={jokDuelOnboardingBtnBg}
                          alt={""}
                          className="mt-[-5px] h-[20%] mx-auto object-contain opacity-0"
                        />
                        <p className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2  text-[80%]">
                          Cancel
                        </p>
                      </button>
                      <button
                        onClick={() => placeBet()}
                        className="block mx-auto relative rounded-full animate-gradient-glow-blink"
                      >
                        <Image
                          priority={false}
                          src={jokDuelOnboardingBtnBg}
                          alt={""}
                          className="mt-[-5px] h-[20%] mx-auto object-contain"
                        />
                        <p className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2  text-[80%] w-full flex gap-1 justify-center items-center">
                          <Image
                            priority={false}
                            src={sword}
                            alt={"sward icon"}
                            className="h-[21px] w-[21px]"
                          />
                          Place bet
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
    </div >
  );
};
export default ConfirmBet;
