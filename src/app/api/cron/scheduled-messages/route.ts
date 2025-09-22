// api/cron/scheduled-messages/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { sendMessageToUser, sendPhotoToUser } from '@/utils/telegram';

const TELEGRAM_DELAY_MS = 100; // 100ms delay between Telegram API calls
const BATCH_SIZE = 20;

export async function GET() {
  try {
    // Get all pending scheduled messages that are due
    const pendingMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        isScheduled: true,
        scheduledAt: {
          lte: new Date() // Only get messages that are due now or in the past
        }
      },
      orderBy: {
        scheduledAt: 'asc' // Process oldest scheduled messages first
      }
    });

    if (pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending scheduled messages found',
        processed: 0
      });
    }

    console.log(`Found ${pendingMessages.length} pending scheduled messages`);

    // Process each scheduled message
    const results = [];

    for (const scheduledMessage of pendingMessages) {
      try {
        // Get all users with telegramId
        const totalUsers = await prisma.user.count({
          where: {
            telegramId: { not: '' }
          }
        });

        if (totalUsers === 0) {
          console.log(`No users found for scheduled message: ${scheduledMessage.title}`);

          // Update status to SENT since there are no users to send to
          await prisma.scheduledMessage.update({
            where: { id: scheduledMessage.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              sentCount: 0,
              failedCount: 0
            }
          });

          results.push({
            messageId: scheduledMessage.id,
            title: scheduledMessage.title,
            status: 'completed',
            reason: 'No users found'
          });
          continue;
        }

        // Get first batch of users
        const users = await prisma.user.findMany({
          where: {
            telegramId: { not: '' }
          },
          select: {
            id: true,
            telegramId: true
          },
          take: BATCH_SIZE
        });

        const hasMore = BATCH_SIZE < totalUsers;

        console.log(
          `Starting scheduled message: ${scheduledMessage.title}, users in first batch: ${users.length}, total users: ${totalUsers}`
        );

        let sentCount = 0;
        let failedCount = 0;

        // Process first batch
        for (const user of users) {
          try {
            let success = false;

            if (scheduledMessage.imageUrl) {
              success = await sendPhotoToUser(
                user.telegramId,
                scheduledMessage.imageUrl,
                scheduledMessage.message,
                scheduledMessage.buttonText || undefined,
                scheduledMessage.buttonUrl || undefined
              );
            } else {
              success = await sendMessageToUser(
                parseInt(user.telegramId),
                scheduledMessage.message,
                scheduledMessage.buttonText || undefined,
                scheduledMessage.buttonUrl || undefined
              );
            }

            if (success !== false) {
              sentCount++;
              console.log(`✅ Scheduled message sent to user: ${user.telegramId}`);
            } else {
              failedCount++;
              console.log(`❌ Failed to send scheduled message to user: ${user.telegramId}`);
            }
          } catch (error: any) {
            console.error(`❌ Exception sending scheduled message to user ${user.telegramId}:`, error.message || error);
            failedCount++;
          }

          // Add delay between messages
          if (users.indexOf(user) < users.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, TELEGRAM_DELAY_MS));
          }
        }

        // Update the scheduled message with first batch results
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessage.id },
          data: {
            sentCount,
            failedCount,
            sentAt: hasMore ? null : new Date()
          }
        });

        // If there are more users, trigger the next batch using the same API
        if (hasMore) {
          console.log(`Triggering next batch for scheduled message: ${scheduledMessage.title}`);

          // Use setTimeout to ensure the current request completes first
          setTimeout(async () => {
            try {
              const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

              const response = await fetch(`${baseUrl}/api/cron/scheduled-messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Next.js-Internal-Request'
                },
                body: JSON.stringify({
                  scheduledMessageId: scheduledMessage.id,
                  batch: 1 // Start from batch 1 since we already processed batch 0
                })
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const result = await response.json();
              console.log(`Next batch triggered for scheduled message ${scheduledMessage.id}:`, result);
            } catch (error) {
              console.error(`Failed to trigger next batch for scheduled message ${scheduledMessage.id}:`, error);

              // Update status to FAILED if we can't trigger next batch
              await prisma.scheduledMessage
                .update({
                  where: { id: scheduledMessage.id },
                  data: { status: 'FAILED' }
                })
                .catch(console.error);
            }
          }, 500);
        } else {
          // Mark as SENT if this was the only batch
          await prisma.scheduledMessage.update({
            where: { id: scheduledMessage.id },
            data: { status: 'SENT' }
          });
        }

        results.push({
          messageId: scheduledMessage.id,
          title: scheduledMessage.title,
          status: hasMore ? 'processing' : 'completed',
          firstBatchSent: sentCount,
          firstBatchFailed: failedCount,
          totalUsers,
          hasMore
        });
      } catch (error) {
        console.error(`Error processing scheduled message ${scheduledMessage.id}:`, error);

        // Update status to FAILED
        await prisma.scheduledMessage
          .update({
            where: { id: scheduledMessage.id },
            data: { status: 'FAILED' }
          })
          .catch(console.error);

        results.push({
          messageId: scheduledMessage.id,
          title: scheduledMessage.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingMessages.length} scheduled messages`,
      processed: pendingMessages.length,
      results
    });
  } catch (error) {
    console.error('Error in scheduled messages cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process scheduled messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let batch = 0;
  let scheduledMessageId: string | null = null;

  try {
    const body = await request.json();
    const { scheduledMessageId: msgId, batch: batchNum } = body;

    scheduledMessageId = msgId;
    batch = batchNum || 0;
    const skip = batch * BATCH_SIZE;

    if (!scheduledMessageId) {
      return NextResponse.json({ error: 'scheduledMessageId is required' }, { status: 400 });
    }

    // Get the scheduled message details
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id: scheduledMessageId }
    });

    if (!scheduledMessage) {
      return NextResponse.json({ error: 'Scheduled message not found' }, { status: 404 });
    }

    if (scheduledMessage.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: 'Scheduled message is not in PENDING status',
          currentStatus: scheduledMessage.status
        },
        { status: 400 }
      );
    }

    // Get a batch of users with telegramId from database
    const users = await prisma.user.findMany({
      where: {
        telegramId: { not: '' }
      },
      select: {
        id: true,
        telegramId: true
      },
      skip,
      take: BATCH_SIZE
    });

    // Check if there are more users by getting total count
    const totalUsers = await prisma.user.count({
      where: {
        telegramId: { not: '' }
      }
    });

    const hasMore = skip + BATCH_SIZE < totalUsers;

    console.log(
      `Processing scheduled message ${scheduledMessageId} batch ${batch}, users: ${users.length}, skip: ${skip}, total: ${totalUsers}, hasMore: ${hasMore}`
    );

    let sentCount = 0;
    let failedCount = 0;

    // Send messages to users in this batch
    for (const user of users) {
      try {
        let success = false;

        if (scheduledMessage.imageUrl) {
          success = await sendPhotoToUser(
            user.telegramId,
            scheduledMessage.imageUrl,
            scheduledMessage.message,
            scheduledMessage.buttonText || undefined,
            scheduledMessage.buttonUrl || undefined
          );
        } else {
          success = await sendMessageToUser(
            parseInt(user.telegramId),
            scheduledMessage.message,
            scheduledMessage.buttonText || undefined,
            scheduledMessage.buttonUrl || undefined
          );
        }

        if (success !== false) {
          sentCount++;
          console.log(`✅ Scheduled message sent to user: ${user.telegramId} (ID: ${user.id})`);
        } else {
          failedCount++;
          console.log(`❌ Scheduled message send returned false for user: ${user.telegramId} (ID: ${user.id})`);
        }
      } catch (error: any) {
        console.error(
          `❌ Exception while sending scheduled message to user ${user.telegramId}:`,
          error.message || error
        );
        failedCount++;
      }

      // Add delay between messages
      if (users.indexOf(user) < users.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, TELEGRAM_DELAY_MS));
      }
    }

    // Update counts for this batch
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessageId },
      data: {
        sentCount: { increment: sentCount },
        failedCount: { increment: failedCount }
      }
    });

    // If there are more users, trigger the next batch
    if (hasMore) {
      console.log(`Triggering next batch: ${batch + 1} for scheduled message ${scheduledMessageId}`);

      // Use setTimeout to ensure the current request completes first
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

          const response = await fetch(`${baseUrl}/api/cron/scheduled-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Next.js-Internal-Request'
            },
            body: JSON.stringify({
              scheduledMessageId,
              batch: batch + 1
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`Batch ${batch + 1} triggered successfully for scheduled message ${scheduledMessageId}:`, result);
        } catch (error) {
          console.error(
            `Failed to trigger next batch ${batch + 1} for scheduled message ${scheduledMessageId}:`,
            error
          );

          // Update status to FAILED if we can't continue
          await prisma.scheduledMessage
            .update({
              where: { id: scheduledMessageId || '' },
              data: { status: 'FAILED' }
            })
            .catch(console.error);
        }
      }, 500); // 500ms delay to ensure current request completes
    } else {
      // This is the last batch, update the scheduledMessage record
      console.log(
        `Final batch ${batch} completed for scheduled message ${scheduledMessageId}. Updating status to SENT.`
      );

      try {
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessageId },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });
        console.log(`ScheduledMessage ${scheduledMessageId} status updated to SENT`);
      } catch (error) {
        console.error(`Failed to update scheduledMessage ${scheduledMessageId} status:`, error);
      }
    }

    const response = {
      success: true,
      scheduledMessageId,
      batch,
      processed: users.length,
      sentCount,
      failedCount,
      hasMore,
      totalUsers,
      currentRange: `${skip + 1}-${skip + users.length}`,
      processedUsers: users.map((u) => ({ id: u.id, telegramId: u.telegramId }))
    };

    console.log(`Scheduled message ${scheduledMessageId} batch ${batch} completed:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error in scheduled message ${scheduledMessageId} batch ${batch}:`, error);

    // Update status to FAILED
    if (scheduledMessageId) {
      await prisma.scheduledMessage
        .update({
          where: { id: scheduledMessageId },
          data: { status: 'FAILED' }
        })
        .catch(console.error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process scheduled message batch',
        scheduledMessageId,
        batch,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
