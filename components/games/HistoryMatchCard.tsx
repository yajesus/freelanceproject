import { clashIcon, diamond, Live, naruto, starGlow } from "@/src/app/games/jok-duel/images";
import Image from "next/image";

interface HistoryMatchCardProps {
    isPremium: boolean;
    amount: number;
    player1: string;
    player2: string;
    round: number;
}

const HistoryMatchCard: React.FC<HistoryMatchCardProps> = ({ isPremium, amount, player1, player2, round }) => {
    return <div className={`flex justify-between items-start w-full rounded-2xl px-3 py-1.5 ${isPremium ? 'bg-gradient-to-b from-fuchsia-500/25 to-fuchsia-800/25 border border-fuchsia-500' : 'bg-gradient-to-b from-green-950/60 to-green-600/60 border border-green-400'}`}>
        <div className="w-full flex flex-col gap-8 items-start justify-start">
            <div className="flex gap-2 items-center mt-2">
                <p className="uppercase text-[#DF3838] font-normal text-[16px]">Live</p>
                <Image
                    priority={false}
                    src={Live}
                    alt="Live icon"
                    className=""
                />
            </div>
            <div className="flex flex-col gap-[10px] justify-center items-center">
                <Image
                    priority={false}
                    src={naruto}
                    alt="Naruto"
                    className=""
                />
                <p className="uppercase font-normal text-[16px]">
                    {player1}
                </p>
            </div>
        </div>
        <div className="w-full flex flex-col items-center justify-center">
            <div
                className={`flex-wrap flex gap-1 py-2 px-2 outline outline-1 outline-offset-[-1px] rounded-[20px] ${isPremium ? "outline-fuchsia-500" : "outline-green-400"
                    } `}
            >
                <Image
                    priority={false}
                    src={isPremium ? diamond : clashIcon}
                    alt={"Icon"}
                    className=""
                />
                <p className="leading-[14px] font-normal text-[13px]">
                    {isPremium ? "Premium" : "Standard"}
                </p>
            </div>
            <div className="flex flex-col items-center justify-center -mt-2">
                <Image
                    priority={false}
                    src={starGlow}
                    alt="star"
                    className=""
                />
                <p
                    className="text-[32px] z-10 font-normal -mt-5"
                    style={{
                        color: "white",
                        WebkitTextStroke: "3px transparent",
                        background: "linear-gradient(to right, #C27CBC, #D3FF00, #3BE32D)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        letterSpacing: "6px",
                    }}
                >
                    {amount}
                </p>
            </div>
        </div>
        <div className="w-full flex flex-col gap-8 items-end justify-end mt-2">
            <p className="uppercase font-normal text-[16px]">ROund {round} 🔥</p>
            <div className="flex flex-col gap-[10px] justify-center items-center">
                <Image
                    priority={false}
                    src={naruto}
                    alt="Naruto"
                    className=""
                />
                <p className="uppercase font-normal text-[16px]">
                    {player2}
                </p>
            </div>
        </div>
    </div>
}

export default HistoryMatchCard
