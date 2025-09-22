import { useEffect, useRef, useState } from "react";
import { gameBgBlur1, gameBgBlur2, gameBgBlur3, gameBgBlur4, gameBgBlur5, gameBgBlur6, gameBgBlur7 } from "../images";
import { useGameStore } from "@/utils/game-mechanics";
import { calculateYieldPerHour } from "@/utils/calculations";

interface RecoverEnergyProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameId: any;
  updateDuelGame: any;
  updateDuelGameUser: any;
  gameUser: any;
  telegramId: string;
}

const GameEndLoading: React.FC<RecoverEnergyProps> = ({
  currentView,
  setCurrentView,
  gameId,
  updateDuelGame,
  updateDuelGameUser,
  gameUser,
  telegramId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [win, setWin] = useState<string | null>(null);
  const [prizeTaken, setPrizeTaken] = useState<boolean>(false);
  const bg = JSON.parse(localStorage.getItem("bg") || "");
  const backgrounds = [gameBgBlur1, gameBgBlur2, gameBgBlur3, gameBgBlur4, gameBgBlur5, gameBgBlur6, gameBgBlur7];
  const [prize, setPrize] = useState<any>(null);
  const {
    totalStars,
    setTotalStars,
    userTelegramInitData,
    bonusYieldPerHour,
    upgradeYieldPerHour,
    setEquippedAvatar,
    setEquippedWallpaper,
    setOfflineBoost,
    setRewardBoost,
    setPoints,
    setPointsBalance,
    points,
    incrementFakeFriends,
    addToInventory,
  } = useGameStore();
  interface ShopItem {
    id: string;
    category: string;
    name?: string;
    image?: string;
  }

  const shopItems: ShopItem[] = JSON.parse(
    localStorage.getItem("shopItems") || "[]"
  );
  const premiumAvatars = shopItems.filter(
    (item: any) => item.category === "AVATAR"
  );
  const premiumBgs = shopItems.filter(
    (item: any) => item.category === "BACKGROUND"
  );

  useEffect(() => {

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchGameResult = async () => {
      try {
        const response = await fetch(`/api/duelGame?gameId=${gameId.current}`);
        const data = await response.json();

        if (!response.ok) {
          console.error("❌ Failed to fetch game data:", data.error || data);
          return;
        }
        let myScore =
          data.data.round1.me + data.data.round2.me + data.data.round3.me;
        let pcScore =
          data.data.round1.pc + data.data.round2.pc + data.data.round3.pc;

        setGameResult({ me: myScore, pc: pcScore });

        // Determine winner
        const userWin = data.data.status
        setWin(userWin);
        await updateDuelGameUser({
          wins: gameUser.wins + (userWin == "win" ? 1 : 0),
          draws: gameUser.draws + (userWin == "draw" ? 1 : 0),
          losses: gameUser.losses + (userWin == "lose" ? 1 : 0),
        });
        if (userWin === "draw") {
          localStorage.setItem("gameResult", JSON.stringify(gameResult));
          localStorage.setItem("userWin", "draw");
          localStorage.setItem("prizeTaken", String(false));
          setTimeout(() => {
            setCurrentView("finish");
          }, 1000);
        }
        if (userWin !== "win") {
          localStorage.removeItem("prizeTaken");
        }
        const storedPrizeTaken = localStorage.getItem("prizeTaken");
        setPrizeTaken(storedPrizeTaken === "true");
        if (userWin == "win") {
          handleGetReward(data.data.prizeId);
        }
        if (userWin == "lose") {
          let yieldPerHour = calculateYieldPerHour(
            bonusYieldPerHour,
            upgradeYieldPerHour
          );
          if (yieldPerHour < 2000) {
            await fetch("/api/user/set-multiplier", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telegramId: telegramId.toString(),
              }),
            });
            const yieldPerHour = bonusYieldPerHour + upgradeYieldPerHour;
            localStorage.setItem("earned", String(yieldPerHour + 400));
            setPoints(points + yieldPerHour + 400);
            setPointsBalance(points + yieldPerHour + 400);
          } else {
            await fetch("/api/user/set-multiplier", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telegramId: telegramId.toString(),
                multiplier: 1.2,
              }),
            });
            const yieldPerHour = bonusYieldPerHour + upgradeYieldPerHour;
            localStorage.setItem("earned", String(yieldPerHour * 1.2));
            setPoints(points + yieldPerHour * 1.2);
            setPointsBalance(points + yieldPerHour * 1.2);
          }
        }
      } catch (error) {
        console.error("⚠️ Error fetching game data:", error);
      }
    };

    fetchGameResult();
  }, []);

  const handleGetReward = async (prizeId: any) => {
    try {
      const response = await fetch(`/api/prize?id=${prizeId}`);
      const data = await response.json();
      if (!response.ok) return;

      const prizeResult = data.data.result;
      setPrize(data.data);
      if (prizeResult.multiplier != null) {
        await fetch("/api/user/set-multiplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: telegramId.toString(),
            multiplier: prizeResult.multiplier,
          }),
        });

        const yieldPerHour = bonusYieldPerHour + upgradeYieldPerHour;
        localStorage.setItem(
          "earned",
          String(yieldPerHour * prizeResult.multiplier)
        );
        setPoints(points + yieldPerHour * prizeResult.multiplier);
        setPointsBalance(points + yieldPerHour * prizeResult.multiplier);
      } else if (prizeResult.stars != null) {
        await fetch("/api/user/set-stars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: telegramId.toString(),
            stars: prizeResult.stars,
          }),
        });
        setTotalStars(totalStars + prizeResult.stars);
      } else if (prizeResult.reward != null) {
        const handlePurchase = async (starsToUse: number, itemId: string) => {
          const response = await fetch("/api/shop/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: userTelegramInitData,
              itemId,
              starsToUse,
            }),
          });

          const result = await response.json();
          const item = shopItems.find((i) => i.id === itemId);
          if (!item) return result;
          if (item.category === "BOOST") {
            const boost = result.boost;
            if (boost.boostType === "offline") {
              setOfflineBoost(
                boost.activeOfflineBoostDuration,
                boost.activeOfflineBoostEndTime
              );
            } else if (boost.boostType === "rewards") {
              setRewardBoost(
                boost.activeRewardBoostMultiplier,
                boost.activeRewardBoostEndTime
              );
            }
          } else if (item.category === "OTHERS") {
            incrementFakeFriends(result.friends.fakeFriendsAdded || 0);
          }

          addToInventory(result.userInventoryItem);
          return result;
        };

        const handleEquipItem = async (itemId: string) => {
          const item = shopItems.find((item: any) => item.id === itemId);
          if (!item) return;

          const response = await fetch("/api/shop/equip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: userTelegramInitData,
              itemId,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          if (item.category === "AVATAR" && item.image) {
            setEquippedAvatar(item.image);
          } else if (item.category === "BACKGROUND" && item.image) {
            setEquippedWallpaper(item.image);
          }
        };

        if (prizeResult.reward === "12h offline boost") {
          await handlePurchase(0, "676aa086c85403d2eb12a89a");
        } else if (prizeResult.reward === "2-day offline boost") {
          await handlePurchase(0, "676aa086c85403d2eb12a89c");
        } else if (prizeResult.reward === "3 mini-friends") {
          await handlePurchase(0, "676aa087c85403d2eb12a8a3");
        } else if (prizeResult.reward === "12h reward boost") {
          await handlePurchase(0, "676aa087c85403d2eb12a89f");
        } else if (prizeResult.reward === "5 mini-friends") {
          await handlePurchase(0, "676aa088c85403d2eb12a8a4");
        } else if (prizeResult.reward === "3 mini-friends") {
          await handlePurchase(0, "676aa087c85403d2eb12a8a3");
        } else if (prizeResult.reward === "Premium Avatar") {
          const premiumItem =
            premiumAvatars[Math.floor(Math.random() * premiumAvatars.length)];
          if (premiumItem) {
            localStorage.setItem("premium", premiumItem.image?.toString() || "");
            localStorage.setItem("premiumName", premiumItem.name?.toString() || "");
            await handlePurchase(0, premiumItem.id);
            await handleEquipItem(premiumItem.id);
          }
        } else if (prizeResult.reward === "Premium Background") {
          const premiumItem =
            premiumBgs[Math.floor(Math.random() * premiumBgs.length)];
          if (premiumItem) {
            localStorage.setItem("premium", premiumItem.image?.toString() || "");
            localStorage.setItem("premiumName", premiumItem.name?.toString() || "");
            await handlePurchase(0, premiumItem.id);
            await handleEquipItem(premiumItem.id);
          }
        } else if (prizeResult.reward === "7-day boost") {
          await handlePurchase(0, "676aa087c85403d2eb12a89e");
        }
      }
    } catch (error) {
      console.error("Error handling reward:", error);
    }
  };

  useEffect(() => {
    if (win != null && gameResult != null) {
      localStorage.setItem("gameResult", JSON.stringify(gameResult));
      localStorage.setItem("userWin", win);
      localStorage.setItem("prizeTaken", String(prizeTaken));
      setTimeout(() => {
        setCurrentView("finish");
      }, 1000);
    }
  }, [win, prizeTaken, gameId, gameUser, gameResult]);

  return (
    <div className="bg-black flex justify-center w-full h-full">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow w-full h-full mt-4 bg-gradient-to-r pt-[3px] from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div
            ref={containerRef}
            className="flex items-center justify-center rounded-t-[48px] h-full w-full bg-black"
            style={{
              backgroundImage: isVisible
                ? `url(${backgrounds[bg].src})`
                : "none",
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="flex w-screen h-screen justify-center items-center">
              <div className="spinner">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="spinner-blade"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GameEndLoading;
