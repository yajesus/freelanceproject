// component/UnlockRequirement.tsx

import { UpgradeItem, UserUpgrade } from '@/utils/types';

interface Subcategory {
  name: string;
  items: UpgradeItem[];
}

export const getUnlockRequirements = (
  currentItem: UpgradeItem,
  groupedUpgrades: {
    subcategories: Subcategory[];
    name: string;
  }[],
  userUpgrades: UserUpgrade[],
  requirementsUnlock: any[]
) => {
  const userUpgradesMap = userUpgrades.reduce((acc: { [key: string]: UserUpgrade }, upgrade) => {
    acc[upgrade.upgradeId] = upgrade;
    return acc;
  }, {});

  const allItems = groupedUpgrades.reduce((acc: UpgradeItem[], category) => {
    category.subcategories.forEach((subcategory: Subcategory) => {
      acc.push(...subcategory.items);
    });
    return acc;
  }, [] as UpgradeItem[]);

  const itemsMap = allItems.reduce((acc: { [x: string]: any }, item: { id: string | number }) => {
    acc[item.id] = item;
    return acc;
  }, {});

  // Check for special unlock requirements
  const itemSpecificRequirements = Array.isArray(requirementsUnlock)
    ? requirementsUnlock.filter((req) => req.upgradeId === currentItem.id)
    : [];

  // If there are special requirements, check those
  if (itemSpecificRequirements.length > 0) {
    let allRequirementsMet = true;
    let highestRequiredLevel = 0;
    let currentLevel = 0;
    let referenceUpgradeId = null;

    for (const requirement of itemSpecificRequirements) {
      const userUpgrade = userUpgradesMap[requirement.requiredUpgradeId];
      const userLevel = userUpgrade ? userUpgrade.level : 0;

      if (userLevel < requirement.requiredLevel) {
        allRequirementsMet = false;
      }

      if (requirement.requiredLevel > highestRequiredLevel) {
        highestRequiredLevel = requirement.requiredLevel;
        currentLevel = userLevel;
        referenceUpgradeId = requirement.requiredUpgradeId;
      }
    }

    return {
      isUnlocked: allRequirementsMet,
      previousItem: referenceUpgradeId ? itemsMap[referenceUpgradeId] : null,
      requiredLevel: highestRequiredLevel,
      currentLevel,
      specialRequirement: true
    };
  }

  // If no special requirements, item is unlocked by default
  return {
    isUnlocked: true,
    previousItem: null,
    requiredLevel: 0,
    currentLevel: 0,
    specialRequirement: false
  };
};
