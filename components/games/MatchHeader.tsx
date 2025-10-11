import { historyIcon, star2 } from "@/src/app/games/jok-duel/images";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { character1, shopImageMap } from "@/images";
import { useGameStore } from "@/utils/game-mechanics";

interface MatchHeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  showTabs?: boolean;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({ currentView, setCurrentView, showTabs = true }) => {
  const { equippedAvatar, userTelegramName, totalStars } = useGameStore();
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const avatar = useMemo(
    () => shopImageMap[equippedAvatar] || character1,
    [equippedAvatar]
  );

  return (
    <div className="flex flex-col gap-8 z-999 relative" ref={menuRef}>
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
                {totalStars}
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

      {showTabs && <div className="flex items-center gap-2.5 z-999">
        <div className="flex-1 flex justify-between items-center">
          <div
            onClick={() => setCurrentView("opponent-selection")}
            className={`w-full ${currentView == "opponent-selection"
              ? "bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-[1px] rounded-[10px]"
              : "bg-neutral-900 rounded-l-[10px]"
              }`}
          >
            <div className="bg-neutral-900 w-full rounded-[10px]">
              <p className="text-center w-full py-2.5">Open Duel</p>
            </div>
          </div>
          <div
            onClick={() => setCurrentView("launch-bet")}
            className={`w-full  ${currentView == "launch-bet"
              ? "bg-gradient-to-tr from-[#C27CBC] via-[#D3FF00] to-[#3BE32D] p-[1px] rounded-[10px]"
              : "bg-neutral-900 rounded-r-[10px]"
              }`}
          >
            <div className="bg-neutral-900 w-full rounded-[10px]">
              <p className="text-center w-full py-2.5">+ Launch a Duel</p>
            </div>
          </div>
        </div>
        <div onClick={() => setOpen(!open)}
          className={`bg-neutral-900 outline outline-1 outline-offset-[-1px] outline-neutral-600 rounded-[10px]`}>
          <Image
            priority={false}
            src={historyIcon}
            alt={"History Icon"}
            className="p-2.5 size-10"
          />
        </div>
      </div>}
      {open && (
        <div style={{ zIndex: "999" }} className="absolute top-[132px] right-0 mt-2 w-[119px] bg-gradient-to-b from-[#060303] to-[#252525] rounded-xl shadow-lg overflow-hidden">
          <ul className="flex flex-col text-white">
            <li onClick={() => setCurrentView("history-ongoing")} className="px-4 py-2 uppercase cursor-pointer text-[12px] font-normal text-center border-b border-[#565656]">onGoing</li>
            <li onClick={() => setCurrentView("history-all-matches")} className="px-4 py-2 uppercase cursor-pointer text-[12px] font-normal text-center border-b border-[#565656]">All Matches</li>
            <li onClick={() => setCurrentView("history-my-matches")} className="px-4 py-2 uppercase cursor-pointer text-[12px] font-normal text-center border-b border-[#565656]">My Matches</li>
            <li onClick={() => setCurrentView("match-versus")} className="px-4 py-2 uppercase cursor-pointer text-[12px] font-normal text-center border-b border-[#565656]">Match versus (test)</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MatchHeader;
