import { useEffect } from "react";
import { blueChestLoadingBg, redChestLoadingBg } from "../images";
import { showBackButton } from "@/utils/ui";
import { useShop } from "@/hooks/useShop";

interface ChestLoadingProps {
  setCurrentView: (view: string) => void;
  leaderBoardInfo: any;
  chestOpeningView: any;
}

const ChestLoading = ({
  setCurrentView,
  leaderBoardInfo,
  chestOpeningView,
}: ChestLoadingProps) => {
  setTimeout(() => {
    setCurrentView(chestOpeningView);
  }, 3000);
  const { fetchShopItems } = useShop()
  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        if (chestOpeningView === "win") {
          setCurrentView("onboarding");
        } else {
          setCurrentView("myjok");
        }
      });
    };
    fetchShopItems()
    setupBackButton();
  }, []);
  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] pt-[3px] rounded-t-[48px] relative top-glow z-0 font-extralight">
          <div
            className="w-full h-screen flex items-start pt-[50%] justify-center rounded-t-[48px] relative z-10 "
            style={{
              backgroundImage: `url(${chestOpeningView == "dailyChest" ? blueChestLoadingBg.src : redChestLoadingBg.src})`,
              backgroundSize: "cover",
              backgroundPosition: "top center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="spinner">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="spinner-blade"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChestLoading;
