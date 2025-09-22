import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

async function newComboCreate() {
    try {
        const todayStart = dayjs().utc().startOf('day');
        const today = todayStart.toDate();
        const endCombo = todayStart.add(1, 'day').hour(10).minute(0).second(0).millisecond(0).toDate();

        const existing = await prisma.comboOfTheDay.findUnique({
            where: { comboDate: today },
        });

        if (existing) {
            return existing;
        }

        const upgrades = await prisma.upgrade.findMany({ select: { id: true } });
        if (upgrades.length < 3) {
            throw new Error('Not enough upgrades in database');
        }

        const shuffled = upgrades.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3).map((u) => u.id);

        // Create the combo
        const newCombo = await prisma.comboOfTheDay.create({
            data: {
                comboDate: today,
                upgradeIds: selected,
                createdAt: new Date(),
                endsAt: endCombo,
            },
        });

        console.log('New combo created:', newCombo);
        return newCombo;

    } catch (error) {
        console.error('Error Combo-of-the-day card picking:', error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    try {
        const requestBody = await req.json();
        const { initData: telegramInitData } = requestBody;
        if (!telegramInitData) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const { validatedData, user: telegramUser } = validateTelegramWebAppData(telegramInitData);
        if (!validatedData) {
            return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
        }

        const telegramId = telegramUser.id?.toString() || "undefined";
        if (!telegramId) {
            return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
        }

        // Get the current user
        const dbUser = await prisma.user.findUnique({
            where: { telegramId },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get today's combo
        const now = dayjs().utc();

        let combo: any = await prisma.comboOfTheDay.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!combo || (combo.endsAt && dayjs(combo.endsAt).isBefore(now))) {
            console.log('Creating new combo — previous expired or missing');
            combo = await newComboCreate();
        }
        const userProgress = await prisma.userComboProgress.findUnique({
            where: {
                userId_comboDate: {
                    userId: dbUser.id,
                    comboDate: combo.comboDate,
                },
            },
        });
        const discoveredIds = userProgress?.discoveredIds || [];

        // Get upgrade details for the combo
        const upgrades = await prisma.upgrade.findMany({
            where: { id: { in: combo.upgradeIds } },
            select: {
                id: true,
                name: true,
                description: true,
                image: true,
                category: true,
                subcategory: true,
                baseCost: true,
                basePoints: true,
            },
        });

        // Enhance upgrades with discovery status
        const upgradesWithStatus = upgrades.map(upgrade => ({
            ...upgrade,
            discovered: discoveredIds.includes(upgrade.id),
        }));

        return NextResponse.json({
            comboDate: combo.comboDate,
            endsAt: combo.endsAt,
            upgradeIds: combo.upgradeIds,
            upgrades: upgradesWithStatus,
            discoveredCount: discoveredIds.length,
            totalCount: combo.upgradeIds.length,
            rewardClaimed: userProgress?.rewardClaimed || false
        });
    } catch (error) {
        console.error('Error fetching combo of the day:', error);
        return NextResponse.json(
            { error: 'Failed to fetch combo of the day' },
            { status: 500 }
        );
    }
}
