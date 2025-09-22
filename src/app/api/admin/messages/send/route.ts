// api/admin/messages/send/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { sendMessageToUser, sendPhotoToUser } from '@/utils/telegram';

const TELEGRAM_DELAY_MS = 100; // 100ms delay between Telegram API calls
const BATCH_SIZE = 20;

export async function POST(request: Request) {
  let batch = 0; // Initialize batch outside try block

  try {
    const body = await request.json();
    const { title, message, imageUrl, buttonText = '', buttonUrl = '' } = body;
    batch = body.batch || 0;
    const skip = batch * BATCH_SIZE;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
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
    const usersToProcess = users;

    console.log(
      `Processing batch ${batch}, users: ${usersToProcess.length}, skip: ${skip}, total: ${totalUsers}, hasMore: ${hasMore}`
    );

    let sentCount = 0;
    let failedCount = 0;

    // Send messages to users in this batch
    for (const user of usersToProcess) {
      try {
        let success = false;

        if (imageUrl) {
          success = await sendPhotoToUser(user.telegramId, imageUrl, message, buttonText, buttonUrl);
        } else {
          success = await sendMessageToUser(parseInt(user.telegramId), message, buttonText, buttonUrl);
        }

        // Check if the function returned a success indicator or if it completed without throwing
        if (success !== false) {
          sentCount++;
          console.log(`✅ Message sent successfully to user: ${user.telegramId} (ID: ${user.id})`);
        } else {
          failedCount++;
          console.log(`❌ Message send returned false for user: ${user.telegramId} (ID: ${user.id})`);
        }
      } catch (error: any) {
        console.error(`❌ Exception while sending to user ${user.telegramId}:`, error.message || error);
        failedCount++;
      }

      // Add delay between messages
      if (usersToProcess.indexOf(user) < usersToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, TELEGRAM_DELAY_MS));
      }
    }

    // Only create a record for the first batch
    if (batch === 0) {
      await prisma.scheduledMessage.create({
        data: {
          title,
          message,
          imageUrl: imageUrl || null,
          buttonText: buttonText || null,
          buttonUrl: buttonUrl || null,
          status: hasMore ? 'PENDING' : 'SENT',
          sentCount,
          failedCount,
          sentAt: hasMore ? null : new Date(),
          isScheduled: false // Immediate message
        }
      });
    } else {
      // Update counts for subsequent batches
      await prisma.scheduledMessage.updateMany({
        where: {
          title,
          message,
          status: 'PENDING'
        },
        data: {
          sentCount: { increment: sentCount },
          failedCount: { increment: failedCount }
        }
      });
    }

    // If there are more users, trigger the next batch
    if (hasMore) {
      console.log(`Triggering next batch: ${batch + 1}`);

      // Use setTimeout to ensure the current request completes first
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

          const response = await fetch(`${baseUrl}/api/admin/messages/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Next.js-Internal-Request'
            },
            body: JSON.stringify({
              title,
              message,
              imageUrl,
              buttonText,
              buttonUrl,
              batch: batch + 1
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`Batch ${batch + 1} triggered successfully:`, result);
        } catch (error) {
          console.error(`Failed to trigger next message batch ${batch + 1}:`, error);
        }
      }, 500); // 500ms delay to ensure current request completes
    } else {
      // This is the last batch, update the scheduledMessage record
      console.log(`Final batch ${batch} completed. Updating status to SENT.`);

      try {
        await prisma.scheduledMessage.updateMany({
          where: {
            title,
            message,
            status: 'PENDING' // Only update records that are still pending
          },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });
        console.log('ScheduledMessage status updated to SENT');
      } catch (error) {
        console.error('Failed to update scheduledMessage status:', error);
      }
    }

    const response = {
      success: true,
      batch,
      processed: usersToProcess.length,
      sentCount,
      failedCount,
      hasMore,
      totalUsers,
      currentRange: `${skip + 1}-${skip + usersToProcess.length}`,
      processedUsers: usersToProcess.map((u) => ({ id: u.id, telegramId: u.telegramId }))
    };

    console.log(`Batch ${batch} completed:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error in batch ${batch}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to send messages',
        batch: batch,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
