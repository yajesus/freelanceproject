import { clashIcon, diamond, naruto, RectangleBg, star2, Trophy, glowingSparkle } from "@/src/app/games/jok-duel/images";
import Image from "next/image";

interface HistoryResultCardProps {
    isPremium: boolean;
    amount: number;
    player1: string;
    player2: string;
    winner: string;
}

const HistoryResultCard: React.FC<HistoryResultCardProps> = ({ isPremium, amount, player1, player2, winner }) => {
    return <div className={`relative flex justify-between items-center w-full rounded-2xl px-3 py-6 ${isPremium ? 'bg-gradient-to-b from-fuchsia-500/25 to-fuchsia-800/25 border border-fuchsia-500' : 'bg-gradient-to-b from-green-950/60 to-green-600/60 border border-green-400'}`}>
        <div className="absolute left-1/2 -translate-x-1/2 top-0">
            <Image
                priority={false}
                src={RectangleBg}
                alt="Rectangle Icon"
                className=""
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-full flex gap-2 justify-center items-center">
                    <Image
                        priority={false}
                        src={isPremium ? diamond : clashIcon}
                        alt="Icon"
                        className="w-[18px] h-[18px]"
                    />
                    <p className="text-[16px] font-normal">{amount}</p>
                    <Image
                        priority={false}
                        src={star2}
                        alt="Star Icon"
                        className="w-[20px] h-[20px]"
                    />
                </div>
            </div>
        </div>
        <div className="relative w-full flex flex-col items-center gap-3">
            {winner == 'player1' && <div className="-z-9 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                <Image
                    priority={false}
                    src={glowingSparkle}
                    alt="Glowing Sparkle"
                    className=""
                />
            </div>}
            <Image
                priority={false}
                src={naruto}
                alt="Naruto"
                className="z-10"
            />
            <p className="text-[16px] font-normal uppercase flex items-center gap-1">
                {winner == 'player1' && <Image
                    priority={false}
                    src={Trophy}
                    alt="Trophy Icon"
                    className="w-[25px] h-[25px]"
                />}
                {player1}</p>
        </div>
        <div className="w-full flex justify-center items-center">
            <p className="flex items-center justify-center text-center font-normal text-[22px] text-white bg-[#1D1D1D] rounded-full h-[56px] w-[56px]">2-1</p>
        </div>
        <div className="relative w-full flex flex-col justify-center items-center gap-3">
            {winner == 'player2' && <div className="-z-9 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                <Image
                    priority={false}
                    src={glowingSparkle}
                    alt="Glowing Sparkle"
                    className=""
                />
            </div>}
            <Image
                priority={false}
                src={naruto}
                alt="Naruto"
                className="z-10"
            />
            <p className="text-[16px] font-normal uppercase flex items-center gap-1">
                {winner == 'player2' && <Image
                    priority={false}
                    src={Trophy}
                    alt="Trophy Icon"
                    className="w-[25px] h-[25px]"
                />}
                {player2}</p>
        </div>
    </div>
}

export default HistoryResultCard