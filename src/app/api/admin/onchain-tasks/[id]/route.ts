// app/api/admin/onchain-tasks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const isLocalhost = req.headers.get('host')?.includes('localhost');
    const isAdminAccessEnabled = process.env.ACCESS_ADMIN === 'true';

    if (!isLocalhost || !isAdminAccessEnabled) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const taskData = await req.json();

        const task = await prisma.onchainTask.update({
            where: { id: params.id },
            data: { isActive: taskData.isActive, points: taskData.points },
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Update onchain task error:', error);
        return NextResponse.json({ error: 'Failed to update onchain task' }, { status: 500 });
    }
}