// utils/calculations.ts

export const calculateUpgradeCost = (levelIndex: number, basePrice: number, coefficient: number): number => {
  return Math.floor(basePrice * Math.pow(coefficient, levelIndex));
};

export const calculateUpgradeBenefit = (levelIndex: number, baseBenefit: number, coefficient: number): number => {
  let benefit = 0;
  for (let i = 0; i <= levelIndex; i++) {
    benefit += Math.floor(baseBenefit * Math.pow(coefficient, i));
  }
  return benefit;
};

export const calculateUpgradeCooldown = (levelIndex: number, baseCooldown: number, coefficient: number): number => {
  return Math.floor(baseCooldown * Math.pow(coefficient, levelIndex));
};

export const calculateYieldPerHour = (bonusYield: number, yieldPerHour: number) => {
  return yieldPerHour * (1 + bonusYield / 100);
};
