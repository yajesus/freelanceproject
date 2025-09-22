// components/PassportGenerator.tsx

import React, { memo } from 'react';
import { formatNumber } from '@/utils/ui';
import { bgLevel, character1, friends, JOK_POINTS, quests, shopImageMap, wallpaper1 } from '@/images';
import { shortText } from '@/lib/utils';

export interface PassportData {
    telegramName: string;
    levelIndex: number;
    yieldPerHour: number;
    bonusYieldPerHour: number;
    equippedAvatar?: string;
    equippedWallpaper?: string;
    holderLevel: number;
    referralCount: number;
    completedTasksCount: number;
    fakeFriends?: number;
    onChainCount: number;
}

interface PassportGeneratorProps {
    data: PassportData;
}

export const LineIcon = ({ className }: { className?: string }) => (
    <img src='/line.png' alt='' width={170} height={10} className={className} style={{ display: 'block' }} />
);

export const CheckBoxIcon = () => (
    <svg
        width='26'
        height='26'
        viewBox='0 0 26 26'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        style={{ display: 'block' }}
    >
        <circle cx='13' cy='13' r='12.5' stroke='url(#paint0_linear_137_613)' />
        <circle cx='13.5' cy='12.5' r='7.5' fill='white' />
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M13 3C18.519 3 23 7.48098 23 13C23 18.519 18.519 23 13 23C7.48098 23 3 18.519 3 13C3 7.48098 7.48098 3 13 3ZM8.63658 12.838L10.9483 14.3795C11.1302 14.5005 11.3702 14.4858 11.5366 14.3439L17.8044 8.97122C17.9985 8.80438 18.2888 8.81659 18.4688 8.99854C18.6488 9.18 18.6576 9.47025 18.4893 9.66293L11.66 17.4678C11.5629 17.5781 11.4215 17.6395 11.2741 17.6337C11.1273 17.6283 10.9907 17.5566 10.9024 17.439L7.97562 13.5366C7.83317 13.3463 7.84829 13.0815 8.0117 12.9088C8.17464 12.7361 8.43853 12.7063 8.63658 12.838Z'
            fill='black'
        />
        <defs>
            <linearGradient
                id='paint0_linear_137_613'
                x1='14.7931'
                y1='28.0526'
                x2='27.134'
                y2='5.95255'
                gradientUnits='userSpaceOnUse'
            >
                <stop stopColor='#C27CBC' />
                <stop offset='0.619308' stopColor='#D3FF00' />
                <stop offset='1' stopColor='#3BE32D' />
            </linearGradient>
        </defs>
    </svg>
);

const PassportGeneratorComponent: React.FC<PassportGeneratorProps> = ({ data }) => {
    const calculateYieldPerHour = () => {
        const bonusYield = (data.bonusYieldPerHour / 100) * data.yieldPerHour;
        return data.yieldPerHour + bonusYield;
    };

    const backgroundImageSrc = data.equippedWallpaper ? shopImageMap[data.equippedWallpaper].src : wallpaper1.src;

    const avatarImageSrc = data.equippedAvatar ? shopImageMap[data.equippedAvatar] : character1;

    return (
        <div className='w-[340px] pt-5 bg-transparent'>
            <div className='pb-[19px] bg-[#0E0E0E] rounded-[24px]'>
                {/* Header section with background */}
                <div
                    className='h-[305px] relative w-full'
                    style={{
                        backgroundImage: `url(${backgroundImageSrc})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        borderRadius: '24px 24px 4125px 4125px'
                    }}
                >
                    {/* Level badge */}
                    <div className='absolute z-10 -top-4 left-1/2 -translate-x-1/2'>
                        <img
                            src={bgLevel.src}
                            alt=''
                            style={{
                                width: '130px',
                                height: 'auto',
                                display: 'block',
                                transform: 'rotate(-5.05deg)',
                                position: 'absolute'
                            }}
                        />

                        <p className=' text-base font-extrabold text-white whitespace-nowrap z-10 rotate-[-9deg] '>
                            {`${shortText({
                                text: data.telegramName,
                                separator: '..',
                                startLength: 8,
                                endLength: 0
                            })} Lvl ${data.levelIndex + 1}`}
                        </p>
                    </div>

                    {/* JOKER badge */}
                    <div
                        className='absolute w-[25px] text-[#248415] text-xl flex flex-col items-center font-bold'
                        style={{
                            left: '23px',
                            top: '23px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '18.98px',
                            padding: '7px',
                            paddingTop: '9px',
                            paddingBottom: '9px'
                        }}
                    >
                        <span>J</span>
                        <span>O</span>
                        <span>K</span>
                        <span>E</span>
                        <span>R</span>
                    </div>

                    {/* Character image */}
                    <div className='absolute bottom-0 w-4/5 left-1/2 -translate-x-1/2 scale-90'>
                        {avatarImageSrc && (<img
                            src={avatarImageSrc.src}
                            alt='Character'
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            }}
                        />)}
                    </div>
                </div>

                {/* Stats section */}
                <div className='mt-[15px] pl-[15px] pr-[11px]'>
                    <div>
                        <p className='font-semibold text-lg text-white text-center mb-1'>Stats</p>
                        <div className='flex justify-center mb-3'>
                            <LineIcon />
                        </div>

                        {/* Points per hour */}
                        <div className='flex items-center justify-center mb-3'>
                            <img src={JOK_POINTS.src} alt='JOK Points' width={28} height={28} style={{ display: 'block' }} />
                            <p className='text-white text-[12px] ml-[7px] whitespace-nowrap'>
                                {formatNumber(calculateYieldPerHour())} points per hour
                            </p>
                        </div>

                        {/* Friends and Quests */}
                        <div className='grid grid-cols-2 gap-[13px]'>
                            <div className='flex items-center'>
                                <img src={friends.src} alt='Friends' width={32} height={32} style={{ display: 'block' }} />
                                <p className='text-white text-[12px] ml-[7px] whitespace-nowrap'>
                                    {data.referralCount + (data.fakeFriends || 0)} invited Friends
                                </p>
                            </div>
                            <div className='flex items-center'>
                                <img
                                    src={quests.src}
                                    alt='Quests'
                                    width={20}
                                    height={20}
                                    style={{ display: 'block', marginLeft: '6px' }}
                                />
                                <p className='text-white text-[12px] ml-[7px] whitespace-nowrap'>
                                    {data.completedTasksCount} Quest Completed
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bonus section */}
                    <div className='mt-5'>
                        <p className='font-semibold text-lg text-white text-center mb-1'>Bonus</p>
                        <div className='flex justify-center mb-3'>
                            <LineIcon />
                        </div>
                        <div className='grid grid-cols-2 gap-[27px]'>
                            <div className='flex items-center gap-[14px]'>
                                <CheckBoxIcon />
                                <p className='text-white text-[12px] whitespace-nowrap'>JOK Holdeur ({data.holderLevel}/5)</p>
                            </div>
                            <div className='flex items-center gap-[14px]'>
                                <CheckBoxIcon />
                                <p className='text-white text-[12px] whitespace-nowrap'>JOK NFT ({data.onChainCount}/5)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PassportGenerator = memo(PassportGeneratorComponent);

export default PassportGenerator;
