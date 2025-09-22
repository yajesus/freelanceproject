// src/app/clicker/page.tsx

'use client';

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/Loading';
import Navigation from '@/components/Navigation';
import AutoIncrementYieldPerHour from '@/components/UpgradeYieldPerHour';
import { CheckTokenHoldings } from '@/components/CheckTokenHoldings';
import ComebackReward from '@/components/ComebackReward';
import { Luckiest_Guy } from 'next/font/google';
import { useGameStore } from '@/utils/game-mechanics';

import { AnimatePresence, motion } from 'framer-motion';
import WithdrawalPopup from '@/components/popups/WithdrawalPopup';
import StarSelectionPopup from '@/components/popups/StarSelectionPopup';
import AppLeaderboard from '@/components/AppLeaderboard';

const Mine = dynamic(() => import('@/components/Mine'), { ssr: true });
const Friends = dynamic(() => import('@/components/Friends'), { ssr: true });
const Quests = dynamic(() => import('@/components/Quests'), { ssr: true });
const Upgrades = dynamic(() => import('@/components/Upgrades'), { ssr: true });
const Settings = dynamic(() => import('@/components/Settings'), { ssr: true });
const MyJOK = dynamic(() => import('@/components/MyJOK'), { ssr: true });
const Shop = dynamic(() => import('@/components/Shop'), { ssr: true });
const Boost = dynamic(() => import('@/components/Boost'), { ssr: true });
const DailyRewards = dynamic(() => import('@/components/DailyRewards'), {
  ssr: false,
});
const Profile = dynamic(() => import('@/components/Profile'), { ssr: true });
const AirdropPage = dynamic(() => import('@/components/AirdropPage'), {
  ssr: false,
});
// const Giveaway = dynamic(() => import('@/components/Giveaway'), { ssr: true });
const Raffles = dynamic(() => import('@/components/Raffles'), { ssr: true });
const DailyChest = dynamic(() => import('@/components/DailyChest'), {
  ssr: false,
});
const Intro1 = dynamic(() => import('@/components/Intro1'), { ssr: true });

// Game components grouped for better code splitting
const GameComponents = {
  JokDuelOnboarding: dynamic(
    () => import('../games/jok-duel/components/JokDuelOnboarding'),
    { ssr: true }
  ),
  OpponentSelection: dynamic(
    () => import('../games/jok-duel/components/OpponentSelection'),
    { ssr: true }
  ),
  SelectedOpponent: dynamic(
    () => import('../games/jok-duel/components/SelectedOpponent'),
    { ssr: true }
  ),
  Game: dynamic(() => import('../games/jok-duel/components/Game'), {
    ssr: false,
  }),
  Finish: dynamic(() => import('../games/jok-duel/components/Finish'), {
    ssr: false,
  }),
  Win: dynamic(() => import('../games/jok-duel/components/Win'), {
    ssr: false,
  }),
  Intro: dynamic(() => import('../games/jok-duel/components/Intro'), {
    ssr: false,
  }),
  GameProfile: dynamic(
    () => import('../games/jok-duel/components/GameProfile'),
    { ssr: true }
  ),
  // RecoverEnergy: dynamic(() => import('../games/jok-duel/components/RecoverEnergy'), { ssr: true }),
  GameEndLoading: dynamic(
    () => import('../games/jok-duel/components/GameEndLoading'),
    { ssr: true }
  ),
  JokDuelLoading: dynamic(
    () => import('../games/jok-duel/components/JokDuelLoading'),
    { ssr: true }
  ),
  LeaderBoard: dynamic(
    () => import('../games/jok-duel/components/LeaderBoard'),
    { ssr: true }
  ),
  ChestLoading: dynamic(
    () => import('../games/jok-duel/components/ChestLoading'),
    { ssr: true }
  ),
};

const luckiestGuyFont = Luckiest_Guy({ subsets: ['latin'], weight: ['400'] });

// Utility functions
const base64urlDecode = (str: string): string => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  try {
    return atob(str);
  } catch {
    return '';
  }
};

const generateRandomUsername = (): string => {
  const vowels = 'aeiou';
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  let username = '';
  for (let i = 0; i < 4; i++) {
    const c = consonants[Math.floor(Math.random() * consonants.length)];
    const v = vowels[Math.floor(Math.random() * vowels.length)];
    username += c + v;
  }
  return username.toLowerCase();
};

const extractTelegramId = (queryString: string) => {
  try {
    const params = new URLSearchParams(queryString);
    const userJson = params.get('user');
    if (!userJson) return null;
    const user = JSON.parse(decodeURIComponent(userJson));
    return user.id;
  } catch {
    return null;
  }
};

// Navigation component
const MemoizedNavigation = React.memo(Navigation);

// Main component
function ClickerPage() {
  const userInfo = useGameStore();

  const [appState, setAppState] = useState({
    currentView: 'myjok',
    isInitialized: false,
    isLoading: true,
    updated: false,
    chestOpeningView: 'dailyChest',
  });

  const [gameState, setGameState] = useState({
    gameUser: {
      id: null,
      // energy: 50,
      gamesPlayed: 0,
      watchedAds: 0,
    },
    opponentUsername: '',
    leaderBoardInfo: [],
  });

  // Popup state
  const [popupState, setPopupState] = useState({
    showWithdrawalPopup: false,
    showStarPopup: false,
    lastWithdrawalCheck: 0,
    cachedWithdrawalData: { balance: 0, withdrawals: [] } as {
      balance: number;
      withdrawals: any[];
    },
  });

  const gameId = useRef<string>('');
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const userPollingInterval = useRef<NodeJS.Timeout | null>(null);
  // const energyRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const telegramId = useMemo(() => {
    return extractTelegramId(userInfo.userTelegramInitData) || 'undefined';
  }, [userInfo.userTelegramInitData]);

  // Polling interval constants
  const WITHDRAWAL_POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutes
  const USER_POLLING_INTERVAL = 5000; // 5 seconds for user data
  // const ENERGY_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes for energy refresh
  const CACHE_KEY = useMemo(() => 'withdrawal_data_cache', []);

  const shouldShowLoading = useMemo(() => {
    return !appState.isInitialized || gameState.gameUser.id == null;
  }, [appState.isInitialized, gameState.gameUser.id]);

  useEffect(() => {
    const handleAuthData = async () => {
      if (!window.Telegram?.WebApp.initDataUnsafe) {
        window.Telegram?.WebApp.expand();
        window.Telegram?.WebApp.ready();
      }

      const startParamEncoded =
        window.Telegram?.WebApp.initDataUnsafe?.start_param;

      if (!startParamEncoded) {
        const timeoutId = setTimeout(handleAuthData, 1000);
        timeoutRefs.current.push(timeoutId);
        return;
      }

      const decoded = base64urlDecode(startParamEncoded);
      const parts = decoded.split('_');

      const [_, accessToken, accessSecret, userId, screenName] = parts;

      let retryCount = 0;
      const maxRetries = 10;

      while (retryCount < maxRetries) {
        try {
          const telegramID =
            window.Telegram?.WebApp.initDataUnsafe?.user?.id ?? 'undefined';
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

          const response = await fetch(`${baseUrl}/api/twitter/twitter-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId: telegramID,
              userId,
              screenName,
              accessToken,
              accessSecret,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          if (data.success) {
            setAppState((prev) => ({ ...prev, currentView: 'upgrades' }));
            break;
          }

          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };

    handleAuthData();
  }, []);

  const fetchOrCreateUser = useCallback(async () => {
    try {
      if (!gameState.gameUser.id) {
        setGameState((prev) => ({
          ...prev,
          opponentUsername: generateRandomUsername(),
        }));
      }

      const res = await fetch(`/api/duelGameUser?telegramId=${telegramId}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setGameState((prev) => ({
          ...prev,
          gameUser: data.data,
        }));
      } else {
        const createRes = await fetch('/api/duelGameUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: telegramId.toString() }),
        });

        const createdUser = await createRes.json();
        if (createRes.ok && createdUser?.data) {
          setGameState((prev) => ({
            ...prev,
            gameUser: createdUser.data,
          }));
        } else {
          console.error('Failed to create duelGameUser', createdUser);
        }
      }
    } catch (err) {
      console.error('Error loading duelGameUser', err);
    }
  }, [gameState.gameUser.id, telegramId]);

  // User polling
  useEffect(() => {
    if (!userInfo?.userTelegramInitData && !telegramId) return;

    // Initial fetch
    fetchOrCreateUser();

    // Set up polling interval
    userPollingInterval.current = setInterval(() => {
      fetchOrCreateUser();
    }, USER_POLLING_INTERVAL);

    return () => {
      if (userPollingInterval.current) {
        clearInterval(userPollingInterval.current);
        userPollingInterval.current = null;
      }
    };
  }, [userInfo, telegramId, appState.updated, fetchOrCreateUser]);

  // Energy auto-refresh polling
  // useEffect(() => {
  //   if (!telegramId || telegramId === 'undefined') return;

  //   const autoRefreshEnergy = async () => {
  //     try {
  //       const res = await fetch(`/api/duelGameUser?telegramId=${telegramId}`);
  //       const data = await res.json();
  //       if (res.ok && data?.data) {
  //         setGameState((prev) => ({
  //           ...prev,
  //           gameUser: data.data,
  //         }));
  //       }
  //     } catch (err) {
  //       console.error('⛔ Error in auto energy refresh:', err);
  //     }
  //   };

  //   energyRefreshInterval.current = setInterval(
  //     autoRefreshEnergy,
  //     ENERGY_REFRESH_INTERVAL
  //   );

  //   return () => {
  //     if (energyRefreshInterval.current) {
  //       clearInterval(energyRefreshInterval.current);
  //       energyRefreshInterval.current = null;
  //     }
  //   };
  // }, [telegramId]);

  // Leaderboard fetching
  useEffect(() => {
    if (!gameState.gameUser?.id) return;

    const fetchLeaderboard = async () => {
      try {
        const leaderboardRes = await fetch(
          `/api/leaderboard?telegramId=${telegramId}`
        );
        const leaderboardData = await leaderboardRes.json();
        setGameState((prev) => ({
          ...prev,
          leaderBoardInfo: leaderboardData,
        }));
      } catch (err) {
        console.error('Error loading leaderboard', err);
      }
    };

    fetchLeaderboard();
  }, [gameState.gameUser?.id, telegramId]);

  const updateDuelGameUser = useCallback(
    async (fields: Record<string, any>) => {
      try {
        if (!gameState.gameUser?.id || !telegramId) {
          console.warn('gameUser or telegramId not ready');
          return;
        }

        const response = await fetch(`/api/duelGameUser`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramId.toString(),
            ...fields,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('Failed to update user:', data.error || data);
          return null;
        }

        setGameState((prev) => ({
          ...prev,
          gameUser: { ...prev.gameUser, ...data.data },
        }));

        setAppState((prev) => ({ ...prev, updated: !prev.updated }));
        return data;
      } catch (err) {
        console.error('Error in updateDuelGameUser:', err);
        return null;
      }
    },
    [gameState.gameUser?.id, telegramId]
  );

  // Energy functions
  // const increaseEnergy = useCallback(
  //   async (amount: number = 10) => {
  //     if (!gameState.gameUser) return;

  //     const newEnergy = Math.min(50, gameState.gameUser.energy + amount);
  //     const updates: Record<string, any> = { energy: newEnergy };

  //     if (amount === 10) {
  //       updates.watchedAds = gameState.gameUser.watchedAds + 1;
  //     }

  //     setGameState((prev) => ({
  //       ...prev,
  //       gameUser: { ...prev.gameUser, ...updates },
  //     }));

  //     await updateDuelGameUser(updates);
  //   },
  //   [gameState.gameUser, updateDuelGameUser]
  // );

  // const decreaseEnergy = useCallback(
  //   async (amount: number = 10) => {
  //     const currentEnergy = gameState.gameUser.energy;
  //     const newEnergy =
  //       currentEnergy === 50 ? 40 : Math.max(0, currentEnergy - amount);

  //     setGameState((prev) => ({
  //       ...prev,
  //       gameUser: { ...prev.gameUser, energy: newEnergy },
  //     }));

  //     await updateDuelGameUser({ energy: newEnergy });
  //   },
  //   [gameState.gameUser.energy, updateDuelGameUser]
  // );

  // Game start function
  const startGame = useCallback(async () => {
    setGameState((prev) => ({
      ...prev,
      opponentUsername: generateRandomUsername(),
    }));

    try {
      const prizeRes = await fetch('/api/prize', { method: 'POST' });
      const prizeData = await prizeRes.json();
      if (!prizeRes.ok || !prizeData?.data?.id) {
        console.error('❌ Failed to create prize', prizeData);
        return;
      }
      const gameRes = await fetch('/api/duelGame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId.toString(),
          round1: { me: 0, pc: 0 },
          round2: { me: 0, pc: 0 },
          round3: { me: 0, pc: 0 },
          status: 'pending',
          prizeId: prizeData.data.id,
        }),
      });

      const gameData = await gameRes.json();
      if (!gameRes.ok || !gameData?.data?.id) {
        console.error('❌ Failed to create duel game', gameData);
        return;
      }

      gameId.current = gameData.data.id;
      await updateDuelGameUser({
        gamesPlayed: gameState.gameUser.gamesPlayed + 1,
      });
    } catch (error) {
      console.error('⚠️ Error in startGame:', error);
    }
  }, [telegramId, gameState.gameUser.gamesPlayed, updateDuelGameUser]);

  // Auto-start game
  useEffect(() => {
    if (
      gameState.gameUser.id &&
      appState.isInitialized &&
      appState.currentView === 'opponent-selection'
    ) {
      startGame();
    }
  }, [gameState.gameUser.id, appState.isInitialized, appState.currentView]);

  // Rematch function
  const rematchGame = useCallback(async () => {
    setGameState((prev) => ({
      ...prev,
      opponentUsername: generateRandomUsername(),
    }));

    try {
      const prizeRes = await fetch('/api/prize', { method: 'POST' });
      const prizeData = await prizeRes.json();
      if (!prizeRes.ok || !prizeData?.data?.id) {
        console.error('❌ Failed to create prize', prizeData);
        return;
      }

      const gameRes = await fetch('/api/duelGame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId.toString(),
          round1: { me: 0, pc: 0 },
          round2: { me: 0, pc: 0 },
          round3: { me: 0, pc: 0 },
          status: 'pending',
          prizeId: prizeData.data.id,
        }),
      });

      const gameData = await gameRes.json();
      if (!gameRes.ok || !gameData?.data?.id) {
        console.error('❌ Failed to create duel game', gameData);
        return;
      }

      gameId.current = gameData.data.id;
      await updateDuelGame({
        status: 'pending',
        round1: { me: 0, pc: 0 },
        round2: { me: 0, pc: 0 },
        round3: { me: 0, pc: 0 },
      });

      await updateDuelGameUser({
        gamesPlayed: gameState.gameUser.gamesPlayed + 1,
      });
      setAppState((prev) => ({ ...prev, currentView: 'game' }));
    } catch (err) {
      console.error('⚠️ Error during rematchGame:', err);
    }
  }, [telegramId, gameState.gameUser.gamesPlayed]);

  // Game profile view effect
  useEffect(() => {
    if (appState.currentView === 'game-profile') {
      setAppState((prev) => ({ ...prev, updated: !prev.updated }));
    }
  }, [appState.currentView]);

  // Duel game update
  const updateDuelGame = useCallback(async (fields: Record<string, any>) => {
    try {
      const response = await fetch(`/api/duelGame`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId.current,
          ...fields,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('❌ Failed to update duel game:', data.error || data);
        return null;
      }
      return data.data;
    } catch (error) {
      console.error('⚠️ Error updating duel game:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const initWebApp = async () => {
      if (typeof window !== 'undefined') {
        try {
          const WebApp = (await import('@twa-dev/sdk')).default;
          WebApp.ready();
          WebApp.setBottomBarColor('#1d2025');
          WebApp.setHeaderColor('#000000');
          WebApp.disableVerticalSwipes();
          WebApp.requestFullscreen();
          WebApp.expand();
          WebApp.enableClosingConfirmation();
        } catch (error) {
          console.error('Error initializing TG Webapp:', error);
        }
      }
    };

    initWebApp();
  }, []);

  // Timeout management
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
  }, []);

  const setCurrentView = useCallback(
    (newView: string) => {
      clearAllTimeouts();
      setAppState((prev) => ({ ...prev, currentView: newView }));
    },
    [clearAllTimeouts]
  );

  // Popup handlers
  const handleTopUpBalance = useCallback(() => {
    setPopupState((prev) => ({ ...prev, showStarPopup: true }));
  }, []);

  const handleTopUpProcess = useCallback(
    async (topupAmount: number) => {
      try {
        const response = await fetch('/api/user/star-topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: userInfo.userTelegramInitData,
            topupAmount,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Top up error');

        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        WebApp.openInvoice(data.invoiceLink, (status: string) => {
          if (status === 'paid') {
            userInfo.setTotalStars(userInfo.totalStars + topupAmount);
          }
        });
      } catch (error) {
        console.error('Top up error:', error);
      }
    },
    [userInfo.userTelegramInitData, userInfo.totalStars, userInfo.setTotalStars]
  );

  const handleInternalTopUpProcess = useCallback(
    async (topupAmount: number) => {
      try {
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!telegramUser || !telegramUser.id) {
          throw new Error('Telegram user ID not found.');
        }

        await fetch('/api/user/set-stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramUser.id.toString(),
            stars: topupAmount,
          }),
        });
        userInfo.setTotalStars(userInfo.totalStars + topupAmount);
      } catch (error) {
        console.error('Top up error:', error);
      }
    },
    [userInfo.totalStars, userInfo.setTotalStars]
  );

  const handleStarConfirm = useCallback(
    async (starsToUse: number, internal?: boolean) => {
      if (internal) {
        await handleInternalTopUpProcess(starsToUse);
      } else {
        await handleTopUpProcess(starsToUse);
      }
      setPopupState((prev) => ({ ...prev, showStarPopup: false }));
    },
    [handleInternalTopUpProcess, handleTopUpProcess]
  );

  const handleCloseStarPopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, showStarPopup: false }));
  }, []);

  const handleOpenWithdrawalPopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, showWithdrawalPopup: true }));
  }, []);

  const handleCloseWithdrawalPopup = useCallback(() => {
    setPopupState((prev) => ({ ...prev, showWithdrawalPopup: false }));
  }, []);

  // Withdrawal data fetching
  const fetchWithdrawalData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/withdrawal?initData=${encodeURIComponent(
          userInfo.userTelegramInitData
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        const withdrawalData = {
          balance: data.balance || 0,
          withdrawals: data.withdrawals || [],
        };

        setPopupState((prev) => ({
          ...prev,
          cachedWithdrawalData: withdrawalData,
        }));
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: withdrawalData,
            timestamp: Date.now(),
          })
        );

        // Update game store if balance changed
        if (withdrawalData.balance !== userInfo.tonBalance) {
          userInfo.setTonBalance(withdrawalData.balance);
        }

        setPopupState((prev) => ({ ...prev, lastWithdrawalCheck: Date.now() }));
      }
    } catch (error) {
      console.error('Failed to fetch withdrawal data:', error);
    }
  }, [
    userInfo.userTelegramInitData,
    userInfo.tonBalance,
    userInfo.setTonBalance,
    CACHE_KEY,
  ]);

  // Load cached withdrawal data
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();

          if (now - timestamp < WITHDRAWAL_POLLING_INTERVAL) {
            setPopupState((prev) => ({
              ...prev,
              cachedWithdrawalData: data,
              lastWithdrawalCheck: timestamp,
            }));

            if (data.balance !== userInfo.tonBalance) {
              userInfo.setTonBalance(data.balance);
            }
          } else {
            // Cache expired, fetch fresh data
            fetchWithdrawalData();
          }
        } else {
          // No cache, fetch fresh data
          fetchWithdrawalData();
        }
      } catch (error) {
        console.error('Failed to load cached withdrawal data:', error);
        fetchWithdrawalData();
      }
    };

    if (userInfo.userTelegramInitData) {
      loadCachedData();
    }
  }, [
    userInfo.userTelegramInitData,
    fetchWithdrawalData,
    userInfo.tonBalance,
    userInfo.setTonBalance,
    CACHE_KEY,
    WITHDRAWAL_POLLING_INTERVAL,
  ]);

  // Withdrawal polling interval
  useEffect(() => {
    if (!userInfo.userTelegramInitData) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - popupState.lastWithdrawalCheck >= WITHDRAWAL_POLLING_INTERVAL) {
        fetchWithdrawalData();
      }
    }, 60000); // Check every minute if we need to fetch

    return () => clearInterval(interval);
  }, [
    userInfo.userTelegramInitData,
    popupState.lastWithdrawalCheck,
    fetchWithdrawalData,
    WITHDRAWAL_POLLING_INTERVAL,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (userPollingInterval.current) {
        clearInterval(userPollingInterval.current);
      }
      // if (energyRefreshInterval.current) {
      //   clearInterval(energyRefreshInterval.current);
      // }
    };
  }, [clearAllTimeouts]);

  const renderCurrentView = useMemo(() => {
    const viewProps = {
      currentView: appState.currentView,
      setCurrentView,
      gameUser: gameState.gameUser,
      handleOpenWithdrawalPopup,
      handleTopUpBalance,
      setChestOpeningView: (view: string) =>
        setAppState((prev) => ({ ...prev, chestOpeningView: view })),
      opponentUsername: gameState.opponentUsername,
      leaderBoardInfo: gameState.leaderBoardInfo,
      telegramId,
      // decreaseEnergy,
      // increaseEnergy,
      updateDuelGame,
      updateDuelGameUser,
      gameId,
      startGame: rematchGame,
    };

    switch (appState.currentView) {
      case 'intro1':
        return <Intro1 {...viewProps} />;
      case 'myjok':
        return <MyJOK {...viewProps} />;
      case 'upgrades':
        return <Upgrades {...viewProps} />;
      case 'boost':
        return <Boost {...viewProps} />;
      case 'settings':
        return <Settings setCurrentView={setCurrentView} />;
      case 'friends':
        return <Friends setCurrentView={setCurrentView} />;
      case 'quests':
        return <Quests {...viewProps} />;
      case 'shop':
        return <Shop {...viewProps} />;
      case 'raffles':
        return <Raffles {...viewProps} />;
      case 'reward':
        return <DailyRewards {...viewProps} />;
      case 'profile':
        return <Profile {...viewProps} />;
      // case 'giveaway':
      //   return <Giveaway {...viewProps} />;
      case 'airdrop':
        return <AirdropPage {...viewProps} />;
      case 'dailyChest':
        return <DailyChest {...viewProps} />;
      case 'leaderboardApp':
        return <AppLeaderboard {...viewProps} />;
      case 'onboarding':
        return <GameComponents.JokDuelOnboarding {...viewProps} />;
      case 'opponent-selection':
        return <GameComponents.OpponentSelection {...viewProps} />;
      case 'selectedOpponent':
        return <GameComponents.SelectedOpponent {...viewProps} />;
      case 'game':
        return <GameComponents.Game {...viewProps} />;
      case 'finish':
        return <GameComponents.Finish {...viewProps} />;
      case 'win':
        return <GameComponents.Win {...viewProps} />;
      case 'gameIntro':
        return <GameComponents.Intro {...viewProps} />;
      case 'game-profile':
        return <GameComponents.GameProfile {...viewProps} />;
      // case 'recover':
      //   return <GameComponents.RecoverEnergy {...viewProps} />;
      case 'gameEndLoading':
        return <GameComponents.GameEndLoading {...viewProps} />;
      case 'onboardingLoading':
        return (
          <GameComponents.JokDuelLoading
            setIsLoading={(loading) =>
              setAppState((prev) => ({ ...prev, isLoading: loading }))
            }
            setCurrentView={setCurrentView}
          />
        );
      case 'leaderBoard':
        return <GameComponents.LeaderBoard {...viewProps} />;
      case 'chest-opening':
        return (
          <GameComponents.ChestLoading
            setCurrentView={setCurrentView}
            leaderBoardInfo={gameState.leaderBoardInfo}
            chestOpeningView={appState.chestOpeningView}
          />
        );
      default:
        return <MyJOK {...viewProps} />;
    }
  }, [
    appState,
    gameState,
    setCurrentView,
    handleOpenWithdrawalPopup,
    handleTopUpBalance,
    telegramId,
    // decreaseEnergy,
    // increaseEnergy,
    updateDuelGame,
    updateDuelGameUser,
    rematchGame,
  ]);

  // Game views check
  const isGameView = useMemo(() => {
    const gameViews = [
      'dailyChest',
      'onboardingLoading',
      'opponent-selection',
      'onboarding',
      'selectedOpponent',
      'finish',
      'win',
      'gameIntro',
      // 'recover',
      'gameEndLoading',
      'game',
      'game-profile',
      'leaderBoard',
      'chest-opening',
    ];
    return gameViews.includes(appState.currentView);
  }, [appState.currentView]);

  const shouldShowNavigation = useMemo(() => {
    return !shouldShowLoading && !isGameView;
  }, [shouldShowLoading, isGameView]);

  if (shouldShowLoading) {
    return (
      <div className='bg-black flex flex-col h-screen text-white safe-area-top safe-area-bottom overflow-hidden'>
        <LoadingScreen
          setIsInitialized={(init) =>
            setAppState((prev) => ({ ...prev, isInitialized: init }))
          }
          setCurrentView={setCurrentView}
        />
      </div>
    );
  }

  return (
    <div className='bg-black flex flex-col h-screen text-white safe-area-top safe-area-bottom overflow-hidden'>
      <AutoIncrementYieldPerHour
        currentView={appState.currentView}
        setCurrentView={setCurrentView}
      />
      <CheckTokenHoldings />
      <ComebackReward
        currentView={appState.currentView}
        setCurrentView={setCurrentView}
      />

      {isGameView ? (
        <AnimatePresence mode='wait'>
          <motion.div
            key={appState.currentView}
            className={`${luckiestGuyFont.className}`}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.7 }}
            transition={{ duration: 0.1 }}
          >
            {renderCurrentView}
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode='wait'>
          <motion.div
            key={appState.currentView}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.7 }}
            transition={{ duration: 0.1 }}
            className='flex flex-col h-full w-full'
          >
            {renderCurrentView}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Optimized Navigation */}
      {shouldShowNavigation && (
        <MemoizedNavigation
          currentView={appState.currentView}
          setCurrentView={setCurrentView}
        />
      )}

      {/* Global Popups */}
      {popupState.showWithdrawalPopup && (
        <WithdrawalPopup
          onClose={handleCloseWithdrawalPopup}
          tonBalance={userInfo.tonBalance}
          setTonBalance={userInfo.setTonBalance}
          maxAmount={userInfo.tonBalance}
          userTelegramInitData={userInfo.userTelegramInitData}
          cachedWithdrawalData={popupState.cachedWithdrawalData}
          onRefreshData={fetchWithdrawalData}
        />
      )}

      {/* Star Selection Popup */}
      {popupState.showStarPopup && (
        <StarSelectionPopup
          onClose={handleCloseStarPopup}
          onConfirm={handleStarConfirm}
          mode='topup'
          onBack={handleCloseStarPopup}
        />
      )}
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // report this
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex items-center justify-center h-screen bg-black text-white'>
          <div className='text-center p-4'>
            <h1 className='text-xl mb-4'>Something went wrong.</h1>
            <button
              onClick={() => window.location.reload()}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ClickerPageWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ClickerPage />
    </ErrorBoundary>
  );
}
