// app/api/tasks/check/visit/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { calculateYieldPerHour } from '@/utils/calculations';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { getTweetData, getTwitterUserFollowersCount } from '@/utils/twitter';
import { getInstagramUserMediaList, getInstagramPostInsights, getInstagramUserDetails } from '@/utils/instagram';
import { getYouTubeVideoStats } from '@/utils/youtube';

interface CheckVisitTaskRequestBody {
  initData: string;
  taskId: string;
  submissionUrl?: string;
}

type TwitterMetadata = {
  platform: 'twitter';
  tweetId: string;
  likeCount: number;
  replyCount: number;
  retweetCount: number;
  followersCount?: number;
};

type InstagramMetadata = {
  platform: 'instagram';
  likes: number;
  comments: number;
  followersCount: number;
};

type YouTubeMetadata = {
  platform: 'youtube';
  subscriberCount: number;
  id: string;
  title: string;
  isShort: boolean;
  views: number;
  likes: number;
  comments: number;
};

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    if (hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1);
    } else if (hostname.includes('youtube.com')) {
      if (parsedUrl.pathname.startsWith('/shorts/')) {
        return parsedUrl.pathname.split('/')[2];
      } else if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractTwitterUsername(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const username = pathname.split('/')[1];
    return username || null;
  } catch {
    return null;
  }
}

function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/);
  return match ? match[1] : null;
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  const requestBody: CheckVisitTaskRequestBody = await req.json();
  const { initData: telegramInitData, taskId, submissionUrl = null } = requestBody;

  if (!telegramInitData || !taskId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (prisma) => {
        // Find the user
        const dbUser = await prisma.user.findUnique({
          where: { telegramId }
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        // Find the task
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { taskAction: true }
        });

        if (!task) {
          throw new Error('Task not found');
        }

        // Check if the task is active
        if (!task.isActive) {
          throw new Error('This task is no longer active');
        }

        // Check if the task is of action VISIT and has taskData
        if (task.taskAction.name !== 'VISIT' || !task.taskData) {
          throw new Error('Invalid task action or missing task data for this operation');
        }

        const taskData = task.taskData as { link?: string; waitTime?: number; requireSubmission?: boolean };
        let tweetData;
        let followers_count: any;

        // Check Twitter verification if needed
        if (taskData.link?.match(/(twitter\.com|x\.com)/)) {
          const username = extractTwitterUsername(taskData.link);
          const tweetId = extractTweetId(taskData.link);

          // Check if it's a profile link only
          const isProfileLinkOnly = username && !tweetId;

          if (username) {
            try {
              followers_count = await getTwitterUserFollowersCount(username);
            } catch (error) {
              console.error('Failed to fetch Twitter followers:', error);
              throw error;
            }
          }

          // Only if it's a tweet link
          if (tweetId) {
            try {
              tweetData = await getTweetData(tweetId);

              if (!tweetData || !tweetData.public_metrics) {
                return NextResponse.json(
                  {
                    success: false,
                    message: 'Unable to retrieve tweet data.'
                  },
                  { status: 400 }
                );
              }
            } catch (error) {
              console.error('Failed to fetch tweet data:', error);
              throw error;
            }
          }
        }

        let insights: any;
        if (taskData.link?.match(/instagram\.com\/(p|reel|tv)\//)) {
          const shortcode = extractInstagramShortcode(taskData.link);

          if (shortcode) {
            try {
              const posts = await getInstagramUserMediaList();
              const matchedPost = posts.find(
                (post: { permalink: string }) => extractInstagramShortcode(post.permalink) === shortcode
              );
              if (matchedPost) {
                insights = await getInstagramPostInsights(matchedPost.id);
              } else {
                console.warn('Instagram post not found via media list');
              }
            } catch (err) {
              console.error('Instagram verification failed:', err);
              throw err;
            }
          }
        }

        // Calculate reset time for DAILY tasks
        const now = new Date();
        const resetTime = new Date(now);
        resetTime.setUTCHours(TASK_DAILY_RESET_TIME, 0, 0, 0);

        // If current time is before reset time, set reset time to previous day
        if (now < resetTime) {
          resetTime.setDate(resetTime.getDate() - 1);
        }

        // Find the user's task with time condition for DAILY tasks
        const userTask = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            ...(task.type === 'DAILY' && {
              taskStartTimestamp: {
                gte: resetTime
              }
            })
          }
        });

        if (!userTask) {
          throw new Error('Task not started');
        }

        if (userTask.isCompleted) {
          throw new Error('Task already completed');
        }

        // Check submission URL if required
        if (taskData.requireSubmission && !submissionUrl) {
          return {
            success: false,
            message: 'UID is required'
          };
        }

        // Check Twitter engagement if needed
        const metadata = userTask?.metadata;

        if (metadata && typeof metadata === 'object' && 'platform' in metadata) {
          if ((metadata as TwitterMetadata).platform === 'twitter') {
            const twitterMetadata = metadata as TwitterMetadata;
            let currentLikes;
            let currentReplies;
            let currentRetweet;
            let likeIncreased;
            let replyIncreased;
            let retweetIncreased;
            if (tweetData) {
              currentLikes = tweetData.public_metrics.like_count;
              currentReplies = tweetData.public_metrics.reply_count;
              currentRetweet = tweetData.public_metrics.retweet_count;
              likeIncreased = currentLikes > twitterMetadata.likeCount;
              replyIncreased = currentReplies > twitterMetadata.replyCount;
              retweetIncreased = currentRetweet > twitterMetadata.retweetCount;
            }

            if (
              task.title === 'Follow our X account' ||
              task.title === 'Follow JokTimeToTroll on X' ||
              task.title === 'Follow JokWhySoSerious on X'
            ) {
              const follower: any = twitterMetadata.followersCount;
              const followersIncreased: any = followers_count > follower;

              if (!followersIncreased) {
                return {
                  success: false,
                  message: 'Please follow the Twitter account before check.'
                };
              }
            } else {
              if (!likeIncreased || !replyIncreased || !retweetIncreased) {
                return {
                  success: false,
                  message: 'Please like and reply to the tweet before submitting.'
                };
              }
            }
          } else if ((metadata as InstagramMetadata).platform === 'instagram') {
            const instagramMetadata = metadata as InstagramMetadata;
            const savedLikes = Number(instagramMetadata.likes) || 0;
            const savedComments = Number(instagramMetadata.comments) || 0;
            const savedFollowers = Number(instagramMetadata.followersCount) || 0;
            const userDetails = await getInstagramUserDetails();

            const currentLikes = insights?.likes || 0;
            const currentComments = insights?.comments || 0;
            const currentFollowers = userDetails?.followers_count || savedFollowers;

            const likesIncreased = currentLikes > savedLikes;
            const commentsIncreased = currentComments > savedComments;

            if (task.title === 'Follow our Instagram') {
              const followersIncreased = currentFollowers > savedFollowers;

              if (!followersIncreased) {
                return {
                  success: false,
                  message: 'Please follow the Instagram account before check.'
                };
              }
            } else {
              if (!likesIncreased || !commentsIncreased) {
                return {
                  success: false,
                  message: 'Please like and comment on the post before check.'
                };
              }
            }
          }
        }

        if (
          (metadata as any)?.platform === 'youtube' &&
          taskData.link &&
          taskData.link?.match(/(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/)
        ) {
          const youtubeMetadata = metadata as YouTubeMetadata;
          let videoStats: any;

          const videoId = extractYouTubeVideoId(taskData.link);
          if (videoId) {
            try {
              const stats = await getYouTubeVideoStats([videoId]);
              if (stats.length) {
                videoStats = stats[0];
                console.log(youtubeMetadata);
                const savedLikes = Number(youtubeMetadata.likes);

                const likeIncreased = Number(videoStats.likes) > savedLikes;

                if (!likeIncreased) {
                  return {
                    success: false,
                    message: 'Please like the YouTube short before check.'
                  };
                }
              }
            } catch (err) {
              console.error('YouTube video verification failed:', err);
              throw err;
            }
          }
        }

        // All criteria passed, now handle task completion based on type
        if (task.type === 'DAILY') {
          // Check if already completed today
          const now = new Date();
          const resetTime = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
          );
          const nextResetTime = new Date(resetTime.getTime() + 24 * 60 * 60 * 1000);

          const userTaskToday = await prisma.userTask.findFirst({
            where: {
              userId: dbUser.id,
              taskId: task.id,
              completedAt: {
                gte: resetTime,
                lt: nextResetTime
              }
            }
          });

          if (userTaskToday) {
            return {
              success: false,
              message: 'Daily task already completed.'
            };
          }

          // Update existing daily task entry
          const updatedUserTask = await prisma.userTask.update({
            where: {
              id: userTask.id
            },
            data: {
              userId: dbUser.id,
              taskId: task.id,
              isCompleted: true,
              completedAt: new Date(),
              submissionUrl: submissionUrl || undefined
            }
          });

          // Calculate points with multiplier for daily tasks
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 2; // Daily tasks get 2x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Update user's points and stars
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          // Create transaction record
          await prisma.transaction.create({
            data: {
              userId: dbUser.id,
              sourceId: updatedUserTask.id,
              amount: task.rewardStars || 0,
              type: TransactionType.EARNED,
              status: TransactionStatus.COMPLETED,
              description: `Daily task reward: ${task.title}`
            }
          });

          return {
            success: true,
            message: 'Daily Task completed successfully',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        } else {
          // For non-daily tasks, update existing task
          const updatedUserTask = await prisma.userTask.update({
            where: {
              id: userTask.id
            },
            data: {
              isCompleted: true,
              completedAt: new Date(),
              submissionUrl: submissionUrl || undefined
            }
          });

          // Calculate points with multiplier
          const pointsToIncrement = task.points || 0;
          const pointsMultiplier = task.multiplier || 1.5; // Regular tasks get 1.5x multiplier
          const userYieldPerHour = dbUser.yieldPerHour || 0;
          const userBonusYield = dbUser.bonusYieldPerHour || 0;
          const totalMultiplier = calculateYieldPerHour(userBonusYield, userYieldPerHour) * pointsMultiplier;
          const points = Math.round(pointsToIncrement + totalMultiplier);

          // Update user's points and stars
          const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              points: { increment: points },
              pointsBalance: { increment: points },
              totalStars: { increment: task.rewardStars || 0 },
              earnedStars: { increment: task.rewardStars || 0 }
            }
          });

          // Create transaction record
          await prisma.transaction.create({
            data: {
              userId: dbUser.id,
              sourceId: updatedUserTask.id,
              amount: task.rewardStars || 0,
              type: TransactionType.EARNED,
              status: TransactionStatus.COMPLETED,
              description: `Task reward: ${task.title}`
            }
          });

          return {
            success: true,
            message: 'Task completed successfully',
            isCompleted: updatedUserTask.isCompleted,
            completedAt: updatedUserTask.completedAt,
            points,
            totalStars: updatedUser.totalStars,
            earnedStars: updatedUser.earnedStars
          };
        }
      },
      { timeout: 20000 }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking visit task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check visit task'
      },
      { status: 500 }
    );
  }
}
