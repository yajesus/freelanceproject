"use client";

import MatchHeader from "@/components/games/MatchHeader"
import Image from "next/image";
import {
    ellipse,
    Trophy,
} from "@/src/app/games/jok-duel/images";
import HistoryMatchCard from "@/components/games/HistoryMatchCard";
import { useEffect, useState, useRef } from "react";

export interface GameHistoryProps {
    id: string;
    amount: number;
    player1: string;
    score1: number;
    player2?: string;
    score2: number;
    round: number;
    status: string;
    player1Name?: string;
    player2Name?: string;
    isBotGame?: boolean;
}

interface HistoryOngoingProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    onlinePlayers: number;
    gameHistory: GameHistoryProps[]
}

const HistoryOngoing: React.FC<HistoryOngoingProps> = ({ currentView, setCurrentView, onlinePlayers, gameHistory }) => {
    const [playingGames, setPlayingGames] = useState<GameHistoryProps[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch initial ongoing games
    useEffect(() => {
        const fetchOngoingGames = async () => {
            try {
                const res = await fetch('/api/games?type=ongoing');
                const data = await res.json();
                if (data.success) {
                    setPlayingGames(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching ongoing games:', error);
                // Fallback to gameHistory prop if API fails
                const filtered = gameHistory?.filter(game => game.status === "playing") || [];
                setPlayingGames(filtered);
            }
        };

        fetchOngoingGames();
    }, []);

    // WebSocket connection for live updates
    useEffect(() => {
        const connectWebSocket = () => {
            // Ensure WebSocket server is started
            fetch('/api/ws').catch((err) => {
                console.error('Failed to start WS server:', err);
            });

            // Determine WebSocket URL
            let wsUrl: string;
            if (process.env.NEXT_PUBLIC_WS_URL) {
                const wsUrlEnv = process.env.NEXT_PUBLIC_WS_URL;
                if (wsUrlEnv.startsWith('http://')) {
                    wsUrl = wsUrlEnv.replace('http://', 'ws://');
                } else if (wsUrlEnv.startsWith('https://')) {
                    wsUrl = wsUrlEnv.replace('https://', 'wss://');
                } else if (wsUrlEnv.startsWith('ws://') || wsUrlEnv.startsWith('wss://')) {
                    wsUrl = wsUrlEnv;
                } else {
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${wsProtocol}//${wsUrlEnv}`;
                }
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                wsUrl = 'ws://localhost:8080';
            } else {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${wsProtocol}//${window.location.hostname}:8080`;
            }

            try {
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    wsRef.current = ws;
                    console.log('✅ Connected to WebSocket for ongoing games');
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'ongoingGameUpdate') {
                            const { action, game } = data;

                            setPlayingGames((prevGames) => {
                                if (action === 'created' || action === 'update') {
                                    // Add or update game
                                    const existingIndex = prevGames.findIndex(g => g.id === game.id);
                                    if (existingIndex >= 0) {
                                        // Update existing game
                                        const updated = [...prevGames];
                                        updated[existingIndex] = game;
                                        return updated;
                                    } else {
                                        // Add new game
                                        return [game, ...prevGames];
                                    }
                                } else if (action === 'finished') {
                                    // Remove finished game
                                    return prevGames.filter(g => g.id !== game.id);
                                }
                                return prevGames;
                            });
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };

                ws.onclose = () => {
                    wsRef.current = null;
                    // Reconnect after 3 seconds
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, 3000);
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, 5000);
            }
        };

        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

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
                                <HistoryMatchCard 
                                    key={game.id}
                                    isPremium={game.amount >= 500} 
                                    amount={game.amount} 
                                    player1={game.player1Name || game.player1} 
                                    player2={game.player2Name || game.player2 || "Unknown"} 
                                    round={game.round} 
                                />
                            )) : <p className="text-center">No game ongoing</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default HistoryOngoing