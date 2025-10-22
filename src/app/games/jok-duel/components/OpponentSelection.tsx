import { FC, useMemo, useEffect, useRef, useState } from "react";
import {
  jokDuelOpponentSelectionCard1,
  jokDuelOpponentSelectionCard2,
  jokDuelOpponentSelectionCard3,
  ellipse,
} from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { useGameStore } from "@/utils/game-mechanics";
import { character1, shopImageMap } from "@/images";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import { star2 } from "../images";
import MatchCard from "@/components/games/MatchCard";
import MatchHeader from "@/components/games/MatchHeader";
import { timeAgo } from "@/utils/timeAgo";

interface User {
  name: string
}

export interface lobbyProps {
  id: string,
  userId1: string,
  amount: string,
  createdAt: string,

  user1: User
}

export interface OpponentSelectionProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  startMatch: (lobbyId: string) => void;
  onlinePlayers: number;
  lobbies: lobbyProps[];
}

const OpponentSelection: FC<OpponentSelectionProps> = ({
  currentView,
  setCurrentView,
  startMatch,
  onlinePlayers,
  lobbies
}) => {
  const { equippedAvatar, userTelegramName } = useGameStore();

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

  const startGame = (id: string) => {
    startMatch(id);
  }

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

              {/* Games */}
              <div className="flex flex-col gap-6 z-0">
                {lobbies ? lobbies.map((lobby) => (
                  <MatchCard user={lobby.user1.name || "Unknown"} isPremium={parseInt(lobby.amount) >= 500 ? true : false} amount={parseInt(lobby.amount)} minLeft={timeAgo(lobby.createdAt)} startGame={() => startGame(lobby.id)} />
                )) : <p className="text-center">No active user</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OpponentSelection;
