import GradientCircularProgress from "@/components/games/GradientCircularProgress";
import { shopImageMap, character1 } from "@/images";
import { jokDuelOnboardingBtnBg, VersusBg, star2 } from "@/src/app/games/jok-duel/images";
import { useGameStore } from "@/utils/game-mechanics";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";


interface MatchVersusProps {
    currentView: string;
    setCurrentView: (view: string) => void;
}

const MatchVersus: React.FC<MatchVersusProps> = ({ currentView, setCurrentView }) => {
    const { equippedAvatar, userTelegramName } = useGameStore();
    const [countDown, setCountDown] = useState(3)

    useEffect(() => {
        if (countDown <= 0) return;

        const timer = setTimeout(() => {
            setCountDown(prev => prev - 1)
        }, 1000);

        return () => clearTimeout(timer)
    }, [countDown])

    const avatar = useMemo(
        () => shopImageMap[equippedAvatar] || character1,
        [equippedAvatar]
    );

    return <div className="bg-black flex justify-center min-h-screen">
        <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
            <div className="flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative z-0">
                <div
                    className="bg-cover bg-center h-full rounded-t-[46px] w-full overflow-y-auto no-scrollbar p-[20px]"
                    style={{ backgroundImage: `url(${VersusBg.src})` }}
                >
                    <div className="h-full mt-[-43px] flex flex-col justify-start items-center relative">
                        <div className="absolute top-[79px]">
                            <button
                                onClick={() => { }
                                }
                                className="w-[100px] h-[55px] rounded-[10px] text-white text-[15px] flex gap-1 justify-center items-center"
                                style={{
                                    background: `url(${jokDuelOnboardingBtnBg.src})`,
                                    backgroundPosition: "center",
                                    backgroundSize: "contain",
                                    backgroundRepeat: "no-repeat",
                                }}
                            >
                                3000
                                <Image
                                    priority={false}
                                    src={star2}
                                    alt="Star Icon"
                                    className="w-[20px] h-[20px]"
                                />
                            </button>
                        </div>

                        <div className="absolute bottom-[28px]">
                            <GradientCircularProgress radius={30} value={countDown} />
                        </div>

                        <div className="absolute left-[38px] top-[246px]">
                            <Image
                                priority={false}
                                src={avatar}
                                alt="Avatar"
                                className="w-[54px] h-[93px]"
                            />
                        </div>
                        <div className="absolute left-[38px] top-[372px]">
                            <p className="font-normal text-[16px]">Myjoke</p>
                        </div>
                        <div className="absolute right-[38px] top-[246px]">
                            <Image
                                priority={false}
                                src={avatar}
                                alt="Avatar"
                                className="w-[54px] h-[93px]"
                            />
                        </div>
                        <div className="absolute right-[38px] top-[372px]">
                            <p className="font-normal text-[16px]">Myjoke</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default MatchVersus