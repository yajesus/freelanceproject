// hooks/useShop.ts

import { useCallback, useState } from "react";
import { ShopItem } from "@/utils/types";

// Cache expiration time (1 hour in milliseconds)
const CACHE_EXPIRATION = 3600000;

export const useShop = () => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch shop items
  const fetchShopItems = useCallback(async (force = false) => {
    // Check if cache exists and is recent
    const cachedData = localStorage.getItem("shopItems");
    const cacheTimestamp = localStorage.getItem("shopItemsTimestamp");
    const now = Date.now();

    // Use cache if it's less than 1 hour old and not forcing refresh
    if (
      !force &&
      cachedData &&
      cacheTimestamp &&
      now - parseInt(cacheTimestamp) < CACHE_EXPIRATION
    ) {
      setShopItems(JSON.parse(cachedData));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/shop/items");
      if (!response.ok) throw new Error("Failed to fetch shop items");
      const data = await response.json();
      setShopItems(data.shopItems);
      // Cache the result
      localStorage.setItem("shopItems", JSON.stringify(data.shopItems));
      localStorage.setItem("shopItemsTimestamp", now.toString());
    } catch (error) {
      console.error("Error fetching shop items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    shopItems,
    isLoading,
    fetchShopItems,
  };
};
