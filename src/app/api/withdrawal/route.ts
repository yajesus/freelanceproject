import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(req: NextRequest) {
  try {
    const { initData: telegramInitData, amount } = await req.json();

    if (!telegramInitData || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData || !user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    // Find the user
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        tonBalance: true,
        tonWalletAddress: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.tonWalletAddress) {
      return NextResponse.json({ error: 'No TON wallet address registered' }, { status: 400 });
    }

    // Check if amount is valid (handle null tonBalance case)
    const currentTonBalance = dbUser.tonBalance ?? 0;
    if (amount <= 0 || amount > currentTonBalance) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Create withdrawal request and update user balance
    const result = await prisma.$transaction(async (prisma) => {
      // Create withdrawal request
      const request = await prisma.withdrawalRequest.create({
        data: {
          userId: dbUser.id,
          amount: amount,
          walletAddress: dbUser.tonWalletAddress!,
          status: 'PENDING'
        }
      });

      // Deduct amount from user's balance
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          tonBalance: currentTonBalance - amount
        }
      });

      return request;
    });

    return NextResponse.json({
      success: true,
      request: result
    });
  } catch (error) {
    console.error('Error processing withdrawal request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process withdrawal request' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's withdrawal history
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const initData = searchParams.get('initData');

    if (!initData) {
      return NextResponse.json({ error: 'Telegram initData is required' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(initData);

    if (!validatedData || !user) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    // Find the user and their withdrawal requests
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        tonBalance: true,
        withdrawalRequests: {
          orderBy: {
            requestedAt: 'desc'
          },
          select: {
            id: true,
            amount: true,
            walletAddress: true,
            status: true,
            requestedAt: true,
            processedAt: true,
            transactionHash: true,
            notes: true
          }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      balance: dbUser.tonBalance,
      withdrawals: dbUser.withdrawalRequests
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch withdrawal history' },
      { status: 500 }
    );
  }
}

// PATCH endpoint for admin to update withdrawal status
export async function PATCH(req: NextRequest) {
  try {
    const { withdrawalId, status, transactionHash, notes } = await req.json();

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Find the withdrawal request
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            tonBalance: true
          }
        }
      }
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 });
    }

    // Update withdrawal status and handle balance reversion if rejected
    const result = await prisma.$transaction(async (prisma) => {
      const updateData: any = {
        status,
        processedAt: new Date()
      };

      if (transactionHash) {
        updateData.transactionHash = transactionHash;
      }

      if (notes) {
        updateData.notes = notes;
      }

      // Update withdrawal request
      const updatedWithdrawal = await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: updateData
      });

      // If status is REJECTED, revert the balance
      if (status === 'REJECTED') {
        await prisma.user.update({
          where: { id: withdrawal.userId },
          data: {
            tonBalance: {
              increment: withdrawal.amount
            }
          }
        });
      }

      return updatedWithdrawal;
    });

    return NextResponse.json({
      success: true,
      withdrawal: result
    });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update withdrawal status' },
      { status: 500 }
    );
  }
}
