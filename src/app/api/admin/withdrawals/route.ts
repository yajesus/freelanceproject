import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { WithdrawalStatus } from '@prisma/client';

// GET /api/admin/withdrawals - Get all withdrawal requests
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') as WithdrawalStatus | null;

    const where = status ? { status: status as WithdrawalStatus } : {};

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: {
          select: {
            telegramId: true,
            name: true,
            tonWalletAddress: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, withdrawals });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// POST /api/admin/withdrawals - Update withdrawal request status
export async function POST(req: NextRequest) {
  try {
    const { withdrawalId, status, transactionHash, notes } = await req.json();

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Update withdrawal request
    const updatedWithdrawal = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status,
        transactionHash,
        notes,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
        processedBy: 'ADMIN' // You might want to add actual admin identification here
      }
    });

    // If the request was rejected, return the TON to the user's balance
    if (status === 'REJECTED') {
      const withdrawal = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        select: { userId: true, amount: true }
      });

      if (withdrawal) {
        // Get current user to handle null tonBalance case
        const user = await prisma.user.findUnique({
          where: { id: withdrawal.userId },
          select: { tonBalance: true }
        });
        
        const currentBalance = user?.tonBalance ?? 0;
        
        await prisma.user.update({
          where: { id: withdrawal.userId },
          data: {
            tonBalance: currentBalance + withdrawal.amount
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 });
  }
} 