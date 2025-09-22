import Image from "next/image";
import {
  adPlayIcon,
  congratsTop,
  energyIcon,
  recoveryBg,
  starIcon,
  watchAdBg,
} from "../images";
import { useEffect, useRef, useState } from "react";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import { useGameStore } from "@/utils/game-mechanics";
import toast from "react-hot-toast";
import StarSelectionPopup from "@/components/popups/StarSelectionPopup";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "next-intl";

interface RecoverEnergyProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameUser: any;
  increaseEnergy: (amount: number) => void;
  telegramId: any;
}

declare global {
  interface Window {
    Sonar?: {
      show: (options: { adUnit: string }) => void;
    };
  }
}

const RecoverEnergy: React.FC<RecoverEnergyProps> = ({
  currentView,
  setCurrentView,
  gameUser,
  increaseEnergy,
  telegramId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [energy, setEnergy] = useState(gameUser.energy);
  const [watchedAds, setWatchedAds] = useState(gameUser.watchedAds);
  const { setTotalStars, totalStars, userTelegramInitData } = useGameStore();
  const showToast = useToast();
  const t = useTranslations("Shop");
  const [popupMode, setPopupMode] = useState<"spend" | "topup">("spend");
  const [showStarPopup, setShowStarPopup] = useState<boolean>(false);
  useEffect(() => {
    setEnergy(gameUser.energy);
  }, [gameUser.energy]);
  const handleWatch = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  useEffect(() => {
    handleWatch();
  }, []);

  useEffect(() => {
    const checkSonar = setInterval(() => {
      if (window.Sonar) {
        console.log("✅ Sonar SDK loaded");
        clearInterval(checkSonar);
      } else {
        console.warn("⏳ Waiting for Sonar SDK...");
      }
    }, 500);

    return () => clearInterval(checkSonar);
  }, []);

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

  const handleAddEnergy = () => {
    if (energy === 50) {
      toast.error("You have full energy");
      return;
    } else if (watchedAds >= 5) {
      toast.error("You have watched 5 ads today");
      return;
    }
    if (typeof window !== "undefined" && window.Sonar?.show) {
      try {
        const result = window.Sonar.show({ adUnit: "adjokduel" }) as any;
        if (result?.then instanceof Function) {
          result
            .then(() => {
              handleIncreaseEnergy();
            })
            .catch((err: any) => {
              console.error("Ad failed", err);
            });
        } else {
          handleIncreaseEnergy();
        }
      } catch (err) {
        console.error("Error calling Sonar.show:", err);
      }
    } else {
      handleIncreaseEnergy();
    }
  };
  const handleIncreaseEnergy = () => {
    if (energy + 10 <= 50) {
      increaseEnergy(10);
      setWatchedAds(watchedAds + 1);
      //@ts-ignore
      setEnergy((prev) => prev + 10);
    }
  };

  const handlePurchase = async (starsToUse: number) => {
    try {
      if (starsToUse < 100) {
        return handleTopUpProcess(100 - starsToUse);
      } else {
        const response = await fetch("/api/shop/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initData: userTelegramInitData,
            itemId: "67f38213725acb7fc9180112",
            starsToUse: starsToUse,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Purchase failed");
        }
      }

      handleFill();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
      return { success: false };
    }
  };

  const handleAddFullEnergy: () => Promise<void> = async () => {
    if (totalStars >= 1) {
      setPopupMode("spend");
      setShowStarPopup(true);
    } else {
      await handleTopUpProcess(100);
      setShowStarPopup(false);
    }
  };

  const handleFill = (amount = 100) => {
    setTotalStars(totalStars - amount);
    increaseEnergy(50);
    setEnergy(50);
    toast.success("Energy fully restored!");
  };

  const handleTopUpProcess = async (starsToUse: number) => {
    try {
      const res = await fetch("/api/user/star-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData: userTelegramInitData,
          topupAmount: starsToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Top up failed");
      const WebApp = (await import("@twa-dev/sdk")).default;
      WebApp.ready();
      WebApp.openInvoice(data.invoiceLink, (status: string) => {
        if (status === "paid") {
          fetch("/api/user/set-stars", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telegramId: telegramId.toString(),
              stars: -100 + starsToUse,
            }),
          });
          handleFill(100 - starsToUse);
          return { success: true };
        } else {
          showToast("Payment not completed", "error");
          return { success: false };
        }
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Top-up error", "error");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        muted
        playsInline
        loop
      >
        <source src={recoveryBg} type="video/mp4" />
      </video>
      <div className="relative z-50">
        <div
          className="w-full h-[100px] rounded-[31px] pt-1"
          style={{
            background:
              "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
          }}
        >
          <div className="bg-[#000314] h-full w-full rounded-t-[31px]"></div>
        </div>
        <div>
          <Image
            priority={false}
            src={congratsTop}
            alt="not found"
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <div>
            <h1 className="absolute left-[35%] transform rotate-[-10deg]  -translate-x-1/2 top-[72%] font-extralight text-[20px] rounded-[10px]">
              R
            </h1>
            <h1 className="absolute left-[40%] transform rotate-[-7deg]  -translate-x-1/2 top-[68%] font-extralight text-[20px] rounded-[10px]">
              E
            </h1>
            <h1 className="absolute left-[45%] transform rotate-[0deg]  -translate-x-1/2 top-[65%] font-extralight text-[20px] rounded-[10px]">
              C
            </h1>
            <h1 className="absolute left-[50%] transform rotate-[0deg]  -translate-x-1/2 top-[64%] font-extralight text-[20px] rounded-[10px]">
              O
            </h1>
            <h1 className="absolute left-[55%] transform rotate-[5deg]  -translate-x-1/2 top-[66%] font-extralight text-[20px] rounded-[10px]">
              V
            </h1>
            <h1 className="absolute left-[60%] transform rotate-[7deg]  -translate-x-1/2 top-[68%] font-extralight text-[20px] rounded-[10px]">
              E
            </h1>
            <h1 className="absolute left-[65%] transform rotate-[12deg]  -translate-x-1/2 top-[72%] font-extralight text-[20px] rounded-[10px]">
              R
            </h1>
          </div>
          <h1 className="absolute left-1/2 -translate-x-1/2 top-[87%] font-extralight text-[20px] rounded-[10px] tracking-[4px]">
            Energy
          </h1>
          <div className="absolute top-[150%] left-1/2 -translate-x-1/2 flex items-center gap-1">
            <svg
              width="18"
              height="20"
              viewBox="0 0 10 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.90474 5.28861C8.80557 6.8574 6.51895 10.1633 5.43528 11.7131C5.12591 12.1578 4.4278 11.9032 4.47808 11.3637L4.8197 7.67869C4.84873 7.36995 4.60507 7.10308 4.295 7.10308C-1.88655 7.09847 -0.0212987 7.99211 1.54831 0.472841C1.60839 0.240245 1.81853 0.0771484 2.05897 0.0771484H6.9603C7.30578 0.0771484 7.55785 0.404605 7.46951 0.739143L6.65991 3.7983C6.57163 4.13284 6.82364 4.46029 7.16912 4.46029H9.47218C9.89766 4.46036 10.1478 4.93927 9.90474 5.28861Z"
                fill="#4ECDEA"
              />
              <path
                d="M7.34443 8.97155L5.43776 11.7123C5.12839 12.1571 4.43028 11.9025 4.48056 11.363L4.82218 7.67793C4.85121 7.36919 4.60754 7.10232 4.29748 7.10232H0.527381C0.183168 7.10232 -0.0688426 6.77745 0.0168472 6.44418L1.55092 0.4722C1.66272 -0.173035 2.95743 0.148919 3.37633 0.0764458L2.50166 4.41381C2.39592 4.93718 2.79623 5.42646 3.33061 5.42646H5.79221C6.36137 5.42646 6.76813 5.9776 6.59985 6.52159L6.18089 7.87649C5.97099 8.63404 6.65335 9.07716 7.34443 8.97155Z"
                fill="#4F9CE8"
              />
            </svg>
            <h1 className="text-[20px] font-extralight">{energy}</h1>
          </div>
        </div>
        <div className="absolute top-[180%] left-1/2 -translate-x-1/2">
          <Image
            priority={false}
            src={energyIcon}
            alt="not found"
            width={30}
            height={30}
            className="absolute z-10"
          />
          <div
            className="w-[100px] h-[20px] rounded-[7px] mt-1 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
            }}
          >
            <div className="bg-white border-[#F4D77C] border-[2px] border-r-[3px] w-[90%] h-[14px] rounded-[7px]">
              <div
                className={`h-full ml-[18px] rounded-[7px]`}
                style={{
                  width: `${energy !== 0 ? energy + 18 : 0}px`,
                  background: "linear-gradient(to right, #004989, #004989)",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-[35%] w-[300px] transform -translate-x-1/2 left-1/2"
        onClick={() => handleAddEnergy()}
      >
        <Image priority={false} width={300} src={watchAdBg} alt="not found" />
        <Image
          priority={false}
          src={adPlayIcon}
          width={30}
          className="absolute z-10 top-[22%] left-[7%]"
          alt="not found"
        />
        <h1 className="absolute z-10 text-[15px] top-[20%] right-[8%] font-extralight">
          Watch an add gain +10 energy
        </h1>
        <p className="absolute z-10 text-[12px] top-[50%] right-[22%] font-extralight">
          Watched <span className="text-[#D1EB30]">{watchedAds}</span> /{" "}
          <span className="text-[#D1EB30]">5</span> ads today
        </p>
      </div>
      <div
        onClick={() =>
          energy >= 50 ? toast("You have full energy") : handleAddFullEnergy()
        }
        className="absolute bottom-[25%] w-[300px] transform -translate-x-1/2 left-1/2"
      >
        <Image priority={false} width={300} src={watchAdBg} alt="not found" />
        <Image
          priority={false}
          src={starIcon}
          width={30}
          className="absolute z-10 top-[22%] left-[7%]"
          alt="not found"
        />
        <h1 className="absolute z-10 text-[15px] top-[17%] right-[4%] font-extralight w-[80%] text-center">
          Spend 100 stars ,restore full energy (50)
        </h1>
      </div>
      <div className="flex items-center justify-center gap-1 bottom-[20%] absolute z-[30] transform left-1/2 -translate-x-1/2 w-full">
        <h1 className="font-extralight text-[15px]">
          +0.2 Energy every 60 seconds
        </h1>
      </div>

      {showStarPopup && (
        <StarSelectionPopup
          onClose={() => setShowStarPopup(false)}
          onConfirm={handlePurchase}
          selectedItem={{
            id: "game_energy",
            name: "Game Energy",
            description: "Restore full energy",
            category: "ENERGY",
            image: "/game_energy.png",
            isBasic: false,
            price: 100,
          }}
          mode={popupMode}
          maxStars={popupMode === "topup" ? 1000 : 100}
          title={popupMode === "spend" ? "spending" : "adding"}
          onBack={() => setCurrentView("recoverEnergy")}
        />
      )}
    </div>
  );
};
export default RecoverEnergy;
