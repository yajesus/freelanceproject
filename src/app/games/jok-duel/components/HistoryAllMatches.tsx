import Image from "next/image";
import {
    ellipse,
    Trophy,
} from "@/src/app/games/jok-duel/images";
import MatchHeader from "@/components/games/MatchHeader";
import HistoryResultCard from "@/components/games/HistoryResultCard";
import { GameHistoryProps } from "./HistoryOngoing";

interface HistoryAllMatchesProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    onlinePlayers: number;
    allGameHistory: GameHistoryProps[]
}

const HistoryAllMatches: React.FC<HistoryAllMatchesProps> = ({ currentView, setCurrentView, onlinePlayers, allGameHistory }) => {
    function winner(score1: number, score2: number, player1: string, player2: string) {
        let winner;
        if (score1 > score2) {
            winner = player1
        } else if (score1 < score2) {
            winner = player2
        } else {
            winner = "Draw"
        }

        return winner;
    }

    return <div className="bg-black flex justify-center min-h-screen">
        <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
            <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
                <div className="bg-black rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto no-scrollbar p-[20px]">
                    <div className="flex flex-col gap-8 relative">
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
                            <p className="font-normal">All Matches</p>
                        </div>

                        {/* Games */}
                        <div className="flex flex-col gap-6 z-0">
                            {allGameHistory ? allGameHistory.map((game) => (
                                <HistoryResultCard
                                    isPremium={game.amount > 500} amount={game.amount} player1={game.player1} player2={game.player2 || "Unknown"} score1={game.score1} score2={game.score2} winner={winner(game.score1, game.score2, game.player1, game.player2 || 'Unknown')} />
                            )) : <p className="text-center">No game</p>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default HistoryAllMatches