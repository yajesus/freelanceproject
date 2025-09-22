"use client";

import { Game1Img, GamesBg } from "@/images";
import { useEffect, useState } from "react";
interface GameStartProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const GameStart: React.FC<GameStartProps> = ({
  currentView,
  setCurrentView,
}) => {
  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div className="mt-[2px] bg-cover bg-center rounded-t-[46px] h-full w-full overflow-y-auto no-scrollbar p-[20px]"></div>
        </div>
      </div>
    </div>
  );
};

export default GameStart;
