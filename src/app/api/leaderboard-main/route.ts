// app/api/leaderboard-main/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateYieldPerHour } from '@/utils/calculations';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Type definitions
interface LeaderboardUser {
  name: string;
  avatar: string | null;
  rank: number;
  value: number;
  telegramId: string;
  isInTop100?: boolean;
}

interface UserCacheEntry {
  data: LeaderboardUser;
  timestamp: number;
}

interface CacheData {
  top100: LeaderboardUser[] | null;
  timestamp: number;
  userCache: Map<string, UserCacheEntry>;
}

interface LeaderboardResult {
  top: LeaderboardUser[] | null;
  me: LeaderboardUser | null;
}

// Cache configuration
const cache: Record<'yield' | 'stars', CacheData> = {
  yield: {
    top100: null,
    timestamp: 0,
    userCache: new Map<string, UserCacheEntry>()
  },
  stars: {
    top100: null,
    timestamp: 0,
    userCache: new Map<string, UserCacheEntry>()
  }
};

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for top 100
const USER_CACHE_TTL = 1 * 60 * 1000; // 1 minute for individual user ranks

export async function GET(req: NextRequest) {
  const performanceStart = Date.now();

  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'yield';
    const initData = searchParams.get('initData');

    if (!initData) {
      return NextResponse.json({ error: 'Telegram initData is required' }, { status: 400 });
    }

    // Validate Telegram data
    const { validatedData, user } = validateTelegramWebAppData(initData);
    if (!validatedData || !user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();
    if (!telegramId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (type !== 'yield' && type !== 'stars') {
      return NextResponse.json({ error: 'Invalid leaderboard type' }, { status: 400 });
    }

    const cacheKey = type as 'yield' | 'stars';
    const now = Date.now();

    // Check if we have fresh top 100 data
    const hasFreshTop100 = cache[cacheKey].top100 !== null && now - cache[cacheKey].timestamp < CACHE_TTL;

    // Check if user is in cached top 100 (fastest path)
    if (hasFreshTop100 && cache[cacheKey].top100 !== null) {
      const userInTop = cache[cacheKey].top100!.find((u) => u.telegramId === telegramId);
      if (userInTop) {
        console.log(`Leaderboard cache hit (user in top 100): ${Date.now() - performanceStart}ms`);
        return NextResponse.json({
          top: cache[cacheKey].top100,
          me: userInTop
        });
      }

      // Check cached user rank for users outside top 100
      const cachedUser = cache[cacheKey].userCache.get(telegramId);
      if (cachedUser && now - cachedUser.timestamp < USER_CACHE_TTL) {
        console.log(`Leaderboard cache hit (user rank): ${Date.now() - performanceStart}ms`);
        return NextResponse.json({
          top: cache[cacheKey].top100,
          me: cachedUser.data
        });
      }
    }

    // Need to fetch data
    let result: LeaderboardResult;
    if (type === 'yield') {
      result = await getYieldLeaderboard(telegramId, hasFreshTop100);
    } else {
      result = await getStarsLeaderboard(telegramId, hasFreshTop100);
    }

    // Update cache
    if (result.top !== null) {
      cache[cacheKey].top100 = result.top;
      cache[cacheKey].timestamp = now;
    }

    // Cache user data if not in top 100
    if (result.me && !result.me.isInTop100) {
      cache[cacheKey].userCache.set(telegramId, {
        data: result.me,
        timestamp: now
      });
    }

    console.log(`Leaderboard query completed: ${Date.now() - performanceStart}ms`);

    return NextResponse.json({
      top: result.top ?? cache[cacheKey].top100,
      me: result.me
    });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
  }
}

async function getYieldLeaderboard(telegramId: string, skipTop100: boolean = false): Promise<LeaderboardResult> {
  let top100: LeaderboardUser[] | null = null;

  // Get top 100 if not cached or if we need fresh data
  if (!skipTop100) {
    try {
      // Using aggregation to calculate yield and sort
      const topUsers = (await prisma.$runCommandRaw({
        aggregate: 'User',
        pipeline: [
          {
            $match: {
              telegramId: { $ne: '' }
            }
          },
          {
            $addFields: {
              calculatedYield: {
                $multiply: [
                  { $ifNull: ['$yieldPerHour', 0] },
                  {
                    $add: [
                      1,
                      {
                        $divide: [{ $ifNull: ['$bonusYieldPerHour', 0] }, 100]
                      }
                    ]
                  }
                ]
              }
            }
          },
          {
            $sort: {
              calculatedYield: -1,
              telegramId: 1 // Consistent tiebreaker
            }
          },
          {
            $limit: 100
          },
          {
            $project: {
              telegramId: 1,
              name: 1,
              'inventory.equippedAvatarName': 1,
              yieldPerHour: 1,
              bonusYieldPerHour: 1,
              calculatedYield: 1
            }
          }
        ],
        cursor: {}
      })) as { cursor?: { firstBatch?: any[] } };

      const users = topUsers.cursor?.firstBatch || [];

      top100 = users.map((user: any, index: number) => ({
        name: user.name || 'Unknown',
        avatar: user.inventory?.equippedAvatarName || null,
        rank: index + 1,
        value: user.calculatedYield,
        telegramId: user.telegramId
      }));
    } catch (error) {
      console.error('Error fetching top yield users:', error);
      top100 = null;
    }
  }

  // Check if user is in top 100
  if (top100 !== null) {
    const userInTop = top100.find((u) => u.telegramId === telegramId);
    if (userInTop) {
      return {
        top: top100,
        me: { ...userInTop, isInTop100: true }
      };
    }
  }

  // User not in top 100, calculate their rank
  const userRankData = await getUserYieldRank(telegramId);

  return {
    top: top100,
    me: userRankData
  };
}

async function getUserYieldRank(telegramId: string): Promise<LeaderboardUser | null> {
  try {
    // Get user data using telegramId index
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        name: true,
        telegramId: true,
        inventory: {
          select: {
            equippedAvatarName: true
          }
        },
        yieldPerHour: true,
        bonusYieldPerHour: true
      }
    });

    if (!user) return null;

    const userYield = user.yieldPerHour || 0;
    const userBonusYield = user.bonusYieldPerHour || 0;
    const userTotalYield = calculateYieldPerHour(userBonusYield, userYield);

    // Using aggregation to count users with higher calculated yield
    const rankResult = (await prisma.$runCommandRaw({
      aggregate: 'User',
      pipeline: [
        {
          $match: {
            telegramId: { $ne: '' }
          }
        },
        {
          $addFields: {
            calculatedYield: {
              $multiply: [
                { $ifNull: ['$yieldPerHour', 0] },
                {
                  $add: [
                    1,
                    {
                      $divide: [{ $ifNull: ['$bonusYieldPerHour', 0] }, 100]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $match: {
            calculatedYield: { $gt: userTotalYield }
          }
        },
        {
          $count: 'higherCount'
        }
      ],
      cursor: {}
    })) as { cursor?: { firstBatch?: any[] } };

    const higherUsersCount = rankResult.cursor?.firstBatch?.[0]?.higherCount || 0;

    return {
      name: user.name || 'You',
      avatar: user.inventory?.equippedAvatarName || null,
      rank: higherUsersCount + 1,
      value: userTotalYield,
      telegramId: telegramId,
      isInTop100: false
    };
  } catch (error) {
    console.error('Error getting user yield rank:', error);
    return null;
  }
}

async function getStarsLeaderboard(telegramId: string, skipTop100: boolean = false): Promise<LeaderboardResult> {
  let top100: LeaderboardUser[] | null = null;

  // Get top 100 if not cached
  if (!skipTop100) {
    try {
      // Optimized query using the stars_leaderboard_idx index
      const topUsers = await prisma.user.findMany({
        where: {
          telegramId: { not: '' }
        },
        select: {
          telegramId: true,
          name: true,
          inventory: {
            select: {
              equippedAvatarName: true
            }
          },
          earnedStars: true
        },
        orderBy: [{ earnedStars: 'desc' }, { id: 'asc' }],
        take: 100
      });

      top100 = topUsers.map((user, index) => ({
        name: user.name || 'Unknown',
        avatar: user.inventory?.equippedAvatarName || null,
        rank: index + 1,
        value: user.earnedStars || 0,
        telegramId: user.telegramId
      }));
    } catch (error) {
      console.error('Error fetching top stars users:', error);
      top100 = null;
    }
  }

  // Check if user is in top 100
  if (top100 !== null) {
    const userInTop = top100.find((u) => u.telegramId === telegramId);
    if (userInTop) {
      return {
        top: top100,
        me: { ...userInTop, isInTop100: true }
      };
    }
  }

  // User not in top 100, calculate their rank
  const userRankData = await getUserStarsRank(telegramId);

  return {
    top: top100,
    me: userRankData
  };
}

async function getUserStarsRank(telegramId: string): Promise<LeaderboardUser | null> {
  try {
    // Get user data using telegramId index
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        name: true,
        telegramId: true,
        inventory: {
          select: {
            equippedAvatarName: true
          }
        },
        earnedStars: true
      }
    });

    if (!user) return null;

    const userStars = user.earnedStars || 0;

    // Efficient rank calculation using stars index
    const higherUsersCount = await prisma.user.count({
      where: {
        telegramId: { not: '' },
        earnedStars: { gt: userStars }
      }
    });

    return {
      name: user.name || 'You',
      avatar: user.inventory?.equippedAvatarName || null,
      rank: higherUsersCount + 1,
      value: userStars,
      telegramId: telegramId,
      isInTop100: false
    };
  } catch (error) {
    console.error('Error getting user stars rank:', error);
    return null;
  }
}

// Utility function to clear cache (for testing or manual refresh)
async function invalidateCache(type?: 'yield' | 'stars'): Promise<void> {
  if (type) {
    cache[type].top100 = null;
    cache[type].timestamp = 0;
    cache[type].userCache.clear();
  } else {
    // Clear all cache
    const cacheKeys: Array<'yield' | 'stars'> = ['yield', 'stars'];
    cacheKeys.forEach((key) => {
      cache[key].top100 = null;
      cache[key].timestamp = 0;
      cache[key].userCache.clear();
    });
  }
}
