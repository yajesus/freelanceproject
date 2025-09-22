// hooks/useUpgrades.ts

import { useCallback, useEffect, useState } from 'react';
import { UpgradeItem } from '@/utils/types';
import { checkSpecialUpgradesVersion, checkSpecialUpgradesVersionSilent } from '@/utils/cache-manager';

// Cache expiration time (1 hour in milliseconds)
const CACHE_EXPIRATION = 3600000;

export const useUpgrades = () => {
  // Check if we have cached data to determine initial loading state
  const cachedUpgrades = typeof window !== 'undefined' ? localStorage.getItem('upgrades') : null;
  const initialUpgrades = cachedUpgrades ? JSON.parse(cachedUpgrades) : [];
  
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(initialUpgrades);
  const [unlockRequirements, setUnlockRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(!cachedUpgrades);

  // Fetch upgrades with caching
  const fetchUpgrades = useCallback(async (force = false, showLoading = true) => {
    // Check if special upgrades have changed
    const needsRefresh = await checkSpecialUpgradesVersion();
    
    // Check cache first if not forcing refresh and no special upgrades changes
    if (!force && !needsRefresh) {
      const cachedUpgrades = localStorage.getItem('upgrades');
      const cacheTimestamp = localStorage.getItem('upgradesTimestamp');
      const now = Date.now();

      if (cachedUpgrades && cacheTimestamp && now - parseInt(cacheTimestamp) < CACHE_EXPIRATION) {
        setUpgrades(JSON.parse(cachedUpgrades));
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
    }

    // If we have cached data, show it immediately while fetching fresh data
    const cachedUpgrades = localStorage.getItem('upgrades');
    if (cachedUpgrades && !force) {
      setUpgrades(JSON.parse(cachedUpgrades));
      setIsLoading(false);
    } else if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      const response = await fetch('/api/upgrade/skill');
      if (!response.ok) throw new Error('Failed to fetch upgrades');
      const data = await response.json();
      setUpgrades(data.upgrades);

      // Cache the result
      localStorage.setItem('upgrades', JSON.stringify(data.upgrades));
      localStorage.setItem('upgradesTimestamp', Date.now().toString());
    } catch (error) {
      console.error('Error fetching upgrades:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Background refresh function for version checking
  const backgroundRefresh = useCallback(async () => {
    const needsRefresh = await checkSpecialUpgradesVersionSilent();
    if (needsRefresh) {
      // Fetch new data without showing loading state
      await fetchUpgrades(true, false);
    }
  }, [fetchUpgrades]);

  // Fetch unlock requirements with caching
  const fetchUnlockRequirements = useCallback(async (force = false) => {
    // Check cache first if not forcing refresh
    if (!force) {
      const cachedRequirements = localStorage.getItem('unlockRequirements');
      const cacheTimestamp = localStorage.getItem('unlockRequirementsTimestamp');
      const now = Date.now();

      if (cachedRequirements && cacheTimestamp && now - parseInt(cacheTimestamp) < CACHE_EXPIRATION) {
        setUnlockRequirements(JSON.parse(cachedRequirements));
        return;
      }
    }

    try {
      const response = await fetch('/api/upgrade/unlockrequirement');
      if (!response.ok) throw new Error('Failed to fetch unlock requirements');
      const data = await response.json();
      setUnlockRequirements(data.unlockRequirements);

      // Cache the result
      localStorage.setItem('unlockRequirements', JSON.stringify(data.unlockRequirements));
      localStorage.setItem('unlockRequirementsTimestamp', Date.now().toString());
    } catch (error) {
      console.error('Error fetching unlock requirements:', error);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    fetchUpgrades();
    fetchUnlockRequirements();
  }, [fetchUpgrades, fetchUnlockRequirements]);

  return {
    upgrades,
    unlockRequirements,
    isLoading,
    fetchUpgrades,
    fetchUnlockRequirements,
    backgroundRefresh
  };
};
