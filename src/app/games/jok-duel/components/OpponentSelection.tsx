import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  jokDuelOpponentSelectionBg,
  jokDuelOpponentSelectionCard1,
  jokDuelOpponentSelectionCard2,
  jokDuelOpponentSelectionCard3,
  jokDuelOpponentSelectionCardBg,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { useGameStore } from "@/utils/game-mechanics";
import { character1, shopImageMap } from "@/images";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";

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
      setCurrentView("selectedOpponent");
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
          <div
            className="bg-cover rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto no-scrollbar p-[20px]"
            style={{
              backgroundImage: `url(${jokDuelOpponentSelectionBg.src})`,
            }}
          >
            <div className="h-full mt-[-43px] flex justify-center items-center">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OpponentSelection;
