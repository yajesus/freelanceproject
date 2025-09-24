"use client";

import { shopImageMap, character1 } from "@/images";
import {
  closeButtonBg,
  continueButtonBg,
  gameClosePopupBg,
  gameHeader,
} from "../images";
import { useGameStore } from "@/utils/game-mechanics";
import Image from "next/image";
import { useState } from "react";

export const GameHeader = ({
  setCurrentView,
  popupActive,
  updateDuelGameUser,
  gameUser,
  bgShow,
}: {
  setCurrentView: (view: string) => void;
  popupActive?: boolean;
  updateDuelGameUser: any;
  gameUser: any;
  bgShow?: boolean;
}) => {
  const { equippedAvatar, userTelegramName, totalStars } = useGameStore();
  const [popup, setPopup] = useState(false);

  const handleCloseGame = async () => {
    if (popup) {
      await updateDuelGameUser({
        losses: gameUser.losses + 1,
      });
    }
    setCurrentView("game-profile");
  };

  return (
    <>
      <div
        className="w-full h-[55px] absolute top-[2%] left-1/2 transform -translate-x-1/2 z-[1000]"
        style={{
          backgroundImage: `url(${
            bgShow == false ? "transparent" : gameHeader.src
          })`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "contain",
        }}
      >
        <div
          className="h-[41px] w-[41px] rounded-full absolute left-1/2 transform -translate-x-[380%] top-[13%] cursor-pointer"
          style={{ background: "linear-gradient(to right, #004989, #001323)" }}
          onClick={() => (popupActive ? setPopup(true) : handleCloseGame())}
        >
          <div className="h-[36px] w-[36px] rounded-full absolute left-[50%] transform -translate-x-1/2 top-1/2 -translate-y-1/2 bg-[#004989]">
            <Image
              priority={false}
              src={equippedAvatar ? shopImageMap[equippedAvatar] : character1}
              alt="Main Character"
              fill
              style={{
                objectFit: "contain",
                objectPosition: "center",
                transform: "scale(0.8) translateY(5%)",
              }}
            />
            <p className="absolute left-[50px] top-[8px]">{userTelegramName}</p>
          </div>
        </div>
      </div>

      {popup && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center w-full z-[9999]"
          onClick={() => setPopup(false)}
        >
          <div
            className=" w-[322px] h-[286px] rounded-lg p-5 flex flex-col items-center text-white relative z-[10000]"
            style={{
              backgroundImage: `url(${gameClosePopupBg.src})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-[24px] text-center mt-2">
              Are You sure you want to leave a game?
            </h1>
            <h2 className="text-[12px] text-center mt-2">
              If you leave now, you'll forfeit the match! 
            </h2>
            <div className="flex justify-center gap-3 items-center mt-5">
              <button
                className=" text-white text-[16px] font-bold mt-5 p-2 rounded-lg"
                style={{
                  backgroundImage: `url(${closeButtonBg.src})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                onClick={() => setCurrentView("game-profile")}
              >
                Leave Game
              </button>
              <button
                className=" text-white text-[16px] font-bold mt-5 p-2 rounded-lg"
                style={{
                  backgroundImage: `url(${continueButtonBg.src})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                onClick={() => setPopup(false)}
              >
                Stay&play
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute right-1/2 transform translate-x-[220%] flex top-[2%] z-[5000]">
        <div className="flex mt-[25%]">
          <svg
            width="22"
            height="21"
            viewBox="0 0 22 21"
            fill="none"
            className="absolute right-[80%] top-[40%]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.0075 7.34711L14.9094 5.71379L11.4718 0.419352C11.2253 0.0396683 10.6696 0.0396683 10.423 0.419352L6.9855 5.71379L0.88739 7.34711C0.450144 7.46424 0.278371 7.99277 0.563269 8.34456L4.53663 13.2505L4.20546 19.5543C4.18171 20.0063 4.63133 20.333 5.05395 20.1707L10.9474 17.9079L16.8409 20.1708C17.2636 20.333 17.7132 20.0063 17.6894 19.5543L17.3583 13.2506L21.3316 8.34461C21.6165 7.99281 21.4447 7.46424 21.0075 7.34711Z"
              fill="#FFF04A"
            />
            <path
              d="M4.45762 20.0891C4.62035 20.2096 4.84043 20.2523 5.05376 20.1704L10.9473 17.9076V10.9487L4.45762 20.0891Z"
              fill="#FFDA45"
            />
            <path
              d="M17.4371 20.0891C17.5968 19.9709 17.7012 19.7778 17.6894 19.554L17.3583 13.2502L10.9474 10.9487L17.4371 20.0891Z"
              fill="#FFDA45"
            />
            <path
              d="M17.3583 13.2502L21.3317 8.34419C21.4763 8.16554 21.503 7.94138 21.4372 7.74864L10.9474 10.9486L17.3583 13.2502Z"
              fill="#FFBC36"
            />
            <path
              d="M10.9474 10.95L21.4372 7.74995C21.3733 7.56313 21.2227 7.40578 21.0075 7.34814L14.9094 5.71482L10.9474 10.95Z"
              fill="#FFDA45"
            />
            <path
              d="M14.9094 5.71397L11.4719 0.419529C11.3486 0.229708 11.148 0.134797 10.9474 0.134797V10.9491L14.9094 5.71397Z"
              fill="#FFBC36"
            />
            <path
              d="M0.457458 7.74995L10.9472 10.95L6.98523 5.71482L0.887119 7.34818C0.671914 7.40578 0.521232 7.56313 0.457458 7.74995Z"
              fill="#FFFD78"
            />
            <path
              d="M10.9473 10.9487L0.457569 7.74864C0.391752 7.94142 0.418429 8.16559 0.563108 8.34419L4.53651 13.2502L10.9473 10.9487Z"
              fill="#FFDA45"
            />
            <path
              d="M17.4371 20.0891L10.9474 10.9487V17.9076L16.841 20.1705C17.0543 20.2523 17.2744 20.2096 17.4371 20.0891Z"
              fill="#FFBC36"
            />
          </svg>

          <div
            style={{
              background: "linear-gradient(to right, #004989, #001323)",
              width: "68px",
              height: "20px",
            }}
            className="rounded-full flex items-center justify-center"
          >
            <div
              style={{ backgroundColor: "rgba(255,255,255,0.21)" }}
              className="w-[66px] h-[18px] absolute top-1/2 transform  rounded-full flex justify-end pr-1"
            >
              <p className="text-[14px] absolute top-1/2 transform -translate-y-2">
                {totalStars}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
