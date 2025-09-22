// components/Upgrades.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UpgradeItem } from '@/utils/types';
import { capitalizeFirstLetter, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import UpgradeItemCard from './upgrades/UpgradeItemCard';
import { useGameStore } from '@/utils/game-mechanics';
import TopInfoSection from './TopInfoSection';
import { getUnlockRequirements } from './UnlockRequirement';
import { pageBackground } from '@/images';
import { useToast } from '@/contexts/ToastContext';
import { useUpgrades } from '@/hooks/useUpgrades';
import ComboOfTheDay from '@/components/ComboOfTheDay';
import { checkSpecialUpgradesVersion } from '@/utils/cache-manager';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface BoostProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  handleOpenWithdrawalPopup: () => void;
  handleTopUpBalance: () => void;
}

interface Subcategory {
  name: string;
  items: UpgradeItem[];
}

interface Category {
  name: string;
  subcategories: Subcategory[];
}

const Upgrades: React.FC<BoostProps> = ({
  currentView,
  setCurrentView,
  handleOpenWithdrawalPopup,
  handleTopUpBalance
}) => {
  const showToast = useToast();
  const t = useTranslations('Upgrades');

  const { userUpgrades, userTelegramInitData, setSkillUpgrade } = useGameStore();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const activeCategorySet = useRef(false);

  const { upgrades, unlockRequirements, fetchUpgrades, backgroundRefresh } = useUpgrades();

  // Periodically check for special upgrades changes in background
  useEffect(() => {
    const backgroundCheck = async () => {
      setIsBackgroundUpdating(true);
      await backgroundRefresh();
      setIsBackgroundUpdating(false);
    };

    // Check every 60 seconds for special upgrades changes
    const interval = setInterval(backgroundCheck, 60000);

    return () => clearInterval(interval);
  }, [backgroundRefresh]);

  // Initial check for special upgrades changes when component mounts
  useEffect(() => {
    const initialCheck = async () => {
      const needsRefresh = await checkSpecialUpgradesVersion();
      if (needsRefresh) {
        await fetchUpgrades(true, false); // Force refresh without loading
      }
    };

    initialCheck();
  }, [fetchUpgrades]);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  const groupedUpgradesArray = useMemo(() => {
    const grouped: Record<string, Category> = upgrades.reduce((acc, upgrade) => {
      if (upgrade.isSpecial && upgrade.countdownEndsAt) {
        const now = new Date();
        const countdownEnd = new Date(upgrade.countdownEndsAt);

        // Check if the upgrade has expired
        if (countdownEnd <= now) {
          // Check if user has purchased this upgrade
          const userUpgrade = userUpgrades.find((uu) => uu.upgradeId === upgrade.id);
          if (!userUpgrade || userUpgrade.level === 0) {
            // Skip this upgrade - it's expired and not purchased
            return acc;
          }
        }
      }

      if (!acc[upgrade.category]) {
        acc[upgrade.category] = {
          name: upgrade.category,
          subcategories: []
        };
      }

      const category = acc[upgrade.category];
      const subcategoryIndex = category.subcategories.findIndex((sub) => sub.name === upgrade.subcategory);

      if (subcategoryIndex === -1) {
        // If the subcategory doesn't exist, create it
        category.subcategories.push({
          name: upgrade.subcategory,
          items: []
        });
      }

      // Find the subcategory and push the upgrade item into it
      const subcategory = category.subcategories.find((sub) => sub.name === upgrade.subcategory);
      if (subcategory) {
        subcategory.items.push(upgrade);
      }

      return acc;
    }, {} as Record<string, Category>);

    return Object.values(grouped).map((category) => ({
      ...category,
      subcategories: category.subcategories
    }));
  }, [upgrades, userUpgrades]);

  // Get the categories from the grouped upgrades
  const categories = useMemo(() => groupedUpgradesArray.map((category) => category.name), [groupedUpgradesArray]);

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myjok');
      });
    };

    setupBackButton();
  }, []);

  // Set the initial active category when categories are available
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
      activeCategorySet.current = true; // Ensure this runs only once
    }
  }, [categories, activeCategory]);

  // Filter the grouped upgrades based on the active category
  const filteredUpgrades = useMemo(() => {
    if (!activeCategory) return groupedUpgradesArray;

    return groupedUpgradesArray.filter((category) => category.name === activeCategory);
  }, [activeCategory, groupedUpgradesArray]);

  const buyUpgrade = async (upgradeId: string) => {
    if (processing) return;

    setProcessing(true);
    try {
      triggerHapticFeedback(window);
      const response = await fetch('/api/upgrade/skill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initData: userTelegramInitData,
          upgradeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('upgradeError'));
      }

      const result = await response.json();
      const event = new CustomEvent('comboDiscovered', {
        detail: {
          comboHit: result.comboHit,
          comboCompleted: result.comboCompleted,
          discoveredCardImage: result.discoveredCardImage,
          comboImages: result.comboImages
        }
      });
      window.dispatchEvent(event);
      setSkillUpgrade(result.updatedUserUpgrade, result.upgradeCost, result.upgradeYield);
      showToast(t('upgradeSuccessful'), 'success');
    } catch (error) {
      console.error('Error upgrading skill:', error);
      showToast(error instanceof Error ? error.message : t('upgradeError'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='bg-black flex justify-center safe-min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <TopInfoSection
          setCurrentView={setCurrentView}
          handleOpenWithdrawalPopup={handleOpenWithdrawalPopup}
          handleTopUpBalance={handleTopUpBalance}
        />

        {isBackgroundUpdating && (
          <div className='absolute top-16 right-4 z-10'>
            <div className='bg-customGreen-700 bg-opacity-60 text-white text-xs px-2 py-1 rounded-full animate-pulse'>
              {t('syncing')}
            </div>
          </div>
        )}

        <div
          className='h-screen mt-4 bg-customGreen-700 rounded-t-[48px] relative top-glow z-0'
          style={{
            backgroundImage: `url(${pageBackground.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className='flex-grow mt-[2px] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='px-4 pt-1 pb-[calc(90px+1.5rem+40px+55px)] margin-safe-area-top margin-safe-area-bottom'>
              <ComboOfTheDay showLoading={false} />
              <div className='px-4 mt-4 relative'>
                <div
                  className='flex overflow-x-auto no-scrollbar scroll-smooth'
                  ref={(el) => {
                    if (el) {
                      el.addEventListener('scroll', () => {
                        // Hide right hint when scrolled to end
                        const rightHint = el.parentElement?.querySelector('.scroll-hint-right');
                        if (rightHint && el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
                          rightHint.classList.add('opacity-0');
                        } else if (rightHint) {
                          rightHint.classList.remove('opacity-0');
                        }

                        // Show left hint when scrolled to end
                        const leftHint = el.parentElement?.querySelector('.scroll-hint-left');
                        if (leftHint && el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
                          leftHint.classList.remove('opacity-0');
                        } else if (leftHint) {
                          leftHint.classList.add('opacity-0');
                        }
                      });
                    }
                  }}
                >
                  {categories.map((item) => (
                    <button
                      key={item}
                      className={`text-base font-bold px-4 py-2 whitespace-nowrap ${
                        activeCategory === item
                          ? 'text-customGreen-700 border-b-2 border-customGreen-700'
                          : ' text-[#85827d]'
                      }`}
                      onClick={() => setActiveCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* Right scroll hint animation - only show if more than 4 categories */}
                {categories.length > 4 && (
                  <div
                    className='scroll-hint-right absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 border-2 border-white bg-customGreen-700 rounded-full flex items-center justify-center cursor-pointer transition-opacity duration-300 z-10'
                    onClick={(e) => {
                      const scrollContainer = e.currentTarget.parentElement?.querySelector('.flex');
                      if (scrollContainer) {
                        scrollContainer.scrollTo({
                          left: scrollContainer.scrollWidth,
                          behavior: 'smooth'
                        });
                      }
                    }}
                  >
                    <ArrowRight className='w-4 h-4 text-white' />
                  </div>
                )}

                {/* Left scroll hint animation - only show if more than 4 categories and scrolled to end */}
                {categories.length > 4 && (
                  <div
                    className='scroll-hint-left absolute left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 border-2 border-white bg-customGreen-700 rounded-full flex items-center justify-center cursor-pointer transition-opacity duration-300 opacity-0 z-10'
                    onClick={(e) => {
                      const scrollContainer = e.currentTarget.parentElement?.querySelector('.flex');
                      if (scrollContainer) {
                        scrollContainer.scrollTo({
                          left: 0,
                          behavior: 'smooth'
                        });
                      }
                    }}
                  >
                    <ArrowLeft className='w-4 h-4 text-white' />
                  </div>
                )}
              </div>

              <div className='mt-4'>
                {filteredUpgrades.map((category) => (
                  <div key={category.name} className='space-y-2'>
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.name}>
                        <h3 className='text-sm mt-4 mb-2'>{capitalizeFirstLetter(subcategory.name)}</h3>
                        <div className='space-y-2'>
                          {subcategory.items.map((item) => {
                            const requirements = getUnlockRequirements(
                              item,
                              groupedUpgradesArray,
                              userUpgrades,
                              unlockRequirements
                            );
                            return (
                              <UpgradeItemCard
                                item={item}
                                key={item.id}
                                userUpgrades={userUpgrades}
                                isUnlocked={requirements.isUnlocked}
                                isProcessing={processing}
                                onBuy={buyUpgrade}
                                unlockRequirement={
                                  requirements.previousItem && !requirements.isUnlocked
                                    ? {
                                        itemName: requirements.previousItem.name,
                                        currentLevel: requirements.currentLevel,
                                        requiredLevel: requirements.requiredLevel
                                      }
                                    : null
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Upgrades);
