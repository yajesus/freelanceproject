import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import FriendPassportButton from './FriendPassportButton';
import { shopImageMap, character1, trophy, AirdropBgGradient } from '@/images';
import { formatNumber, showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { shortText } from '@/lib/utils';
import Trophy from '@/icons/Trophy';

interface LeaderboardEntry {
  name: string;
  avatar: string | null;
  rank: number | string;
  value: number;
  telegramId: string;
}

interface LeaderboardData {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

const tabOptions = [
  { id: 'yield', label: 'Yield Per Hour' },
  { id: 'stars', label: 'Stars Earned' },
  { id: 'ton', label: 'TON Earned' }
];

type TabType = 'yield' | 'stars' | 'ton';

// Trophy Components
const TrophyIcon: React.FC<{ rank: number }> = ({ rank }) => {
  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return '#6B7280'; // Gray
    }
  };

  if (rank > 3) return <div className='flex items-center justify-center text-gray-400'>{rank}</div>;

  return (
    <div className='flex items-center justify-center'>
      <Trophy color={getTrophyColor(rank)} />
    </div>
  );
};

// User Position Card Component
const UserPositionCard: React.FC<{
  me: LeaderboardEntry | null;
  category: TabType;
  equippedAvatar: string;
}> = ({ me, category, equippedAvatar }) => {
  if (!me) return null;

  return (
    <div className='bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-4 mb-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-10 h-10 bg-purple-600/30 rounded-full'>
            <Image
              priority={false}
              src={equippedAvatar ? shopImageMap[`${equippedAvatar}`] || character1 : character1}
              alt='User Avatar'
              width={36}
              height={36}
              className='rounded-full ring-2 ring-gray-700 w-9 h-9'
              style={{ width: '36px', height: '36px' }}
            />
          </div>
          <div>
            <p className='text-sm text-gray-300'>Your Position</p>
            <p className='text-lg font-bold'>{me.rank}</p>
          </div>
        </div>
        <div className='text-right'>
          <p className='text-sm text-gray-300'>{category === 'yield' ? 'Yield Per Hour' : 'Stars'}</p>
          <p className='text-lg font-bold'>{formatNumber(me.value)}</p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Table Row Component
const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  index: number;
}> = ({ entry, isCurrentUser, index }) => {
  const rankNum = typeof entry.rank === 'number' ? entry.rank : parseInt(entry.rank.toString());

  return (
    <tr
      className={`border-b border-[#363636] transition-colors duration-200 ${
        isCurrentUser ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30' : 'hover:bg-[#252525]'
      }`}
    >
      <td className='py-3 px-3'>
        <TrophyIcon rank={rankNum} />
      </td>
      <td className='py-3 px-3'>
        <div className='flex items-center gap-3'>
          <div className='relative flex-shrink-0'>
            <FriendPassportButton
              userId={entry.telegramId}
              button={
                <Image
                  priority={false}
                  src={entry.avatar ? shopImageMap[`${entry.avatar}`] || character1 : character1}
                  alt='User Avatar'
                  className='w-full h-full rounded-full ring-2 ring-gray-700'
                />
              }
            />
          </div>
          <div className='flex-1 min-w-0'>
            <span className={`font-medium block truncate ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
              {shortText({ text: entry.name, startLength: 3, endLength: 3 })}
            </span>
            {isCurrentUser && <p className='text-xs text-purple-400'>You</p>}
          </div>
        </div>
      </td>
      <td className='py-3 px-3'>
        <span className={`font-bold ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
          {formatNumber(entry.value)}
        </span>
      </td>
    </tr>
  );
};

const AppLeaderboard: React.FC<{
  currentView: string;
  setCurrentView: (view: string) => void;
}> = ({ currentView, setCurrentView }) => {
  const [category, setCategory] = useState<TabType>('yield');
  const [data, setData] = useState<{ yield: LeaderboardData; stars: LeaderboardData }>({
    yield: { top: [], me: null },
    stars: { top: [], me: null }
  });
  const [isLoading, setIsLoading] = useState(true);
  const { userTelegramInitData, equippedAvatar } = useGameStore();

  // Extract Telegram ID utility function
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

  // Get current user's Telegram ID for highlighting
  const currentUserId = useMemo(() => {
    return extractTelegramId(userTelegramInitData) || 'undefined';
  }, [userTelegramInitData]);

  const handleViewChange = useCallback(
    (view: string) => {
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
    },
    [setCurrentView]
  );

  // Fetch leaderboard data for the selected category
  const fetchLeaderboard = useCallback(
    async (type: 'yield' | 'stars') => {
      setIsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(
          `/api/leaderboard-main?type=${type}&initData=${encodeURIComponent(userTelegramInitData)}`,
          {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const result = await res.json();

        setData((prev) => ({
          ...prev,
          [type]: {
            top: Array.isArray(result.top) ? result.top : [],
            me: result.me || null
          }
        }));
      } catch (error) {
        console.error(`Error fetching ${type} leaderboard:`, error);
        setData((prev) => ({
          ...prev,
          [type]: { top: [], me: null }
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [userTelegramInitData]
  );

  useEffect(() => {
    const setupBackButton = async () => {
      try {
        await showBackButton(() => {
          handleViewChange('profile');
        });
      } catch (error) {
        console.error('Error setting up back button:', error);
      }
    };

    setupBackButton();
  }, [handleViewChange]);

  useEffect(() => {
    if (category === 'yield' || category === 'stars') {
      fetchLeaderboard(category);
    }
  }, [category, fetchLeaderboard]);

  // Memoized current data
  const currentData = useMemo(() => {
    return category === 'yield' ? data.yield : data.stars;
  }, [category, data]);

  const renderTable = useCallback(
    (entries: LeaderboardEntry[], me: LeaderboardEntry | null) => (
      <div className='bg-[#18181C] border border-[#363636] rounded-3xl p-4 shadow-xl'>
        <div className='flex items-center justify-center mb-6'>
          <Image priority={false} src={trophy} alt='Trophy' width={28} height={28} />
          <h3 className='text-xl font-bold ml-3'>
            {category === 'yield' ? 'Yield Per Hour Rankings' : 'Stars Earned Rankings'}
          </h3>
        </div>

        {entries.length === 0 ? (
          <div className='text-center py-8 text-gray-400'>
            <p>No leaderboard data available</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left'>
              <thead>
                <tr className='text-[#EBEEF5] text-sm border-b border-[#363636]'>
                  <th className='py-3 px-3 font-semibold'>Rank</th>
                  <th className='py-3 px-3 font-semibold'>Player</th>
                  <th className='py-3 px-3 font-semibold'>{category === 'yield' ? 'Per Hour' : 'Stars'}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <LeaderboardRow
                    key={`${entry.telegramId}-${index}`}
                    entry={entry}
                    isCurrentUser={entry.telegramId === currentUserId}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),
    [category, currentUserId]
  );

  return (
    <div className='bg-black flex justify-center min-h-screen relative'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl relative z-10'>
        <div className='h-screen mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0'>
          <div className='flex-grow mt-[2px] bg-[#080808] rounded-t-[46px] h-full overflow-y-auto no-scrollbar relative'>
            <div className='px-4 pt-4 pb-[calc(90px+1.5rem+20px)] margin-safe-area-top margin-safe-area-bottom'>
              {/* Header */}
              <div className='flex items-center mb-6'>
                <div className='w-10'></div>
                <h1 className='text-2xl font-bold text-center flex-1'>Leaderboard</h1>
                <div className='w-10'></div>
              </div>

              {/* Tabs */}
              <div className='flex items-center gap-2 mb-6'>
                {tabOptions.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategory(tab.id as TabType)}
                    disabled={isLoading}
                    className={`relative flex flex-1 items-center justify-center gap-2 px-3 py-4 rounded-[35px] cursor-pointer pointer text-white text-center transition-all duration-200 disabled:opacity-50
                      ${category === tab.id ? 'bg-gradient-button shadow-lg' : 'bg-[#151515] hover:bg-[#202020]'}`}
                  >
                    <div
                      className={`rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#1E1E1E] w-[calc(100%-3px)] h-[calc(100%-3px)] ${
                        category === tab.id ? '' : 'hidden'
                      }`}
                    ></div>
                    <span className='relative z-40 text-nowrap font-medium'>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* User Position Card */}
              {category !== 'ton' ? (
                <UserPositionCard me={currentData.me} category={category} equippedAvatar={equippedAvatar} />
              ) : null}

              {/* Content */}
              {category === 'ton' ? (
                <div className='flex flex-col items-center justify-center py-16 bg-[#18181C] border border-[#363636] rounded-3xl'>
                  <span className='text-2xl font-bold mb-2'>TON Earned</span>
                  <span className='text-lg text-[#EBEEF5]'>Coming Soon</span>
                  <p className='text-sm text-gray-400 mt-2 text-center px-4'>
                    Track your TON earnings and compete with other players
                  </p>
                </div>
              ) : isLoading ? (
                <div className='flex flex-col justify-center items-center py-16'>
                  <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4'></div>
                  <p className='text-gray-400'>Loading leaderboard...</p>
                </div>
              ) : (
                renderTable(currentData.top, currentData.me)
              )}
            </div>
          </div>
          <Image
            priority={false}
            src={AirdropBgGradient}
            alt='Background Gradient'
            width={0}
            height={0}
            sizes='100vw'
            className='absolute w-full left-0 bottom-0 object-contain z-0'
          />
        </div>
      </div>
    </div>
  );
};

export default AppLeaderboard;
