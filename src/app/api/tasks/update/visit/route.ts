// app/api/tasks/update/visit/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { ADD_TO_HOMESCREEN_TASK_NAME, TASK_DAILY_RESET_TIME } from '@/utils/consts';
import { getTweetData, getTwitterUserFollowersCount } from '@/utils/twitter';
import { getInstagramUserMediaList, getInstagramPostInsights, getInstagramUserDetails } from '@/utils/instagram';
import { getYouTubeVideoStats } from '@/utils/youtube';


interface UpdateTaskRequestBody {
  initData: string;
  taskId: string;
}

function extractTwitterUsername(url: string): string | null {
  // Example URL: https://x.com/JokInTheBox_Off
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname; // "/JokInTheBox_Off"
    const username = pathname.split('/')[1]; // "JokInTheBox_Off"
    return username || null;
  } catch {
    return null;
  }
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/);
  return match ? match[1] : null;
}
function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/);
  return match ? match[1] : null;
}

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

export async function POST(req: Request) {
  const requestBody: UpdateTaskRequestBody = await req.json();
  const { initData: telegramInitData, taskId } = requestBody;

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
    const result = await prisma.$transaction(async (prisma) => {
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

      // Check if the task is of action VISIT
      if (task.taskAction.name !== 'VISIT') {
        throw new Error('Invalid task action for this operation');
      }

      // Check if the task is DAILY
      if (task.type === 'DAILY') {
        // Get the current date and time in UTC
        const now = new Date();
        const resetTime = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TASK_DAILY_RESET_TIME, 0, 0)
        );

        // Check if a daily task has already been created for today
        const userTaskToday = await prisma.userTask.findFirst({
          where: {
            userId: dbUser.id,
            taskId: task.id,
            completedAt: {
              gte: resetTime, // After reset time today
              lt: new Date(resetTime.getTime() + 24 * 60 * 60 * 1000) // Before reset time tomorrow
            }
          }
        });

        if (userTaskToday) {
          throw new Error('Daily task already started');
        }

        // Create a new UserTask entry for daily task
        const userTask = await prisma.userTask.create({
          data: {
            userId: dbUser.id,
            taskId: task.id,
            taskStartTimestamp: new Date(),
            isCompleted: false
          }
        });

        return {
          success: true,
          message: 'Daily task started successfully.',
          taskStartTimestamp: userTask.taskStartTimestamp
        };
      }
      const taskData = task.taskData as { link?: string };

      let metadata: Record<string, any> = {};

      if (taskData.link?.match(/(twitter\.com|x\.com)/)) {
        const username = extractTwitterUsername(taskData.link);

        if (username) {
          try {
            const userData = await getTwitterUserFollowersCount(username);

            if (!userData) {
              console.warn('No user metrics available');
            } else {
              metadata = {
                platform: 'twitter',
                followersCount: userData
              };
            }
          } catch (error) {
            console.error('Twitter verification failed:', error);
            throw error;
          }
        }
        const tweetId = extractTweetId(taskData.link);

        if (tweetId) {
          try {
            const tweetData = await getTweetData(tweetId);

            if (!tweetData || !tweetData.public_metrics) {
              console.warn('No tweet metrics available');
            } else {
              metadata = {
                platform: 'twitter',
                tweetId: tweetData.id,
                likeCount: tweetData.public_metrics.like_count,
                retweetCount: tweetData.public_metrics.retweet_count,
                replyCount: tweetData.public_metrics.reply_count
              };
            }
          } catch (error) {
            console.error('Twitter verification failed:', error);
            throw error;
          }
        }
      }

    
      if (task.title === 'Follow our Instagram') {
        const userDetails = await getInstagramUserDetails();
        
        metadata = {
          platform: 'instagram',
          username: userDetails.username,
          followersCount: userDetails.followers_count,
          profilePicture: userDetails.profile_picture_url,
        };
      }
      if (taskData.link?.match(/instagram\.com\/(p|reel|tv)\//)) {
       
        
          const shortcode = extractInstagramShortcode(taskData.link);
          if (shortcode) {
            try {
              // Fetch user media list
              const posts = await getInstagramUserMediaList();

              const matchedPost = posts.find(
                (post: { permalink: string }) =>
                  extractInstagramShortcode(post.permalink) === shortcode
              );

              if (matchedPost) {
                // Fetch post insights
                const insights = await getInstagramPostInsights(matchedPost.id);

                // Fetch account details
                const userDetails = await getInstagramUserDetails();

                metadata = {
                  platform: 'instagram',
                  mediaId: matchedPost.id,
                  permalink: matchedPost.permalink,
                  caption: matchedPost.caption,
                  username: userDetails.username,
                  followersCount: userDetails.followers_count,
                  profilePicture: userDetails.profile_picture_url,
                  ...insights,
                };
              } else {
                console.warn('Instagram post not found via media list');
              }
            } catch (err) {
              console.error('Instagram verification failed:', err);
              throw err;
            }
          }
        
      }


      if (taskData.link?.match(/(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/)) {
        const videoId = extractYouTubeVideoId(taskData.link);
      
        if (videoId) {
          const videoStats = await getYouTubeVideoStats([videoId]); 
      
          if (videoStats.length > 0) {
            const video = videoStats[0];
            metadata = {
              platform: 'youtube',
              videoId: video.id,
              title: video.title,
              isShort: video.isShort,
              views: video.views,
              likes: video.likes,
            };
          }
        }
      }
      

      // For VISIT tasks, check if the user has already started this task
      const existingUserTask = await prisma.userTask.findFirst({
        where: {
          userId: dbUser.id,
          taskId: task.id
        }
      });

      if (existingUserTask) {
        throw new Error('Task already started');
      }

      // Create a new UserTask entry for VISIT task
      const userTask = await prisma.userTask.create({
        data: {
          userId: dbUser.id,
          taskId: task.id,
          taskStartTimestamp: new Date(),
          isCompleted: false,
          metadata
        }
      });

      return {
        success: true,
        message: 'Task started successfully',
        taskStartTimestamp: userTask.taskStartTimestamp
      };
    }, { timeout: 15000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}

