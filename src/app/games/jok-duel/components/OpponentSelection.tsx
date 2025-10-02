import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  jokDuelOpponentSelectionBg,
  jokDuelOpponentBg,
  jokDuelOpponentSelectionCard1,
  jokDuelOpponentSelectionCard2,
  jokDuelOpponentSelectionCard3,
  jokDuelOpponentSelectionCardBg,
  stars,
  starIcon,
  starIcon2,
  historyIcon,
  greenCard,
  clashIcon,
  star3,
  glowingSparkle,
  starGlow,
  timerIcon,
  textShape,
  naruto,
  sword,
  ellipse,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { useGameStore } from "@/utils/game-mechanics";
import { character1, shopImageMap } from "@/images";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import { star2 } from "../images";
import MatchCard from "@/components/games/MatchCard";

export interface OpponentSelectionProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const OpponentSelection: FC<OpponentSelectionProps> = ({
  currentView,
  setCurrentView,
}) => {
  const { equippedAvatar, userTelegramName } = useGameStore();

  const randomNum = 1.5;
  const [randomCard, setRandomCard] = useState(jokDuelOpponentSelectionCard1);
  useEffect(() => {
    const randomCard = [
      jokDuelOpponentSelectionCard1,
      jokDuelOpponentSelectionCard2,
      jokDuelOpponentSelectionCard3,
    ][Math.floor(Math.random() * 3)];
    setRandomCard(randomCard);
  }, []);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const avatar = useMemo(
    () => shopImageMap[equippedAvatar] || character1,
    [equippedAvatar]
  );

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      // setCurrentView("selectedOpponent");
    }, randomNum * 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [randomNum, setCurrentView]);

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
              <div className="flex justify-between w-full">
                <div className="flex justify-center items-center gap-9">
                  <div
                    className={`overflow-hidden w-14 h-14 relative rounded-full flex justify-center p-[1px] items-center bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] shadow-lg`}
                  >
                    <Image
                      priority={false}
                      src={avatar}
                      alt="Avatar"
                      className="rounded-full w-full h-full p-1 bg-black"
                    />
                  </div>
                  <div className="relative">
                    <div className="bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-[1px] rounded-r-xl">
                      <div className="bg-black rounded-r-xl ml-1 px-5 py-2 justify-start text-white text-base font-normal lowercase leading-3">
                        4000
                      </div>
                    </div>
                    <div className="absolute -top-1 -left-4">
                      <Image
                        priority={true}
                        src={star2}
                        alt={""}
                        className="size-[36px]"
                      />
                    </div>
                  </div>
                </div>
                <div className="inline-flex justify-center items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-l from-lime-700 via-lime-600 to-green-100 rounded-full" />
                  <div className="justify-start text-white text-base font-normal lowercase leading-snug">
                    20 online
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2.5 z-10">
                <div className="flex-1 flex justify-between items-center">
                  <div className="w-full bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-0.5 rounded-[10px]">
                    <div className="bg-neutral-900 w-full rounded-[10px]">
                      <p className="text-center w-full py-2.5">Open Duel</p>
                    </div>
                  </div>
                  <div className="bg-neutral-900 w-full py-2.5 rounded-r-[10px]">
                    <p className="text-center w-full">+ Launch a Duel</p>
                  </div>
                </div>
                <div className="bg-neutral-900 outline outline-1 outline-offset-[-1px] outline-neutral-600 rounded-[10px]">
                  <Image
                    priority={false}
                    src={historyIcon}
                    alt={""}
                    className="p-2.5 size-10"
                  />
                </div>
              </div>

              {/* Games */}
              <div className="flex flex-col gap-6 z-10">
                <MatchCard isPremium={false} amount={30} minLeft={2} />
                <MatchCard isPremium={true} amount={500} minLeft={2} />
                <MatchCard isPremium={true} amount={500} minLeft={3} />
              </div>
            </div>

            {/* <div className="h-full mt-[-43px] flex justify-center items-center">
              <div className="relative w-fit flex justify-center">
                <Image
                  priority={false}
                  src={jokDuelOpponentSelectionCardBg}
                  alt={""}
                />

                <div
                  className={`absolute top-[24px] left-1/2 -translate-x-1/2`}
                  style={{
                    width: jokDuelOpponentSelectionCardBg.width - 12,
                  }}
                >
                  <div className="w-full text-2xl text-center flex justify-center items-center">
                    <p>Hi {userTelegramName}</p>
                    <p className="translate-y-[-7px]">🔥</p>
                  </div>
                  <div className="mt-[10px] flex justify-center items-center">
                    <Image
                      priority={false}
                      src={avatar}
                      alt={""}
                      className="w-1/2 aspect-square"
                    />
                  </div>
                  <p className="text-center mt-[32px] font-extralight">
                    Searching for available players
                  </p>

                  <div className="mt-[18px] flex justify-center items-center">
                    <div className="spinner">
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                      <div className="spinner-blade"></div>
                    </div>
                  </div>

                  <div className="flex justify-center items-center">
                    <Image
                      priority={false}
                      src={randomCard}
                      alt={""}
                      className="ml-[16px] w-[55%] h-[20%] object-contain"
                    />
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};
export default OpponentSelection;
