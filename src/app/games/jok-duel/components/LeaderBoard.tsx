import Image from "next/image";
import { cup, jokDuelOnboardingBg } from "../images";
import { useEffect, useState } from "react";
import { LeaderBoardItem } from "./LeaderBoardItem";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";

interface LeaderBoardProps {
  setCurrentView: (view: string) => void;
  leaderBoardInfo: any;
  telegramId: string;
}

const LeaderBoard = ({
  setCurrentView,
  leaderBoardInfo,
  telegramId,
}: LeaderBoardProps) => {
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

  const [settings, setSettings] = useState(false);
  const [selectedPerm, setSelectedPerm] = useState<string>("byAllTime");
  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0 font-extralight">
          <div
            style={{ backgroundImage: `url(${jokDuelOnboardingBg.src})` }}
            className="w-full h-[110vh] mt-[2px] bg-cover bg-center rounded-t-[46px] overflow-y-auto no-scrollbar p-[20px]"
          >
            <div className="flex justify-center items-center gap-[10px]">
              <svg
                width="23"
                height="21"
                viewBox="0 0 23 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.5596 7.21252L15.4615 5.5792L12.0239 0.284763C11.7774 -0.0949209 11.2217 -0.0949209 10.9751 0.284763L7.53758 5.5792L1.43947 7.21252C1.00222 7.32965 0.830449 7.85818 1.11535 8.20998L5.08871 13.1159L4.75754 19.4197C4.73378 19.8717 5.18341 20.1984 5.60603 20.0361L11.4995 17.7733L17.393 20.0362C17.8156 20.1985 18.2653 19.8718 18.2415 19.4197L17.9103 13.116L21.8837 8.21002C22.1686 7.85822 21.9968 7.32965 21.5596 7.21252Z"
                  fill="#FFF04A"
                />
                <path
                  d="M5.00977 19.9544C5.17249 20.0749 5.39258 20.1177 5.6059 20.0357L11.4994 17.7729V10.814L5.00977 19.9544Z"
                  fill="#FFDA45"
                />
                <path
                  d="M17.9896 19.9544C18.1493 19.8362 18.2537 19.6431 18.242 19.4193L17.9108 13.1155L11.5 10.814L17.9896 19.9544Z"
                  fill="#FFDA45"
                />
                <path
                  d="M17.9108 13.1156L21.8842 8.20957C22.0289 8.03092 22.0556 7.80675 21.9897 7.61401L11.5 10.814L17.9108 13.1156Z"
                  fill="#FFBC36"
                />
                <path
                  d="M11.5 10.8155L21.9897 7.61546C21.9259 7.42864 21.7753 7.27129 21.5601 7.21364L15.4619 5.58032L11.5 10.8155Z"
                  fill="#FFDA45"
                />
                <path
                  d="M15.4619 5.57941L12.0244 0.284976C11.9012 0.0951546 11.7006 0.000244141 11.5 0.000244141V10.8146L15.4619 5.57941Z"
                  fill="#FFBC36"
                />
                <path
                  d="M1.00977 7.61546L11.4995 10.8155L7.53754 5.58032L1.43943 7.21368C1.22422 7.27129 1.07354 7.42864 1.00977 7.61546Z"
                  fill="#FFFD78"
                />
                <path
                  d="M11.4994 10.814L1.00964 7.61401C0.943823 7.80679 0.9705 8.03096 1.11518 8.20957L5.08858 13.1156L11.4994 10.814Z"
                  fill="#FFDA45"
                />
                <path
                  d="M17.9896 19.9544L11.5 10.814V17.7729L17.3935 20.0358C17.6068 20.1177 17.8269 20.0749 17.9896 19.9544Z"
                  fill="#FFBC36"
                />
              </svg>
              <h2 className="text-[18px] text-center">ranking system</h2>
            </div>
            {leaderBoardInfo[selectedPerm] &&
              leaderBoardInfo[selectedPerm].length > 0 &&
              isNaN(leaderBoardInfo["my" + selectedPerm.slice(2)]?.rank) && (
                <div className="mt-4">
                  <LeaderBoardItem
                    isMine={true}
                    item={leaderBoardInfo["my" + selectedPerm.slice(2)]}
                    isMineTop={true}
                  />
                </div>
              )}

            <div className="bg-[#1D1D1D] border-[#1D1D1D] rounded-[20px] p-2 mt-[20px]">
              <p
                className="text-[32px] text-center font-bold text-transparent whitespace-nowrap"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                leaderboard
              </p>
              <div className="flex justify-center items-center gap-[10px]">
                <h1>Best Duel Winners</h1>
                <Image
                  priority={false}
                  src={cup}
                  alt="cup"
                  width={21}
                  height={25}
                />
              </div>
              <div className="w-full flex justify-end mt-[10px] relative">
                <div
                  onClick={() => setSettings(!settings)}
                  className="w-[35px] h-[35px] flex items-center justify-center border border-[#565656] rounded-[10px]"
                >
                  <svg
                    width="17"
                    height="15"
                    viewBox="0 0 17 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.1406 6.47852C11.5122 6.47852 10.1875 5.15383 10.1875 3.52539C10.1875 1.89695 11.5122 0.572266 13.1406 0.572266C14.7691 0.572266 16.0938 1.89695 16.0938 3.52539C16.0938 5.15383 14.7691 6.47852 13.1406 6.47852ZM13.1406 2.25977C12.4428 2.25977 11.875 2.82761 11.875 3.52539C11.875 4.22317 12.4428 4.79102 13.1406 4.79102C13.8384 4.79102 14.4062 4.22317 14.4062 3.52539C14.4062 2.82761 13.8384 2.25977 13.1406 2.25977Z"
                      fill="white"
                    />
                    <path
                      d="M11.0312 4.20117H1.75C1.28425 4.20117 0.90625 3.82317 0.90625 3.35742C0.90625 2.89167 1.28425 2.51367 1.75 2.51367H11.0312V4.20117Z"
                      fill="white"
                    />
                    <path
                      d="M3.85938 14.4287C2.23094 14.4287 0.90625 13.104 0.90625 11.4756C0.90625 9.84715 2.23094 8.52246 3.85938 8.52246C5.48781 8.52246 6.8125 9.84715 6.8125 11.4756C6.8125 13.104 5.48781 14.4287 3.85938 14.4287ZM3.85938 10.21C3.16159 10.21 2.59375 10.7778 2.59375 11.4756C2.59375 12.1734 3.16159 12.7412 3.85938 12.7412C4.55716 12.7412 5.125 12.1734 5.125 11.4756C5.125 10.7778 4.55716 10.21 3.85938 10.21Z"
                      fill="white"
                    />
                    <path
                      d="M15.25 12.4873H5.96875V10.7998H15.25C15.7157 10.7998 16.0938 11.1778 16.0938 11.6436C16.0938 12.1093 15.7157 12.4873 15.25 12.4873Z"
                      fill="white"
                    />
                  </svg>
                </div>

                {settings && (
                  <div className="w-[83px] h-[95px] absolute top-[35px] right-0 bg-black border border-[#565656] flex flex-col pt-2 text-[12px] text-center gap-1 rounded-[10px] z-50">
                    <h1
                      onClick={() => {
                        setSelectedPerm("byWeek");
                        setSettings(false);
                      }}
                      style={{
                        color:
                          selectedPerm === "byWeek" ? "#44F756" : "#FFFFFF",
                      }}
                    >
                      BY WEEK
                    </h1>
                    <hr className="border-[#565656]" />
                    <h1
                      onClick={() => {
                        setSelectedPerm("byMonth");
                        setSettings(false);
                      }}
                      style={{
                        color:
                          selectedPerm === "byMonth" ? "#44F756" : "#FFFFFF",
                      }}
                    >
                      BY MONTH
                    </h1>
                    <hr className="border-[#565656]" />
                    <h1
                      onClick={() => {
                        setSelectedPerm("byAllTime");
                        setSettings(false);
                      }}
                      style={{
                        color:
                          selectedPerm === "byAllTime" ? "#44F756" : "#FFFFFF",
                      }}
                    >
                      All the time
                    </h1>
                    <hr className="border-[#565656]" />
                  </div>
                )}
              </div>
              {leaderBoardInfo[selectedPerm] &&
                leaderBoardInfo[selectedPerm].length > 0 && (
                  <div
                    className={`mt-4 overflow-y-auto flex flex-col gap-2 ${
                      isNaN(leaderBoardInfo["my" + selectedPerm.slice(2)]?.rank)
                        ? "max-h-[calc(100vh-440px)]"
                        : "max-h-[calc(100vh-350px)]"
                    }`}
                  >
                    {leaderBoardInfo[selectedPerm].map((item: any) => (
                      <LeaderBoardItem
                        key={item.rank}
                        item={item}
                        isMine={item.telegramId === telegramId.toString()}
                        isMineTop={false}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LeaderBoard;
