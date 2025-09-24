// utils/game-mechanics.ts

import { create } from 'zustand';
import {
  calculateUpgradeBenefit,
  calculateUpgradeCooldown,
  calculateUpgradeCost,
  calculateYieldPerHour
} from './calculations';
import {
  LEVELS,
  MAX_COOLDOWN_TIME,
  MAXIMUM_INACTIVE_TIME_FOR_MINE,
  mineUpgradeBaseBenefit,
  mineUpgradeBasePrice,
  mineUpgradeBenefitCoefficient,
  mineUpgradeCostCoefficient,
  multitapUpgradeBaseBenefit,
  multitapUpgradeBasePrice,
  multitapUpgradeBenefitCoefficient,
  multitapUpgradeCostCoefficient,
  skillUpgradeBaseTime,
  skillUpgradeBenefitCoefficient,
  skillUpgradeCostCoefficient,
  skillUpgradeTimeCoefficient
} from './consts';
import { Task, UserUpgrade } from './types';
import { UserInventoryItem } from '@prisma/client';

export interface InitialGameState {
  userTelegramInitData: string;
  userTelegramName: string;

  lastClickTimestamp: number;
  gameLevelIndex: number;
  points: number;
  pointsBalance: number;
  tonBalance: number;
  unsynchronizedPoints: number;
  multitapLevelIndex: number;
  pointsPerClick: number;
  mineLevelIndex: number;
  profitPerHour: number;
  tonWalletAddress: string | null;

  userUpgrades: UserUpgrade[];
  upgradeYieldPerHour: number;
  bonusYieldPerHour: number; // Additional yield per hour awarded by AVATARs
  bonusOfflineYieldDuration: number; // Additional offline yield duration awarded by BACKGROUNDs
  lastYieldTimestamp: number;

  lastClaimRewardTimestamp: number;
  lastClaimRewardDay: number;

  twitterHandle: string;
  erc20Wallet: string;

  equippedAvatar: string;
  equippedWallpaper: string;
  inventory: UserInventoryItem[];

  lastHolderCheckTimestamp: number;
  isHolder: boolean;
  holderLevel: number;

  isAirdropRequirementMet: boolean;

  fakeFriends: number;
  activeOfflineBoostEndTime: Date | null;
  activeRewardBoostEndTime: Date | null;
  activeOfflineBoostDuration: number;
  activeRewardBoostMultiplier: number;

  totalStars: number;
  earnedStars: number;

  // Task related data
  tasks?: Task[];
  completedTasks?: Task[];
  isTasksLoading?: boolean;

  dailyQuestStreakCount?: number;
  lastDailyQuestCompletedDate?: Date | null;
  lastStreakClaim?: Date | null;
  isSheildActive?: boolean;

  referralCount: number;
  completedTasksCount: number;
  onChainCount: number;
}

export interface GameState extends InitialGameState {
  initializeState: (initialState: Partial<GameState>) => void;

  updateLastClickTimestamp: () => void;
  setPoints: (points: number) => void;
  clickTriggered: () => void;
  setPointsBalance: (points: number) => void;
  setTonBalance: (tonBalance: number) => void;
  incrementPoints: (amount: number) => void;
  decrementPointsBalance: (amount: number) => void;
  resetUnsynchronizedPoints: (syncedPoints: number) => void;
  setPointsPerClick: (pointsPerClick: number) => void;
  upgradeMultitap: () => void;
  setMineLevelIndex: (mineLevelIndex: number) => void;
  upgradeMineLevelIndex: () => void;
  setTonWalletAddress: (address: string | null) => void;
  setSkillUpgrade: (updatedUserUpgrade: UserUpgrade, upgradeCost: number, upgradeYield: number) => void;
  updateLastYieldTimestamp: (timestamp: number) => void;
  setUpgradeYieldPerHour: (yieldPerHour: number) => void;
  setBonusYieldPerHour: (bonusYieldPerHour: number) => void;
  setBonusOfflineYieldDuration: (bonusOfflineYieldDuration: number) => void;
  setlastClaimRewardTimestamp: (lastClaimRewardTimestamp: number) => void;
  setLastClaimRewardDay: (lastClaimRewardDay: number) => void;
  updateTwitterHandle: (twitterHandle: string) => void;
  updateErc20Wallet: (erc20Wallet: string) => void;
  setEquippedAvatar: (avatar: string) => void;
  setEquippedWallpaper: (wallpaper: string) => void;
  addToInventory: (item: UserInventoryItem) => void;
  setHolderCheckTimestamp: (timestamp: number) => void;
  setIsHolder: (isHolder: boolean) => void;
  setHolderLevel: (holderLevel: number) => void;
  setAirdropRequirementMet: (isAirdropRequirementMet: boolean) => void;
  setFakeFriends: (count: number) => void;
  incrementFakeFriends: (count: number) => void;
  setOfflineBoost: (duration: number, endTime: Date) => void;
  setRewardBoost: (multiplier: number, endTime: Date) => void;
  clearExpiredBoosts: () => void;
  setTotalStars: (totalStars: number) => void;
  setEarnedStars: (earnedStars: number) => void;

  // Task-related functions
  setTasks: (tasks: Task[]) => void;
  setCompletedTasks: (completedTasks: Task[]) => void;
  setIsTasksLoading: (isLoading: boolean) => void;
  updateTask: (updatedTask: Task) => void;
  findTaskById: (id: string) => Task | undefined;
  setDailyQuestStreakCount: (count: number) => void;
  setLastDailyQuestCompletedDate?: (date: Date) => void;
  setLastStreakClaim?: (date: Date) => void;
  setIsSheildActive?: (status: boolean) => void;
  findTaskByTitle: (title: string) => Task | undefined;
  getTonDailyTask: () => Task | undefined;
  setReferralCount: (referralCount: number) => void;
  setCompletedTasksCount: (completedTasksCount: number) => void;
  setOnChainCount: (onChainCount: number) => void;
}

export const calculateLevelIndex = (yieldPerHour: number): number => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (yieldPerHour >= LEVELS[i].minYieldPerHour) {
      return i;
    }
  }
  return 0; // Default to 0 if something goes wrong
};

export const calculateMultitapUpgradeCost = (levelIndex: number) => {
  return calculateUpgradeCost(levelIndex, multitapUpgradeBasePrice, multitapUpgradeCostCoefficient);
};

export const calculatePointsPerClick = (levelIndex: number) => {
  return calculateUpgradeBenefit(levelIndex, multitapUpgradeBaseBenefit, multitapUpgradeBenefitCoefficient);
};

export const calculateMineUpgradeCost = (levelIndex: number) => {
  return calculateUpgradeCost(levelIndex, mineUpgradeBasePrice, mineUpgradeCostCoefficient);
};

export const calculateProfitPerHour = (levelIndex: number) => {
  const calculatedBenefit =
    calculateUpgradeBenefit(levelIndex, mineUpgradeBaseBenefit, mineUpgradeBenefitCoefficient) - mineUpgradeBaseBenefit;
  return Math.max(0, calculatedBenefit);
};

export const calculateMinedPoints = (levelIndex: number, previousTimestamp: number, newTimestamp: number): number => {
  if (previousTimestamp >= newTimestamp) return 0;
  let timePeriod = newTimestamp - previousTimestamp;
  if (timePeriod > MAXIMUM_INACTIVE_TIME_FOR_MINE) {
    timePeriod = MAXIMUM_INACTIVE_TIME_FOR_MINE;
  }
  const profitPerHour = calculateProfitPerHour(levelIndex);
  const minedPoints = (profitPerHour / 3600000) * timePeriod;
  return Math.max(0, minedPoints);
};

export const calculateSkillUpgradeCost = (levelIndex: number, basePrice: number) => {
  return calculateUpgradeCost(levelIndex, basePrice, skillUpgradeCostCoefficient);
};

export const calculateSkillUpgradeBenefit = (levelIndex: number, baseBenefit: number) => {
  return calculateUpgradeCost(levelIndex, baseBenefit, skillUpgradeBenefitCoefficient);
};

export const calculateSkillUpgradeTime = (levelIndex: number) => {
  const cooldownTime = calculateUpgradeCooldown(levelIndex, skillUpgradeBaseTime, skillUpgradeTimeCoefficient);
  return Math.min(cooldownTime, MAX_COOLDOWN_TIME);
};

export const createGameStore = (initialState: InitialGameState) =>
  create<GameState>((set, get) => ({
    ...initialState,

    initializeState: (initialState) => set((state) => ({ ...state, ...initialState })),
    updateLastClickTimestamp: () =>
      set((state) => {
        return { lastClickTimestamp: Date.now() };
      }),
    setPoints: (points) =>
      set((state) => {
        return { points };
      }),
    clickTriggered: () =>
      set((state) => {
        if (state.pointsPerClick < 0) return {};
        const newPoints = state.points + state.pointsPerClick;
        const newPointsBalance = state.pointsBalance + state.pointsPerClick;
        const newUnsynchronizedPoints = state.unsynchronizedPoints + state.pointsPerClick;
        return {
          points: newPoints,
          pointsBalance: newPointsBalance,
          unsynchronizedPoints: newUnsynchronizedPoints,
          lastClickTimestamp: Date.now()
        };
      }),
    setPointsBalance: (pointsBalance) =>
      set((state) => {
        return { pointsBalance };
      }),
    setTonBalance: (tonBalance) => set({ tonBalance }),
    incrementPoints: (amount) =>
      set((state) => {
        const newPoints = state.points + amount;
        const newPointsBalance = state.pointsBalance + amount;
        return {
          points: newPoints,
          pointsBalance: newPointsBalance
        };
      }),
    decrementPointsBalance: (amount) =>
      set((state) => {
        const newPointsBalance = Math.max(0, state.pointsBalance - amount); // Ensure points balance don't go negative
        return { pointsBalance: newPointsBalance };
      }),
    resetUnsynchronizedPoints: (syncedPoints: number) =>
      set((state) => ({
        unsynchronizedPoints: Math.max(0, state.unsynchronizedPoints - syncedPoints)
      })),
    setPointsPerClick: (pointsPerClick) => set({ pointsPerClick }),
    upgradeMultitap: () =>
      set((state) => {
        const upgradeCost = calculateMultitapUpgradeCost(state.multitapLevelIndex);
        if (state.pointsBalance >= upgradeCost) {
          return {
            pointsBalance: state.pointsBalance - upgradeCost,
            pointsPerClick: calculatePointsPerClick(state.multitapLevelIndex + 1),
            multitapLevelIndex: state.multitapLevelIndex + 1
          };
        }
        return state;
      }),
    setlastClaimRewardTimestamp: (lastClaimRewardTimestamp) => set({ lastClaimRewardTimestamp }),
    setLastClaimRewardDay: (lastClaimRewardDay) => set({ lastClaimRewardDay }),
    setMineLevelIndex: (mineLevelIndex) => set({ mineLevelIndex }),
    upgradeMineLevelIndex: () =>
      set((state) => {
        const upgradeCost = calculateMineUpgradeCost(state.mineLevelIndex);
        if (state.pointsBalance >= upgradeCost) {
          return {
            pointsBalance: state.pointsBalance - upgradeCost,
            profitPerHour: calculateProfitPerHour(state.mineLevelIndex + 1),
            mineLevelIndex: state.mineLevelIndex + 1
          };
        }
        return state;
      }),
    setTonWalletAddress: (address) => set({ tonWalletAddress: address }),
    setSkillUpgrade: (updatedUserUpgrade, upgradeCost, upgradeYield) =>
      set((state) => {
        const userUpgradeIndex = state.userUpgrades.findIndex((u) => u.upgradeId === updatedUserUpgrade.upgradeId);
        const yieldPerHour = calculateYieldPerHour(state.bonusYieldPerHour, state.upgradeYieldPerHour + upgradeYield);
        const newLevelIndex = calculateLevelIndex(yieldPerHour);
        if (userUpgradeIndex === -1) {
          return {
            points: state.points - upgradeCost,
            pointsBalance: state.pointsBalance - upgradeCost,
            userUpgrades: [...state.userUpgrades, updatedUserUpgrade],
            upgradeYieldPerHour: state.upgradeYieldPerHour + upgradeYield,
            gameLevelIndex: newLevelIndex
          };
        }
        const updatedUserUpgrades = [...state.userUpgrades];
        updatedUserUpgrades[userUpgradeIndex] = updatedUserUpgrade;
        return {
          points: state.points - upgradeCost,
          pointsBalance: state.pointsBalance - upgradeCost,
          userUpgrades: updatedUserUpgrades,
          upgradeYieldPerHour: state.upgradeYieldPerHour + upgradeYield,
          gameLevelIndex: newLevelIndex
        };
      }),
    updateLastYieldTimestamp: (timestamp) =>
      set((state) => {
        return { lastYieldTimestamp: timestamp };
      }),
    setUpgradeYieldPerHour: (yieldPerHour) =>
      set((state) => {
        const newYield = calculateYieldPerHour(state.bonusYieldPerHour, yieldPerHour);
        const newLevelIndex = calculateLevelIndex(newYield);
        return {
          upgradeYieldPerHour: yieldPerHour,
          gameLevelIndex: newLevelIndex
        };
      }),
    setBonusYieldPerHour: (bonusYieldPerHour) => set({ bonusYieldPerHour }),
    setBonusOfflineYieldDuration: (bonusOfflineYieldDuration) => set({ bonusOfflineYieldDuration }),
    updateTwitterHandle: (twitterHandle) => set({ twitterHandle }),
    updateErc20Wallet: (erc20Wallet) => set({ erc20Wallet }),
    setEquippedAvatar: (avatar) => {
      set({ equippedAvatar: avatar });
    },
    setEquippedWallpaper: (wallpaper) => set({ equippedWallpaper: wallpaper }),
    addToInventory: (item) =>
      set((state) => {
        return { inventory: [...state.inventory, item] };
      }),
    setHolderCheckTimestamp: (timestamp) => set({ lastHolderCheckTimestamp: timestamp }),
    setIsHolder: (isHolder) => set({ isHolder }),
    setHolderLevel: (holderLevel) => set({ holderLevel }),
    setAirdropRequirementMet: (isAirdropRequirementMet) => set({ isAirdropRequirementMet }),

    setFakeFriends: (count) => set({ fakeFriends: count }),
    incrementFakeFriends: (count) => set((state) => ({ fakeFriends: state.fakeFriends + count })),
    setOfflineBoost: (duration, endTime) =>
      set({
        activeOfflineBoostDuration: duration,
        activeOfflineBoostEndTime: endTime
      }),
    setRewardBoost: (multiplier, endTime) =>
      set({
        activeRewardBoostMultiplier: multiplier,
        activeRewardBoostEndTime: endTime
      }),
    clearExpiredBoosts: () =>
      set((state) => {
        const now = new Date();
        const updates: Partial<GameState> = {};

        if (state.activeOfflineBoostEndTime && now > state.activeOfflineBoostEndTime) {
          updates.activeOfflineBoostEndTime = null;
          updates.activeOfflineBoostDuration = 0;
        }

        if (state.activeRewardBoostEndTime && now > state.activeRewardBoostEndTime) {
          updates.activeRewardBoostEndTime = null;
          updates.activeRewardBoostMultiplier = 0;
        }

        return updates;
      }),
    setTotalStars: (totalStars) => set({ totalStars }),
    setEarnedStars: (earnedStars) => set({ earnedStars }),

    // Task related functions
    setTasks: (tasks) => set({ tasks }),
    setCompletedTasks: (completedTasks) => set({ completedTasks }),
    setIsTasksLoading: (isLoading) => set({ isTasksLoading: isLoading }),
    updateTask: (updatedTask) =>
      set((state) => {
        const tasks = state.tasks ? [...state.tasks] : [];
        const taskIndex = tasks.findIndex((t) => t.id === updatedTask.id);

        if (taskIndex !== -1) {
          tasks[taskIndex] = { ...updatedTask };
        }

        let completedTasks = state.completedTasks ? [...state.completedTasks] : [];
        let completedTasksCount = state.completedTasksCount;

        if (updatedTask.isCompleted) {
          const completedTaskIndex = completedTasks.findIndex((t) => t.id === updatedTask.id);
          if (completedTaskIndex !== -1) {
            completedTasks[completedTaskIndex] = { ...updatedTask };
          } else if (updatedTask.type === 'DAILY') {
            completedTasks = [...completedTasks, { ...updatedTask, id: `completed-${Date.now()}` }];
            completedTasksCount += 1;
          } else {
            completedTasks = [...completedTasks, { ...updatedTask }];
            completedTasksCount += 1;
          }
        }

        return { tasks, completedTasks, completedTasksCount };
      }),
    findTaskById: (id) => {
      const state = get();
      return state.tasks?.find((task) => task.id === id);
    },
    findTaskByTitle: (title) => {
      const state = get();
      return state.tasks?.find((task) => task.title === title);
    },
    getTonDailyTask: () => {
      const state = get();
      return state.tasks?.find((task) => task.title === 'TON Daily Check-In');
    },
    setDailyQuestStreakCount: (count: number) => set({ dailyQuestStreakCount: count }),
    setLastDailyQuestCompletedDate: (date: Date) => set({ lastDailyQuestCompletedDate: date }),
    setLastStreakClaim: (date: Date) => set({ lastStreakClaim: date }),
    setIsSheildActive: (status: boolean) => set({ isSheildActive: status }),
    setReferralCount: (referralCount: number) => set({ referralCount }),
    setCompletedTasksCount: (completedTasksCount: number) => set({ completedTasksCount }),
    setOnChainCount: (onChainCount: number) => set({ onChainCount })
  }));

let gameStore: ReturnType<typeof createGameStore> | null = null;

export const useGameStore = () => {
  if (!gameStore) {
    gameStore = createGameStore({
      userTelegramInitData: '',
      userTelegramName: '',
      lastClickTimestamp: 0,
      gameLevelIndex: 0,
      points: 0,
      pointsBalance: 0,
      tonBalance: 0,
      unsynchronizedPoints: 0,
      multitapLevelIndex: 0,
      pointsPerClick: 1,
      mineLevelIndex: 0,
      profitPerHour: 0,
      tonWalletAddress: null,

      userUpgrades: [],
      upgradeYieldPerHour: 0,
      bonusYieldPerHour: 0,
      bonusOfflineYieldDuration: 0,
      lastYieldTimestamp: 0,

      lastClaimRewardTimestamp: Date.now(),
      lastClaimRewardDay: 0,

      twitterHandle: '',
      erc20Wallet: '',

      equippedAvatar: '',
      equippedWallpaper: '',
      inventory: [],

      lastHolderCheckTimestamp: 0,
      isHolder: false,
      holderLevel: 0,

      isAirdropRequirementMet: false,
      fakeFriends: 0,
      activeOfflineBoostEndTime: null,
      activeRewardBoostEndTime: null,
      activeOfflineBoostDuration: 0,
      activeRewardBoostMultiplier: 0,

      totalStars: 0,
      earnedStars: 0,

      // Task related initial state
      tasks: [],
      completedTasks: [],
      isTasksLoading: false,

      dailyQuestStreakCount: 0,
      lastDailyQuestCompletedDate: null,
      lastStreakClaim: null,
      isSheildActive: false,

      referralCount: 0,
      completedTasksCount: 0,
      onChainCount: 0
    });
  }

  return gameStore();
};
