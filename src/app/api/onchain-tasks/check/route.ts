// app/api/onchain-tasks/check/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { Address, TonClient } from '@ton/ton';

interface NFTCheckResult {
  success: boolean;
  error?: string;
  status?: number;
}

async function checkNFTOwnership(contractAddress: string, userAddress: string): Promise<NFTCheckResult> {
  try {
    const endpoint = 'https://toncenter.com/api/v2/getTransactions';
    const apiKey = process.env.NEXT_PUBLIC_TONCENTER_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'API configuration error. Please try again later.',
        status: 503 // Service Unavailable
      };
    }

    const contractAddr = Address.parse(contractAddress);
    const userAddr = Address.parse(userAddress);

    console.log('Checking NFT ownership:');
    console.log('Contract address:', contractAddr.toString());
    console.log('User address:', userAddr.toString());

    try {
      const response = await fetch(
        `${endpoint}?` +
          new URLSearchParams({
            address: userAddr.toString(),
            limit: '50',
            to_lt: '0',
            archival: 'true',
            api_key: apiKey
          }),
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'X-API-Key': apiKey
          }
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: 'TON API service is currently unavailable. Please try again later.',
          status: 503
        };
      }

      const data = await response.json();
      const transactions = data.result || [];

      console.log('Found transactions:', transactions.length);

      // Check transactions
      for (const tx of transactions) {
        // Check in_msg
        if (tx.in_msg) {
          if (tx.in_msg.source === contractAddr.toString()) {
            console.log('Found incoming message from contract');
            return { success: true, status: 200 };
          }

          // Check for NFT transfer messages
          if (tx.in_msg.msg_data && typeof tx.in_msg.msg_data === 'object') {
            const msgText = tx.in_msg.msg_data.text || '';
            if (msgText.includes('Mint') || msgText.includes('NFT')) {
              console.log('Found NFT-related message:', msgText);
              return { success: true, status: 200 };
            }
          }
        }

        // Check out_msgs
        if (tx.out_msgs && Array.isArray(tx.out_msgs)) {
          for (const msg of tx.out_msgs) {
            if (msg.destination === contractAddr.toString()) {
              // Check for NFT transfer or mint messages
              if (msg.msg_data && typeof msg.msg_data === 'object') {
                const msgText = msg.msg_data.text || '';
                if (msgText.includes('Mint') || msgText.includes('NFT')) {
                  console.log('Found NFT-related outgoing message:', msgText);
                  return { success: true, status: 200 };
                }
              }

              // Check for value transfers to contract
              if (msg.value && parseInt(msg.value) > 0) {
                console.log('Found value transfer to contract');
                return { success: true, status: 200 };
              }
            }
          }
        }
      }

      return {
        success: false,
        error: 'You have not minted an NFT from this collection yet',
        status: 400 // Bad Request - user hasn't met the requirements
      };
    } catch (error) {
      console.log('Error fetching transactions:', error);
      return {
        success: false,
        error: 'Unable to verify NFT ownership. Please try again later.',
        status: 503
      };
    }
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    return {
      success: false,
      error: 'Unable to verify NFT ownership. Please try again later.',
      status: 503
    };
  }
}

interface CheckOnchainTaskRequestBody {
  initData: string;
  taskId: string;
}

export async function POST(req: Request) {
  const requestBody: CheckOnchainTaskRequestBody = await req.json();
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
        return { error: 'User not found', status: 404 };
      }

      if (!dbUser.tonWalletAddress) {
        return { error: 'User has no connected wallet', status: 400 };
      }

      // Find the task
      const task = await prisma.onchainTask.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        return { error: 'Task not found', status: 404 };
      }

      // Check if the task is active
      if (!task.isActive) {
        return { error: 'This task is no longer active', status: 400 };
      }

      // Get all completions to calculate current NFT count
      const userCompletions = await prisma.onchainTaskCompletion.findMany({
        where: {
          userId: dbUser.id
        },
        include: {
          onchainTask: true
        }
      });

      // Calculate current total NFTs
      let currentNftCount = 0;
      for (const completion of userCompletions) {
        const metadata = completion.onchainTask.itemMetadata as { name: string };
        let nftCount = 1; // default for regular certificate
        if (metadata.name.includes('X3')) nftCount = 3;
        if (metadata.name.includes('X5')) nftCount = 5;
        currentNftCount += nftCount;
      }

      // Calculate how many NFTs this task would add
      const taskMetadata = task.itemMetadata as { name: string };
      let newNftCount = 1; // default for regular certificate
      if (taskMetadata.name.includes('X3')) newNftCount = 3;
      if (taskMetadata.name.includes('X5')) newNftCount = 5;

      // Check if adding this task would exceed the limit
      if (currentNftCount + newNftCount > 5) {
        return {
          error: `This task would exceed the maximum NFT limit. Current: ${currentNftCount}, Task adds: ${newNftCount}, Max: 5`,
          status: 400
        };
      }

      // Check NFT ownership with improved error handling
      const nftCheckResult = await checkNFTOwnership(task.smartContractAddress, dbUser.tonWalletAddress);

      if (!nftCheckResult.success) {
        return {
          error: nftCheckResult.error,
          status: nftCheckResult.status
        };
      }

      // Create the OnchainTaskCompletion
      await prisma.onchainTaskCompletion.create({
        data: {
          userId: dbUser.id,
          onchainTaskId: task.id,
          userWalletAddress: dbUser.tonWalletAddress
        }
      });

      // Add points to user's balance
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          points: { increment: task.points },
          pointsBalance: { increment: task.points }
        }
      });

      return {
        success: true,
        message: 'Task completed successfully',
        status: 200
      };
    });

    return NextResponse.json(
      { message: result.message || result.error, success: result.success },
      { status: result.status }
    );
  } catch (error) {
    console.error('Error checking onchain task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check onchain task' },
      { status: 500 }
    );
  }
}
