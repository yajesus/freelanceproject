// utils/prizes.ts
import { calculateYieldPerHour } from "@/utils/calculations";

export const handlePrizeResult = async (
  prize: any,
  userTelegramInitData: string,
  premiumAvatarsOrBg: any[],
  updateStoreFns: {
    setTotalStars: Function;
    setUpgradeYieldPerHour: Function;
  }
) => {
  const { setTotalStars, setUpgradeYieldPerHour } = updateStoreFns;

  if (!prize?.result) return;

  const { result } = prize;

  const handlePurchase = async (itemId: string) => {
    await fetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: userTelegramInitData,
        itemId,
        starsToUse: 0,
      }),
    });
    await fetch("/api/shop/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: userTelegramInitData, itemId }),
    });
  };

  if (result.multiplier) {
    const newYield =
      calculateYieldPerHour(result.bonus || 0, result.base || 1) *
      result.multiplier;
    setUpgradeYieldPerHour(newYield);

    await fetch("/api/upgrade/skill/set-yield", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: userTelegramInitData, newYield }),
    });
  } else if (result.stars != null) {
    await fetch("/api/user/star-topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: userTelegramInitData,
        stars: result.stars,
      }),
    });
    setTotalStars((prev: number) => prev + result.stars);
  } else if (result.reward) {
    switch (result.reward) {
      case "12h offline boost":
        await handlePurchase("676aa086c85403d2eb12a89a");
        break;
      case "3 mini-friends":
        await handlePurchase("676aa087c85403d2eb12a8a3");
        break;
      case "5 mini-friends, 2d offline boost, 12h reward boost":
        await Promise.all([
          handlePurchase("676aa088c85403d2eb12a8a4"),
          handlePurchase("676aa086c85403d2eb12a89c"),
          handlePurchase("676aa087c85403d2eb12a89f"),
        ]);
        break;
      case "All combined":
        await Promise.all([
          handlePurchase("676aa086c85403d2eb12a89a"),
          handlePurchase("676aa088c85403d2eb12a8a4"),
          handlePurchase("676aa086c85403d2eb12a89c"),
          handlePurchase("676aa087c85403d2eb12a89f"),
        ]);
        break;
      case "Premium avatars or backgrounds":
        const randomItem =
          premiumAvatarsOrBg[
            Math.floor(Math.random() * premiumAvatarsOrBg.length)
          ];
        if (randomItem?.id) await handlePurchase(randomItem.id);
        break;
      case "7-day boost":
        await handlePurchase("676aa087c85403d2eb12a89e");
        break;
    }
  }
};
