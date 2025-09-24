import {
  countdown1,
  countdown2,
  countdown3,
  gameBg1,
  gameBg2,
  gameBg3,
  gameBg4,
  gameBg5,
  gameBg6,
  gameBg7,
  gameTimer,
  go,
  goldenCup,
  heart,
  heartBg,
  openedBlue,
  openedOrange,
  openedRed,
} from "@/src/app/games/jok-duel/images";
import { useGameStore } from "@/utils/game-mechanics";
import { showBackButton, triggerHapticFeedback } from "@/utils/ui";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAnimation } from "../animations/index";
import { FlippingCard } from "./FlippingCard";
import { GameHeader } from "./GameHeader";
import { OpponentCard } from "./OpponentCard";

interface GameProps {
  setCurrentView: (view: string) => void;
  gameUser: any;
  updateDuelGame: any;
  gameId: any;
  updateDuelGameUser: any;
  opponentUsername: string;
}

const Game: React.FC<GameProps> = ({
  setCurrentView,
  gameUser,
  updateDuelGame,
  gameId,
  updateDuelGameUser,
  opponentUsername,
}) => {
  const [showCountdown, setShowCountdown] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<any>(null);
  const [countdownStep, setCountdownStep] = useState<number | "go" | null>(
    null
  );
  const chestAnimationRef = useRef<LottieRefCurrentProps | null>(null);
  const [count, setCount] = useState(30);
  const [rotation, setRotation] = useState(0);
  const { userTelegramName } = useGameStore();
  const cards = useMemo(
    () => [
      { src: openedBlue, color: "blue" },
      { src: openedOrange, color: "orange" },
      { src: openedRed, color: "red" },
    ],
    []
  );
  const allBgs = [gameBg1, gameBg2, gameBg3, gameBg4, gameBg5, gameBg6, gameBg7]
  const [round, setRound] = useState(1);
  const [myTurn, setMyTurn] = useState(false);
  const [roundKey, setRoundKey] = useState(0);

  const [flippedCards, setFlippedCards] = useState(() =>
    cards.map((card, index) => ({
      id: index + 1,
      isDropped: false,
      canDrop: false,
      isFlipped: true,
      backSrc: card.src,
      color: card.color,
      autoDrop: false,
    }))
  );
  const [opponentCard, setOpponentCard] = useState(
    useMemo(
      () => ({
        isDropped: false,
        isFlipped: false,
        backSrc: cards[Math.floor(Math.random() * 3)],
        canDrop: false,
      }),
      [cards]
    )
  );
  const [myCard, setMyCard] = useState<string | undefined>(undefined);
  const [score, setScore] = useState({ me: 2, pc: 2 });
  const [showing, setShowing] = useState(false);
  const [stopCount, setStopCount] = useState(false);
  const [result, setResult] = useState("");
  const [hasCardBeenDropped, setHasCardBeenDropped] = useState(false);
  const [activeAnim, setActiveAnim] = useState<string>("idle");
  const [canRenderCards, setCanRenderCards] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [output, setOutput] = useState("");
  const [cardDropCountdown, setCardDropCountdown] = useState<number | null>(
    null
  );
  const [roundOutcomes, setRoundOutcomes] = useState<
    ("win" | "lose" | "draw")[]
  >([]);
  const alreadySet = useRef(false);
  const defaultIndex = Math.floor(Math.random() * allBgs.length);
  const refN = useRef(defaultIndex);
  const [bg, setBg] = useState(allBgs[refN.current]);
  useEffect(() => {
    if (!alreadySet.current) {
      localStorage.setItem("bg", refN.current.toString());
      alreadySet.current = true;
    }
  }, []);
  useEffect(() => {
    if (count > 0 && !stopCount) {
      const interval = setInterval(() => {
        setCount((prev) => prev - 1);
        setRotation((prev) => prev + 12);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [count, stopCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomLeft = 40 + Math.random() * 20;
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    loadAnimation("idle").then((anim) => {
      setActiveAnimation(anim);
      setActiveAnim("idle");
    });
  }, []);
  useEffect(() => {
    const rand = Math.random();
    const gameOutcome = rand < 0.65 ? "win" : rand < 0.9 ? "lose" : "draw";
    setOutput(gameOutcome);
    let outcomes: ("win" | "lose" | "draw")[] = [];
    const randN = Math.random();
    if (gameOutcome === "win") {
      outcomes =
        randN < 0.2
          ? ["win", "lose", "win"]
          : randN < 0.4
            ? ["lose", "win", "win"]
            : randN < 0.6
              ? ["draw", "win", "draw"]
              : randN < 0.8
                ? ["draw", "draw", "win"]
                : ["win", "draw", "draw"];
    } else if (gameOutcome === "lose") {
      outcomes =
        randN < 0.2
          ? ["lose", "draw", "draw"]
          : randN < 0.4
            ? ["draw", "lose", "lose"]
            : randN < 0.6
              ? ["win", "lose", "lose"]
              : randN < 0.8
                ? ["lose", "draw", "lose"]
                : ["lose", "win", "lose"];
    } else {
      outcomes =
        randN < 0.2
          ? ["draw", "draw", "draw"]
          : randN < 0.4
            ? ["win", "lose", "draw"]
            : randN < 0.6
              ? ["lose", "win", "draw"]
              : randN < 0.8
                ? ["win", "draw", "lose"]
                : ["lose", "draw", "win"];
    }
    setRoundOutcomes(outcomes);
  }, []);

  useEffect(() => {
    if (flippedCards.some((elm) => elm.isDropped)) {
      setMyTurn(false);
    }
  }, [flippedCards]);

  useEffect(() => {
    setShowCountdown(true);
    setCountdownStep(3);
  }, []);

  useEffect(() => {
    if (myTurn) {
      setFlippedCards((prevCards) =>
        prevCards.map((card) => ({
          ...card,
          canDrop: true,
        }))
      );

      setCardDropCountdown(5);

      const countdownInterval = setInterval(() => {
        setCardDropCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        setCardDropCountdown(null);

        setFlippedCards((prevCards) => {
          const alreadyDropped = prevCards.some((card) => card.isDropped);
          if (alreadyDropped) return prevCards;

          const randomIndex = Math.floor(Math.random() * prevCards.length);
          const newCards = prevCards.map((card, index) => {
            if (index === randomIndex) {
              return {
                ...card,
                canDrop: true,
                autoDrop: true,
              };
            }
            return {
              ...card,
              canDrop: false,
            };
          });
          return newCards;
        });
      }, 5000);
    }

    if (!myTurn && flippedCards.some((elm) => elm.isDropped)) {
      setTimeout(() => {
        const droppedCard = flippedCards.find((elm) => elm.isDropped);
        if (!droppedCard) return;

        const droppedColor = droppedCard.color as "red" | "orange" | "blue";

        const cardBeats: Record<
          "red" | "orange" | "blue",
          "red" | "orange" | "blue"
        > = {
          red: "orange",
          orange: "blue",
          blue: "red",
        };
        const cardLosesTo: Record<
          "red" | "orange" | "blue",
          "red" | "orange" | "blue"
        > = {
          red: "blue",
          orange: "red",
          blue: "orange",
        };

        const currentRoundOutcome = roundOutcomes[round - 1];

        let opponentCardColor: "red" | "orange" | "blue";

        if (currentRoundOutcome === "win") {
          opponentCardColor = cardBeats[droppedColor];
        } else if (currentRoundOutcome === "lose") {
          opponentCardColor = cardLosesTo[droppedColor];
        } else {
          opponentCardColor = droppedColor;
        }

        setOpponentCard((prev) => ({
          ...prev,
          isDropped: true,
          canDrop: true,
          backSrc: cards.find((card) => card.color === opponentCardColor)!,
        }));

        setFlippedCards((prevCards) =>
          prevCards.map((card) => ({ ...card, canDrop: false }))
        );
      }, 1000);

      setTimeout(() => {
        setMyCard(flippedCards.find((elm) => elm.isDropped)?.color);
        showCards();
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [myTurn]);

  useEffect(() => {
    if (hasCardBeenDropped) {
      setCardDropCountdown(null);
    }
  }, [hasCardBeenDropped]);

  useEffect(() => {
    if (myCard) {
      winnerChecker();
      setStopCount(true);
    }
  }, [myCard]);
  const handleRoundResult = async (
    roundNumber: number,
    myScore: number,
    hisScore: number
  ) => {
    const payload = {
      [`round${roundNumber}`]: {
        me: myScore,
        pc: hisScore,
      },
    };

    await updateDuelGame(payload);
  };

  const playAnimation = async (myCardColor: string, opCardColor: string) => {
    let key = `${myCardColor}-${opCardColor}`;
    const animation = await loadAnimation(key);
    if (animation) {
      setActiveAnimation(animation);
      setActiveAnim(key);
    }
  };

  const winnerChecker = useCallback(() => {
    if (myCard == opponentCard.backSrc.color) {
      setResult("0-0");
      handleRoundResult(round, 0, 0);
    } else if (myCard == "red" && opponentCard.backSrc.color == "orange") {
      setResult("1-0");
      handleRoundResult(round, 1, 0);
      setScore((prev) => ({ ...prev, pc: prev.pc - 1 }));
    } else if (myCard == "blue" && opponentCard.backSrc.color == "red") {
      setResult("1-0");
      handleRoundResult(round, 1, 0);
      setScore((prev) => ({ ...prev, pc: prev.pc - 1 }));
    } else if (myCard == "orange" && opponentCard.backSrc.color == "blue") {
      setResult("1-0");
      handleRoundResult(round, 1, 0);
      setScore((prev) => ({ ...prev, pc: prev.pc - 1 }));
    } else {
      setResult("0-1");
      handleRoundResult(round, 0, 1);
      setScore((prev) => ({ ...prev, me: prev.me - 1 }));
    }
    playAnimation(myCard as string, opponentCard.backSrc.color);
  }, [myCard, opponentCard]);

  useEffect(() => {
    if (result !== "" && !showCountdown) {
      let timing = myCard == opponentCard.backSrc.color ? 2000 : 4000;
      setTimeout(() => {
        // if (round !== 1)
        startNewRound();

      }, timing);
    }
  }, [result]);

  const startNewRound = async () => {
    if ((score.me == 2 && score.pc == 0) || (score.me == 0 && score.pc == 2)) {
      await updateDuelGame({
        status: output
      }).then(() => {
        console.log("Game status changed")
        setCurrentView("gameEndLoading");

      })
      // setCurrentView("gameEndLoading");
      return;
    }

    if (round !== 3) {
      setHasCardBeenDropped(false);
      setResult("");
      setRound((prev) => prev + 1);
      setShowing(false);
      setStopCount(false);
      setMyCard(undefined);

      setCanRenderCards(false);
      setFlippedCards([]);
      setRoundKey((prev) => prev + 1);

      setTimeout(() => {
        const temp = cards.map((card, index) => ({
          id: index + 1,
          isDropped: false,
          canDrop: false,
          isFlipped: true,
          backSrc: card.src,
          color: card.color,
          autoDrop: false,
        }));

        setFlippedCards(temp);
        setOpponentCard({
          isDropped: false,
          isFlipped: false,
          backSrc: cards[Math.floor(Math.random() * 3)],
          canDrop: false,
        });
        setMyTurn(true);
        setCanRenderCards(true);
      }, 100);
    } else {
      localStorage.setItem("result", JSON.stringify(score));
      await updateDuelGame({
        status: output
      }).then(() => {
        console.log("Game status changed")
        setCurrentView("gameEndLoading");
      })
    }
  };

  const showCards = () => {
    setShowing(true);
    setFlippedCards((prevCards) =>
      prevCards.map((card) =>
        card.isDropped ? { ...card, isFlipped: true } : card
      )
    );
    setOpponentCard((prev) => ({ ...prev, isFlipped: true }));
  };

  useEffect(() => {
    if (!showCountdown) return;

    if (countdownStep === 3) {
      setTimeout(() => setCountdownStep(2), 1000);
    } else if (countdownStep === 2) {
      setTimeout(() => setCountdownStep(1), 1000);
    } else if (countdownStep === 1) {
      setTimeout(() => setCountdownStep("go"), 1000);
    } else if (countdownStep === "go") {
      setTimeout(() => {
        setShowCountdown(false);
        setCountdownStep(null);
        setMyTurn(true);
      }, 1000);
    }
  }, [countdownStep, showCountdown]);

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === "function") {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error("Error occurred while changing view:", error);
      }
    } else {
      console.error("setCurrentView is not a function:", setCurrentView);
    }
  };

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange("onboarding");
      });
    };

    setupBackButton();
  }, []);
  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 h-screen bg-gradient-to-r pt-[3px] from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0">
          <div className="w-full h-[100svh] rounded-t-[46px] flex">
            <Image
              priority
              src={bg}
              alt="not found"
              className="absolute top-[3px] left-0 w-full h-full z-0 rounded-t-[46px]"
              style={{
                filter: showing ? "brightness(50%)" : "brightness(100%)",
                objectFit: "cover",
              }}
            />
            {showCountdown && (
              <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2  z-[9999]">
                <Image
                  priority={false}
                  src={
                    countdownStep === 3
                      ? countdown1
                      : countdownStep === 2
                        ? countdown2
                        : countdownStep === 1
                          ? countdown3
                          : go
                  }
                  alt="Countdown"
                  className={`w-[${countdownStep === 3 ||
                    countdownStep === 2 ||
                    countdownStep === 1
                    ? "50px"
                    : "200px"
                    }] h-[${countdownStep === 3 ||
                      countdownStep === 2 ||
                      countdownStep === 1
                      ? "60px"
                      : "120px"
                    }] object-contain`}
                />
              </div>
            )}

            <Image
              priority={false}
              src={goldenCup}
              alt="not found"
              className="absolute w-[59px] h-[40px] object-contain left-1/2 transform top-[12%] -translate-x-1/2"
            />
            <GameHeader
              popupActive={true}
              setCurrentView={setCurrentView}
              updateDuelGameUser={updateDuelGameUser}
              gameUser={gameUser}
            />

            {["left-[30px]", "right-[30px]"].map((position, index) => (
              <>
                <div
                  key={index}
                  className={`absolute ${position} h-[64.32px] w-[56.4px] top-[100px] flex items-center justify-center`}
                  style={{ backgroundImage: `url(${heartBg.src})` }}
                >
                  <p className="absolute -top-6 font-extralight text-[14px]">
                    {index == 0 ? userTelegramName : opponentUsername}
                  </p>
                  <div
                    className="h-[28.92px] w-[33px] flex items-end justify-end"
                    style={{ backgroundImage: `url(${heart.src})` }}
                  ></div>
                  <p className="text-[14px] font-extralight absolute top-[30px] right-[7px]">
                    x{index === 0 ? score.me : score.pc}
                  </p>
                </div>
              </>
            ))}
            {result !== "" && (
              <div className="absolute left-1/2 transform -translate-x-1/2 top-[200px]">
                <span
                  className="text-[47px] font-bold text-transparent whitespace-nowrap"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {
                    // @ts-ignore
                    result[0] == result[2]
                      ? "Draw"
                      : result[0] === "1"
                        ? "You Win"
                        : "You Lose"
                  }
                </span>
                <h1
                  className="text-[54px] text-center font-bold text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #44F756, #D3EB2F, #D684F5, #ADA3D9)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {2 - score.pc + "-" + (2 - score.me)}
                </h1>
              </div>
            )}

            {activeAnimation && (
              <Lottie
                lottieRef={chestAnimationRef}
                animationData={activeAnimation}
                autoplay
                loop={activeAnim === "idle"}
                onComplete={() => {
                  loadAnimation("idle").then((anim) => {
                    setActiveAnimation(anim);
                    setActiveAnim("idle");
                  });
                }}
                style={{
                  width: 450,
                  cursor: "pointer",
                  transform: "translateX(-50%) translateY(-50%)",
                }}
                className="lottie-chest absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
              />
            )}


            <div className="absolute left-1/2 transform w-[54px] h-[54px] -translate-x-1/2 top-[140px] flex items-center justify-center">
              <Image
                priority={false}
                src={gameTimer.src}
                alt="not found"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 1s linear",
                }}
                width={54}
                height={54}
                className="absolute z-0"
              />
              <p className="text-[24px] absolute font-extralight z-10 top-3">
                {count}
              </p>
            </div>
            {myTurn && cardDropCountdown !== null && (
              <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2">
                <p className="text-[18px] font-bold text-[#FD1010] animate-pulse">
                  0{cardDropCountdown}:00
                </p>
              </div>
            )}

            {myTurn && (
              <div className="bottom-[30%] absolute flex items-center gap-[10px] left-1/2 -translate-x-1/2">
                <h3 className="text-[40px]">🖐</h3>
                <p className="text-[16px]">Your turn</p>
              </div>
            )}
            {canRenderCards && (
              <div
                className="absolute w-full h-full flex gap-[10px] items-center justify-center"
                key={roundKey}
              >
                {flippedCards.map((card, index) => (
                  <div
                    key={index}
                    className="relative w-[75px] h-full bottom-0 flex items-center justify-center transform scale-[1.2] z-40"
                  >
                    <FlippingCard
                      key={card.id}
                      canDrop={card.canDrop}
                      isFlipped={card.isFlipped}
                      backSrc={card.backSrc}
                      autoDrop={card.autoDrop}
                      setFlippedCards={setFlippedCards}
                      round={round}
                      isDrop={card.isDropped}
                      color={card.color}
                      result={result}
                      hasCardBeenDropped={hasCardBeenDropped}
                      setHasCardBeenDropped={setHasCardBeenDropped}
                      position={
                        index + 1 === 1
                          ? "first"
                          : index + 1 === 2
                            ? "second"
                            : "third"
                      }
                      id={card.id}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="absolute w-full h-full flex gap-[10px] items-center justify-center transform scale-[1.2] z-0">
              {opponentCard.canDrop ? (
                <div className="relative flex items-center gap-[10px] top-1/2 transform -translate-y-1/2 w-full h-full ">
                  <OpponentCard
                    isDropped={opponentCard.isDropped}
                    isFlipped={opponentCard.isFlipped}
                    backSrc={opponentCard.backSrc.src}
                    color={opponentCard.backSrc.color}
                    result={result}
                  />
                </div>
              ) : (
                <div className="relative flex items-center gap-[10px] top-1/2 transform -translate-y-1/2 opacity-0 w-full h-full">
                  <OpponentCard
                    isDropped={opponentCard.isDropped}
                    isFlipped={opponentCard.isFlipped}
                    backSrc={opponentCard.backSrc.src}
                    color={opponentCard.backSrc.color}
                    result={result}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Game;
