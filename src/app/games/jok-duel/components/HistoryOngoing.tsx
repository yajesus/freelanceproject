import MatchHeader from "@/components/games/MatchHeader"
import Image from "next/image";
import {
    ellipse,
    Trophy,
} from "@/src/app/games/jok-duel/images";
import HistoryMatchCard from "@/components/games/HistoryMatchCard";

export interface GameHistoryProps {
    id: string;
    amount: number;
    player1: string;
    score1: number;
    player2?: string;
    score2: number;
    round: number;
    status: string;
}

interface HistoryOngoingProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    onlinePlayers: number;
    gameHistory: GameHistoryProps[]
}

const HistoryOngoing: React.FC<HistoryOngoingProps> = ({ currentView, setCurrentView, onlinePlayers, gameHistory }) => {
    const playingGames = gameHistory?.filter(game => game.status === "playing")

    return <div className="bg-black flex justify-center min-h-screen">
        <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
            <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
                <div className="bg-black rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto overflow-hidden no-scrollbar p-[20px]">
                    <div className="flex flex-col gap-9 relative">
                        <Image
                            priority={false}
                            src={ellipse}
                            alt="Ellipse"
                            className="z-0 opacity-40 absolute top-[30px] right-0 rotate-[166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl"
                        />
                        <Image
                            priority={false}
                            src={ellipse}
                            alt="Ellipse"
                            className="z-0 opacity-20 absolute -bottom-[300px] -left-[50px] rotate-[-166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl"
                        />
                        {/* Header */}
                        <MatchHeader
                            currentView={currentView}
                            setCurrentView={setCurrentView}
                            onlinePlayers={onlinePlayers}
                        />

                        <div className="flex gap-1">
                            <Image
                                priority={false}
                                src={Trophy}
                                alt="Trophy"
                                className=""
                            />
                            <p className="font-normal">Ongoing bets</p>
                        </div>

                        {/* Games */}
                        <div className="flex flex-col gap-6 z-0">
                            {playingGames && playingGames.length > 0 ? playingGames.map((game) => (
                                <HistoryMatchCard isPremium={game.amount > 500 ? true : false} amount={game.amount} player1={game.player1} player2={game.player2 || "Unknown"} round={game.round} />
                            )) : <p className="text-center">No game ongoing</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default HistoryOngoing