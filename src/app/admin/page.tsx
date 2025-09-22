// app/admin/page.tsx



'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from "next-auth/react"

const AdminPanel = () => {
    const router = useRouter();
    const t = useTranslations('AdminPanel');

    const handleSignOut = async () => {
        signOut()
    };


    const adminSections = [
        { title: 'Manage Tasks', path: '/admin/tasks', description: 'Add, edit, and manage game tasks' },
        { title: 'Manage Onchain Tasks', path: '/admin/onchain-tasks', description: 'Add, edit, and manage onchain tasks' },
        { title: 'Export User Data', path: '/admin/export', description: 'Export user information' },
        { title: 'Manage Partners', path: '/admin/partners', description: 'Add, edit, and manage partners' },
        { title: 'Manage Specials Upgrades', path: '/admin/specials', description: 'Add, edit, and manage specials upgrades with countdown timers' },
        { title: 'Raffle Management', path: '/admin/raffles', description: 'Add, edit, and manage raffles' },
        { title: 'TON Withdrawal Requests', path: '/admin/withdrawals', description: 'Process TON withdrawal requests from users' },
        { title: 'Message Management', path: '/admin/messages', description: 'Send messages to all users instantly or schedule for later' },
    ];

    return (
        <div className="min-h-screen bg-[#1d2025] text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-4xl font-bold text-customGreen-700">{t('title')}</h1>
                    <button
                        onClick={handleSignOut}
                        className="bg-customGreen-700 text-white px-4 py-2 rounded-lg hover:bg-customGreen-800 transition-colors">
                        Signout
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {adminSections.map((section) => (
                        <div
                            key={section.path}
                            className="bg-[#272a2f] rounded-lg p-6 hover:bg-[#3a3d42] transition-colors cursor-pointer"
                            onClick={() => router.push(section.path)}
                        >
                            <h2 className="text-2xl font-semibold mb-2">{section.title}</h2>
                            <p className="text-gray-400 mb-4">{section.description}</p>
                            <Link
                                href={section.path}
                                className="inline-block bg-customGreen-700 text-white px-4 py-2 rounded-lg hover:bg-customGreen-800 transition-colors"
                            >
                                {t('goTo')} {section.title}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;