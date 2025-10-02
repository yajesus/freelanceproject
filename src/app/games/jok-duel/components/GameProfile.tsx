import { cards, character1, shopImageMap } from "@/images";
import { calculateYieldPerHour } from "@/utils/calculations";
import { useGameStore } from "@/utils/game-mechanics";
import {
  formatNumber,
  showBackButton,
  triggerHapticFeedback,
} from "@/utils/ui";
import Image from "next/image";
import { FC, useEffect } from "react";
import {
  gameProfileBg,
  jokDuelOnboardingBg,
  jokDuelOnboardingBtnBg,
  RankingBtnBg,
} from "../images";

export interface GameProfileProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameUser: any;
}

const GameProfile: FC<GameProfileProps> = ({
  currentView,
  setCurrentView,
  gameUser,
}) => {
  let intro = localStorage.getItem("gameIntro");
  const {
    equippedAvatar,
    userTelegramName,
    totalStars,
    bonusYieldPerHour,
    upgradeYieldPerHour,
  } = useGameStore();
  localStorage.removeItem("prizeTaken");
  const handlePlay = () => {
    if (totalStars < 6) {
      setCurrentView("recover");
    } else {
      setCurrentView("game");
    }
    // if (intro) {
    //   setCurrentView("opponent-selection");
    // } else {
    //   setCurrentView("gameIntro");
    // }
    // }
  };

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
        <div className="flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div
            style={{ backgroundImage: `url(${jokDuelOnboardingBg.src})` }}
            className="w-full h-[110vh] mt-[2px] bg-cover bg-center rounded-t-[46px] overflow-y-auto no-scrollbar p-[20px]"
          >
            <div
              className="flex flex-col gap-2 w-full h-[60%]"
              style={{
                backgroundImage: `url(${gameProfileBg.src})`,
                backgroundPosition: "top center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
              }}
            >
              <Image
                priority={false}
                src={equippedAvatar ? shopImageMap[equippedAvatar] : character1}
                alt="Main Character"
                style={{
                  objectFit: "contain",
                  objectPosition: "center",
                }}
                className="absolute left-1/2 -translate-x-1/2 h-[15%]"
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-1/4 w-[80%] flex flex-col items-center text-[13px]">
                <div
                  className="fixed -top-[25%] flex w-[205px] h-[42px] justify-center gap-[11px] items-center"
                  style={{
                    backgroundImage: `url(${RankingBtnBg.src})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "contain",
                  }}
                  onClick={() => setCurrentView("leaderBoard")}
                >
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 23 23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.4911 8.03856L15.8274 6.25376L12.0711 0.468278C11.8017 0.0533799 11.1944 0.0533799 10.925 0.468278L7.16865 6.25376L0.504953 8.03856C0.0271531 8.16655 -0.160551 8.74411 0.150771 9.12853L4.49265 14.4895L4.13077 21.3779C4.10481 21.8719 4.59613 22.2289 5.05795 22.0515L11.498 19.5789L17.9381 22.0516C18.4 22.2289 18.8913 21.8719 18.8653 21.3779L18.5034 14.4896L22.8453 9.12858C23.1566 8.74415 22.9689 8.16655 22.4911 8.03856Z"
                      fill="#FFF04A"
                    />
                    <path
                      d="M4.40625 21.9617C4.58407 22.0934 4.82456 22.1401 5.05768 22.0506L11.4978 19.5779V11.9735L4.40625 21.9617Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5896 21.9617C18.7641 21.8325 18.8782 21.6216 18.8653 21.3769L18.5034 14.4885L11.498 11.9735L18.5896 21.9617Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5034 14.4892L22.8454 9.12815C23.0034 8.93293 23.0326 8.68797 22.9607 8.47736L11.498 11.9741L18.5034 14.4892Z"
                      fill="#FFBC36"
                    />
                    <path
                      d="M11.498 11.9755L22.9607 8.47865C22.8909 8.2745 22.7263 8.10256 22.4911 8.03957L15.8274 6.25476L11.498 11.9755Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M15.8274 6.25373L12.0711 0.468244C11.9364 0.260818 11.7172 0.157104 11.498 0.157104V11.9744L15.8274 6.25373Z"
                      fill="#FFBC36"
                    />
                    <path
                      d="M0.0351562 8.47865L11.4978 11.9755L7.16836 6.25476L0.504667 8.03961C0.269502 8.10256 0.104845 8.2745 0.0351562 8.47865Z"
                      fill="#FFFD78"
                    />
                    <path
                      d="M11.4979 11.9742L0.0352587 8.47736C-0.0366619 8.68802 -0.00751105 8.93297 0.150587 9.12815L4.49251 14.4892L11.4979 11.9742Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5896 21.9617L11.498 11.9735V19.5779L17.9382 22.0506C18.1713 22.1401 18.4118 22.0934 18.5896 21.9617Z"
                      fill="#FFBC36"
                    />
                  </svg>
                  <h3 className="text-[18px]">Ranking System</h3>
                </div>
                <div className="flex gap-[10px] w-[60%] mt-4 items-center">
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 23 23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.4911 8.03856L15.8274 6.25376L12.0711 0.468278C11.8017 0.0533799 11.1944 0.0533799 10.925 0.468278L7.16865 6.25376L0.504953 8.03856C0.0271531 8.16655 -0.160551 8.74411 0.150771 9.12853L4.49265 14.4895L4.13077 21.3779C4.10481 21.8719 4.59613 22.2289 5.05795 22.0515L11.498 19.5789L17.9381 22.0516C18.4 22.2289 18.8913 21.8719 18.8653 21.3779L18.5034 14.4896L22.8453 9.12858C23.1566 8.74415 22.9689 8.16655 22.4911 8.03856Z"
                      fill="#FFF04A"
                    />
                    <path
                      d="M4.40625 21.9617C4.58407 22.0934 4.82456 22.1401 5.05768 22.0506L11.4978 19.5779V11.9735L4.40625 21.9617Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5896 21.9617C18.7641 21.8325 18.8782 21.6216 18.8653 21.3769L18.5034 14.4885L11.498 11.9735L18.5896 21.9617Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5034 14.4892L22.8454 9.12815C23.0034 8.93293 23.0326 8.68797 22.9607 8.47736L11.498 11.9741L18.5034 14.4892Z"
                      fill="#FFBC36"
                    />
                    <path
                      d="M11.498 11.9755L22.9607 8.47865C22.8909 8.2745 22.7263 8.10256 22.4911 8.03957L15.8274 6.25476L11.498 11.9755Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M15.8274 6.25373L12.0711 0.468244C11.9364 0.260818 11.7172 0.157104 11.498 0.157104V11.9744L15.8274 6.25373Z"
                      fill="#FFBC36"
                    />
                    <path
                      d="M0.0351562 8.47865L11.4978 11.9755L7.16836 6.25476L0.504667 8.03961C0.269502 8.10256 0.104845 8.2745 0.0351562 8.47865Z"
                      fill="#FFFD78"
                    />
                    <path
                      d="M11.4979 11.9742L0.0352587 8.47736C-0.0366619 8.68802 -0.00751105 8.93297 0.150587 9.12815L4.49251 14.4892L11.4979 11.9742Z"
                      fill="#FFDA45"
                    />
                    <path
                      d="M18.5896 21.9617L11.498 11.9735V19.5779L17.9382 22.0506C18.1713 22.1401 18.4118 22.0934 18.5896 21.9617Z"
                      fill="#FFBC36"
                    />
                  </svg>

                  <div className="flex justify-between w-full">
                    <p>Stars</p>
                    <p>{totalStars}</p>
                  </div>
                </div>
                <div className="flex gap-[10px] w-[60%] mt-4 items-center">
                  <Image
                    priority={false}
                    src={cards}
                    alt="Cards"
                    width={20}
                    height={20}
                  />

                  <div className="flex justify-between w-full">
                    <p>Yield\hour</p>
                    <p>
                      +
                      {formatNumber(
                        calculateYieldPerHour(
                          bonusYieldPerHour,
                          upgradeYieldPerHour
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-[10px] w-[60%] mt-4 items-center">
                  <svg
                    width="18"
                    height="20"
                    viewBox="0 0 18 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.3182 13.292C16.2465 13.2659 18 10.5109 18 8.14855C18 6.82093 17.109 5.71022 15.9263 5.44184C16.0283 5.13626 16.1168 4.85522 16.176 4.64226C16.4408 3.6978 16.2697 2.7003 15.7065 1.90468C15.132 1.09401 14.2538 0.62851 13.296 0.62851H4.70325C3.7455 0.62851 2.8665 1.09401 2.292 1.90468C1.72875 2.7003 1.55775 3.69859 1.8225 4.64226C1.8825 4.85522 1.97025 5.13626 2.073 5.44263C0.89025 5.71101 0 6.82172 0 8.14934C0 10.5117 1.75425 13.2667 6.68175 13.2928C6.72375 13.5319 6.75 13.7757 6.75 14.0243V16.4618C6.75 17.9074 5.598 18.0388 5.25 18.0452H4.5C4.08525 18.0452 3.75 18.3991 3.75 18.8368C3.75 19.2746 4.08525 19.6285 4.5 19.6285H13.5C13.9147 19.6285 14.25 19.2746 14.25 18.8368C14.25 18.3991 13.9147 18.0452 13.5 18.0452H12.756C12.402 18.0388 11.25 17.9074 11.25 16.4618V14.0235C11.25 13.7757 11.2762 13.5319 11.3182 13.2928V13.292ZM15.339 6.95313C15.3517 6.95313 15.3622 6.96105 15.375 6.96105C15.9953 6.96105 16.5 7.49384 16.5 8.14855C16.5 9.7588 15.2932 11.4712 11.973 11.6873C12.1387 11.4506 12.3285 11.2313 12.5445 11.0373C13.8487 9.86726 14.7442 8.30372 15.339 6.95313ZM1.5 8.14855C1.5 7.49384 2.00475 6.96105 2.625 6.96105C2.63775 6.96105 2.64825 6.95393 2.66025 6.95313C3.25575 8.30372 4.15125 9.86726 5.4555 11.0373C5.6715 11.2313 5.86125 11.4498 6.027 11.6873C2.70675 11.4712 1.5 9.7588 1.5 8.14855ZM7.344 8.35676C7.146 8.21268 7.06275 7.94668 7.1415 7.70601L7.53075 6.43459L6.50625 5.64293C6.261 5.45293 6.20775 5.08955 6.38775 4.83068C6.49125 4.68184 6.65625 4.59318 6.831 4.59318H8.09175L8.475 3.33205C8.57175 3.02568 8.88525 2.86101 9.1755 2.96313C9.3405 3.02093 9.47025 3.15788 9.525 3.33205L9.9075 4.59318H11.1682C11.472 4.59318 11.7188 4.85284 11.7188 5.17426C11.7188 5.3603 11.6348 5.53447 11.493 5.64372L10.4685 6.43538L10.8578 7.7068C10.9508 8.01238 10.7917 8.34013 10.5015 8.43909C10.3335 8.49609 10.1498 8.46443 10.0073 8.35438L9 7.57222L7.992 8.35359C7.8 8.5048 7.5375 8.50559 7.344 8.35676Z"
                      fill="url(#paint0_linear_1_166)"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_1_166"
                        x1="7.46637"
                        y1="-24.8858"
                        x2="9.28857"
                        y2="17.9241"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#F4D77C" />
                        <stop offset="0.195" stopColor="#FFBE21" />
                        <stop offset="0.41" stopColor="#FFBE21" />
                        <stop offset="0.755" stopColor="#F3DB89" />
                        <stop offset="0.935" stopColor="#564627" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="flex justify-between w-full">
                    <p>Wins</p>
                    <p>{gameUser.wins}</p>
                  </div>
                </div>
                <div className="flex gap-[10px] w-[60%] mt-4 items-center">
                  <svg
                    width="23"
                    height="24"
                    viewBox="0 0 23 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.074 17.2624L17.5993 15.7876C19.2399 13.5157 19.4457 10.5468 18.0452 8.02214L19.074 6.99335C19.8399 7.50372 20.9743 8.34437 22.3265 6.99335C23.2248 6.09543 23.2248 4.63884 22.3265 3.74046C21.8784 3.29357 21.0596 3.01711 20.5453 3.08197C20.589 2.44349 20.3761 1.78983 19.8873 1.30131C19.0563 0.469858 17.5951 0.339448 16.6337 1.30131C15.0079 2.92741 16.6337 4.55374 16.6337 4.55374L15.7289 5.45879C14.5203 4.61653 13.0602 4.11904 11.5001 4.11904C9.94051 4.11904 8.4807 4.61676 7.27182 5.45925L6.36677 4.55374C6.36677 4.55374 7.99287 2.92764 6.36677 1.30131C5.40537 0.339448 3.94418 0.469858 3.11319 1.30131C2.62467 1.78983 2.41123 2.44349 2.45516 3.08197C1.94088 3.01734 1.12208 3.29357 0.674037 3.74046C-0.224343 4.63884 -0.224343 6.09543 0.674037 6.99335C2.02621 8.34437 3.16057 7.50372 3.92647 6.99335L4.95526 8.0226C3.60539 10.4553 3.699 13.4297 5.40146 15.7872L3.92647 17.2624C3.16034 16.7518 2.02621 15.9114 0.674037 17.2624C-0.224343 18.1601 -0.224343 19.6167 0.674037 20.5153C1.12208 20.9622 1.94088 21.2386 2.45516 21.1738C2.41146 21.8122 2.6249 22.4659 3.11319 22.9544C3.94418 23.7859 5.40537 23.9163 6.36677 22.9544C7.99287 21.3283 6.36677 19.702 6.36677 19.702L7.80979 18.2585V19.1417C8.46506 19.5214 9.15483 19.7892 9.85702 19.9506V18.0007H11.0043V20.1194C11.3327 20.1415 11.6611 20.1415 11.9875 20.1194V18.0007H13.1345V19.9506C13.8528 19.7862 14.5472 19.5152 15.1912 19.1417V18.2601L16.6333 19.7022C16.6333 19.7022 15.0074 21.3283 16.6333 22.9547C17.5947 23.9165 19.0556 23.7861 19.8869 22.9547C20.3756 22.4661 20.5888 21.8125 20.5449 21.174C21.0592 21.2386 21.878 20.9624 22.326 20.5155C23.2244 19.6171 23.2244 18.1605 22.326 17.2626C20.9741 15.9114 19.8399 16.7518 19.074 17.2624ZM6.72833 14.096C5.61651 13.1746 5.38076 11.6288 6.20278 10.6411C7.12347 9.53324 8.71875 9.71287 9.69533 10.5238C10.8051 11.4448 11.0385 12.9917 10.2211 13.9778C9.3823 14.9854 7.80979 14.9971 6.72833 14.096ZM12.4234 17.0384C11.9148 17.0384 11.5001 16.6257 11.5001 16.1158C11.5001 16.6257 11.088 17.0384 10.5771 17.0384C10.0672 17.0384 9.65393 16.6257 9.65393 16.1158C9.65393 15.1931 11.5001 14.0859 11.5001 14.0859C11.5001 14.0859 13.3463 15.1931 13.3463 16.1158C13.3463 16.6257 12.9342 17.0384 12.4234 17.0384ZM16.2749 14.0923C15.2986 14.9033 13.7031 15.0829 12.7824 13.975C11.9604 12.9871 12.1961 11.4413 13.3079 10.5199C14.3892 9.61903 15.9617 9.6303 16.8009 10.6384C17.6186 11.6246 17.3847 13.1714 16.2749 14.0923Z"
                      fill="url(#paint0_linear_1_176)"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_1_176"
                        x1="0.000251763"
                        y1="12.3229"
                        x2="23.0003"
                        y2="12.3229"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0.51" stopColor="#FE2525" />
                        <stop offset="1" stopColor="#FF191A" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex justify-between w-full">
                    <p>Losses</p>
                    <p>{gameUser.losses}</p>
                  </div>
                </div>
                <div className="flex gap-[10px] w-[60%] mt-4 items-center">
                  <svg
                    width="25"
                    height="16"
                    viewBox="0 0 25 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12.5 3.01229C9.4071 3.00988 8.40027 0.844513 5.89277 0.844513C-0.579325 0.844513 -0.927671 15.4111 3.96951 15.4111C7.12439 15.4111 7.45328 10.2513 9.83397 10.2513H15.166C17.5467 10.2513 17.8755 15.4111 21.0305 15.4111C25.9277 15.4111 25.5793 0.844514 19.1072 0.844514C16.5997 0.844513 15.5929 3.00988 12.5 3.01229ZM5.91364 3.12447C6.47779 3.12447 6.9393 3.586 6.9393 4.15015V5.04766H7.83682C8.40096 5.04766 8.86257 5.50922 8.86257 6.07332C8.86257 6.63747 8.40096 7.09903 7.83682 7.09903H6.9393V7.99652C6.9393 8.56066 6.47779 9.02226 5.91364 9.02226C5.3495 9.02226 4.88797 8.56066 4.88797 7.99652V7.09903H3.99045C3.4263 7.09903 2.9647 6.63747 2.9647 6.07332C2.9647 5.50922 3.4263 5.04766 3.99045 5.04766H4.88797V4.15015C4.88798 3.586 5.3495 3.12447 5.91364 3.12447ZM19.1324 3.16034C19.6394 3.16034 20.0504 3.57138 20.0504 4.07839C20.0504 4.5854 19.6394 4.99643 19.1324 4.99643C18.6253 4.99643 18.2144 4.5854 18.2144 4.07839C18.2144 3.57138 18.6253 3.16034 19.1324 3.16034ZM19.1324 7.15026C19.6394 7.15026 20.0504 7.56129 20.0504 8.0683C20.0504 8.5753 19.6394 8.98633 19.1324 8.98633C18.6253 8.98633 18.2144 8.5753 18.2144 8.0683C18.2144 7.56129 18.6253 7.15026 19.1324 7.15026ZM22.0454 6.07337C22.0454 6.58036 21.6344 6.99141 21.1273 6.99141C20.6203 6.99141 20.2093 6.58038 20.2093 6.07337C20.2093 5.56633 20.6203 5.15532 21.1273 5.15532C21.6344 5.15532 22.0454 5.56631 22.0454 6.07337ZM18.0554 6.07337C18.0554 6.58036 17.6444 6.99141 17.1374 6.99141C16.6304 6.99141 16.2194 6.58038 16.2194 6.07337C16.2194 5.56633 16.6304 5.15532 17.1374 5.15532C17.6444 5.15532 18.0554 5.56631 18.0554 6.07337Z"
                      fill="url(#paint0_linear_1_183)"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_1_183"
                        x1="-0.89725"
                        y1="-5.00345"
                        x2="25.4185"
                        y2="22.0211"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0.184358" stopColor="#29ABE2" />
                        <stop offset="0.821198" stopColor="#6200D2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex justify-between w-full">
                    <p>Games Played</p>
                    <p>{gameUser.gamesPlayed}</p>
                  </div>
                </div>
              </div>
              <div onClick={() => handlePlay()}>
                <button
                  style={{
                    backgroundImage: `url(${jokDuelOnboardingBtnBg.src})`,
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                  className="h-[7%] w-[40%] flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 bottom-[18%] text-[80%]"
                >
                  <p>Play Now</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GameProfile;
