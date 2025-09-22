/**
 * Cache manager utility for handling special upgrades cache invalidation
 */

export interface CacheVersion {
  version: string;
}

/**
 * Check if special upgrades cache needs to be invalidated
 */
export const checkSpecialUpgradesVersion = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/upgrade/special-version');
    if (!response.ok) return false;
    
    const { version } = await response.json();
    const cachedVersion = localStorage.getItem('specialUpgradesVersion');
    
    console.log('Checking special upgrades version:', { version, cachedVersion });
    
    // If versions don't match, invalidate cache
    if (cachedVersion !== version) {
      console.log('Special upgrades version changed, invalidating cache');
      localStorage.removeItem('upgrades');
      localStorage.removeItem('upgradesTimestamp');
      localStorage.setItem('specialUpgradesVersion', version);
      return true; // Cache needs refresh
    }
    
    return false; // Cache is still valid
  } catch (error) {
    console.error('Error checking special upgrades version:', error);
    return false;
  }
};

/**
 * Check if special upgrades cache needs to be invalidated (silent version)
 */
export const checkSpecialUpgradesVersionSilent = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/upgrade/special-version');
    if (!response.ok) return false;
    
    const { version } = await response.json();
    const cachedVersion = localStorage.getItem('specialUpgradesVersion');
    
    // If versions don't match, invalidate cache
    if (cachedVersion !== version) {
      localStorage.removeItem('upgrades');
      localStorage.removeItem('upgradesTimestamp');
      localStorage.setItem('specialUpgradesVersion', version);
      return true; // Cache needs refresh
    }
    
    return false; // Cache is still valid
  } catch (error) {
    return false;
  }
};

/**
 * Invalidate upgrades cache
 */
export const invalidateUpgradesCache = (): void => {
  localStorage.removeItem('upgrades');
  localStorage.removeItem('upgradesTimestamp');
};

/**
 * Get current special upgrades version from cache
 */
export const getCachedSpecialUpgradesVersion = (): string | null => {
  return localStorage.getItem('specialUpgradesVersion');
};

/**
 * Set special upgrades version in cache
 */
export const setCachedSpecialUpgradesVersion = (version: string): void => {
  localStorage.setItem('specialUpgradesVersion', version);
}; 