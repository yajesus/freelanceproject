import { useEffect, useState } from 'react';
import {
  defeatBg,
  defeatDiamond,
  defeatTextBg,
  jokDuelOnboardingBtnBg,
  winDiamond,
  winningBg,
  winningCountBg,
  drawBg1,
  drawBg2,
  drawBg3,
  drawBg4,
} from '../images';
import Image from 'next/image';
import { OpponentComment } from './OpponentComment';
import { GameHeader } from './GameHeader';
import { AnimatedGif } from './AnimatedGif';
import winGif from '../animations/joker/victory.json';
import loseGif from '../animations/joker/die.json';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import { cards } from '@/images';
interface FinishProps {
  setCurrentView: (view: string) => void;
  gameUser: any;
  gameId: any;
  updateDuelGame: any;
  startGame: () => void;
  updateDuelGameUser: any;
  // decreaseEnergy: (amount: number) => void;
  setChestOpeningView: (view: string) => void;
}

const Finish = ({
  setCurrentView,
  gameUser,
  gameId,
  startGame,
  updateDuelGameUser,
  // decreaseEnergy,
  setChestOpeningView,
}: FinishProps) => {
  const [gameResult, setGameResult] = useState<any>(
    JSON.parse(localStorage.getItem('gameResult') || '{}')
  );
  const [win, setWin] = useState<string | null>(
    localStorage.getItem('userWin') || null
  );
  const [prizeTaken, setPrizeTaken] = useState<boolean>(
    JSON.parse(localStorage.getItem('prizeTaken') || 'false')
  );
  const [popup, setPopup] = useState(false);
  const earned = Number(localStorage.getItem('earned')) || 0;
  const [bg, setBg] = useState<any>(
    [drawBg1, drawBg2, drawBg3, drawBg4][Math.floor(Math.random() * 4)]
  );
  // Fetch game data when component mounts
  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('myProfile');
      });
    };
    if (win !== 'draw') {
      setTimeout(() => {
        setPopup(true);
      }, 1900);
    }
    setupBackButton();
  }, [gameId]); // Runs when `gameId` changes

  if (!gameResult || win === null) {
    return (
      <div className='text-white text-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2'>
        Loading...
      </div>
    );
  }

  const handlePlayAgain = () => {
    if (win == 'draw') {
      startGame();
      setCurrentView('game');
    } else {
      // if (gameUser.energy < 10) setCurrentView("recover");
      // else {
      //   decreaseEnergy(10);
      //   startGame();
      //   setCurrentView("opponent-selection");
      // }
      startGame();
      setCurrentView('opponent-selection');
    }
  };

  const handleViewChange = (view: string) => {
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  const formatNumber = (amount: number): string => {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (amount >= 1_000) {
      return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      return amount.toString();
    }
  };

  const handleChestOpening = () => {
    setChestOpeningView('win');
    setCurrentView('chest-opening');
  };
  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] pt-[3px] rounded-t-[48px] relative top-glow z-0 font-extralight'>
          <div className='w-full h-screen rounded-t-[48px] relative z-10'>
            <GameHeader
              setCurrentView={setCurrentView}
              popupActive={false}
              gameUser={gameUser}
              updateDuelGameUser={updateDuelGameUser}
              bgShow={false}
            />
            {win === 'draw' ? (
              <>
                <div
                  className='w-full h-full rounded-t-[48px]'
                  style={{
                    backgroundImage: `url(${bg.src})`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* @ts-ignore */}
                  {(win === 'win' || win === 'lose') && (
                    <Image
                      priority={false}
                      src={win === 'win' ? winDiamond : defeatDiamond}
                      alt='not found'
                      className={`absolute transform -translate-x-1/2 left-1/2 translate-y-[120%] z-0 ${
                        win == 'win' ? '' : 'opacity-[0.5]'
                      }`}
                    />
                  )}

                  <h1 className='absolute transform -translate-x-1/2 left-1/2 translate-y-[270%] text-[35px] font-extralight whitespace-nowrap'>
                    {/* @ts-ignore */}
                    {win == 'win'
                      ? 'You Win'
                      : win === 'draw'
                      ? 'Draw! Play again!'
                      : 'Defeat'}
                  </h1>

                  <div
                    className='w-[202px] h-[79px] rounded-[67px] absolute -translate-x-1/2 left-1/2 translate-y-[240%] z-0'
                    style={{
                      backgroundImage: `url(${winningCountBg.src})`,
                    }}
                  >
                    <h1 className='text-[60px] font-extralight absolute -translate-x-1/2 left-1/2 z-0'>
                      {gameResult.me !== gameResult.pc
                        ? gameResult.me + '/' + gameResult.pc
                        : gameResult.me + '-' + gameResult.pc}
                    </h1>
                  </div>
                  {
                    // @ts-ignore
                    win === 'win' && popup == false && (
                      <AnimatedGif
                        // @ts-ignore
                        src={winGif}
                        isPlaying={true}
                        repeat='once'
                        width={500}
                        height={500}
                        className='absolute bottom-[15%] left-1/2 -translate-x-1/2'
                      />
                    )
                  }

                  {
                    // @ts-ignore
                    win === 'lose' && popup == false && (
                      <AnimatedGif
                        // @ts-ignore
                        src={loseGif}
                        isPlaying={true}
                        repeat='once'
                        width={500}
                        height={500}
                        className='absolute bottom-[15%] left-1/2 -translate-x-1/2'
                      />
                    )
                  }

                  {win === 'draw' && (
                    <OpponentComment
                      comment='Ooooh, a close one! Let’s try again!'
                      load={false}
                      containerClassname='absolute right-1 -translate-x-1/2 top-[60%] transform text-center'
                    />
                  )}

                  <div
                    className='absolute bottom-[20%] transform left-1/2 -translate-x-1/2'
                    onClick={() => handlePlayAgain()}
                  >
                    <Image
                      priority={false}
                      src={jokDuelOnboardingBtnBg}
                      alt='not found'
                    />
                    <h1 className='absolute top-[24%] text-[20px] transform left-1/2 -translate-x-1/2 whitespace-nowrap font-extralight'>
                      {/* @ts-ignore */}
                      {prizeTaken && win == 'win'
                        ? 'Claim Prize'
                        : win == 'draw'
                        ? 'Rematch'
                        : 'Play Again'}
                    </h1>
                  </div>
                </div>
              </>
            ) : (
              <div
                className='w-full h-full rounded-t-[48px]'
                style={{
                  backgroundImage:
                    win === 'win'
                      ? `url(${winningBg.src})`
                      : `url(${defeatBg.src})`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              >
                <Image
                  priority={false}
                  src={win === 'win' ? winDiamond : defeatDiamond}
                  alt='not found'
                  className={`absolute transform -translate-x-1/2 left-1/2 translate-y-[120%] z-0 ${
                    win === 'win' ? '' : 'opacity-[0.5]'
                  }`}
                />
                <h1 className='absolute transform -translate-x-1/2 left-1/2 translate-y-[270%] text-[35px] font-extralight whitespace-nowrap'>
                  {win === 'win'
                    ? 'You Win'
                    : win === 'draw'
                    ? 'Draw! Play again!'
                    : 'Defeat'}
                </h1>

                <div
                  className='w-[202px] h-[79px] rounded-[67px] absolute -translate-x-1/2 left-1/2 translate-y-[240%] z-0'
                  style={{
                    backgroundImage: `url(${winningCountBg.src})`,
                  }}
                >
                  <h1 className='text-[60px] font-extralight absolute -translate-x-1/2 left-1/2 z-0'>
                    {gameResult.me !== gameResult.pc
                      ? gameResult.me + '/' + gameResult.pc
                      : gameResult.pc + '-' + gameResult.pc}
                  </h1>
                </div>
                {
                  // @ts-ignore
                  win === 'win' && popup == false && (
                    <AnimatedGif
                      // @ts-ignore
                      src={winGif}
                      isPlaying={true}
                      repeat='once'
                      width={500}
                      height={500}
                      className='absolute bottom-[15%] left-1/2 -translate-x-1/2'
                    />
                  )
                }

                {
                  // @ts-ignore
                  win === 'lose' && popup == false && (
                    <AnimatedGif
                      // @ts-ignore
                      src={loseGif}
                      isPlaying={true}
                      repeat='once'
                      width={500}
                      height={500}
                      className='absolute bottom-[15%] left-1/2 -translate-x-1/2'
                    />
                  )
                }

                {win === 'draw' && (
                  <OpponentComment
                    comment='Ooooh, a close one! Let’s try again!'
                    load={false}
                    containerClassname='absolute right-1 -translate-x-1/2 top-[60%] transform text-center'
                  />
                )}
                {win == 'draw' && (
                  <div
                    className='absolute bottom-[20%] transform left-1/2 -translate-x-1/2'
                    onClick={() => handlePlayAgain()}
                  >
                    <Image
                      priority={false}
                      src={jokDuelOnboardingBtnBg}
                      alt='not found'
                    />
                    <h1 className='absolute top-[24%] text-[20px] transform left-1/2 -translate-x-1/2 whitespace-nowrap font-extralight'>
                      {win == 'draw' ? 'Rematch' : 'Play Again'}
                    </h1>
                  </div>
                )}
              </div>
            )}
            {popup && (
              <div className='absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center w-full z-[9999]'>
                <div
                  className='w-[322px] h-[405px] rounded-lg p-5 flex flex-col items-center text-white relative z-[10000]'
                  style={{
                    backgroundImage: `url(${defeatTextBg.src})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h1 className='text-[20px] text-center mt-4 whitespace-nowrap'>
                    {win === 'win' ? 'You Won the Game' : 'You Lost the Game'}
                  </h1>

                  {(win === 'win' || win === 'lose') && (
                    <Image
                      priority={false}
                      src={win === 'win' ? winDiamond : defeatDiamond}
                      alt='not found'
                      className={`${win === 'win' ? '' : 'opacity-[1]'} mt-2`}
                      width={63}
                    />
                  )}

                  <h2 className='text-[16px] text-center mt-2 whitespace-nowrap'>
                    {win === 'lose'
                      ? 'Down you go, Jok 💀 👿'
                      : 'Well played, champ! 🏆😎'}
                  </h2>
                  <h2 className='text-[20px] text-center mt-2 whitespace-nowrap'>
                    {win === 'lose'
                      ? 'Consolation time!'
                      : 'Claim your victory!'}
                  </h2>
                  <h2 className='text-[16px] text-center mt-2 whitespace-nowrap'>
                    {win === 'lose'
                      ? `🎁 You have earned ${formatNumber(earned)}!`
                      : '🎁 Your mystery reward is ready!'}
                  </h2>
                  {win === 'lose' && (
                    <Image
                      priority={false}
                      src={cards}
                      alt='not found'
                      className='mt-2'
                      width={63}
                    />
                  )}
                  {win === 'win' ? (
                    <button
                      className='w-[100%] h-[20%] mt-[45%]'
                      onClick={handleChestOpening}
                      style={{
                        backgroundImage: `url(${jokDuelOnboardingBtnBg.src})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    >
                      Open Chest
                    </button>
                  ) : (
                    <>
                      <button
                        className='w-[100%] h-[20%]'
                        onClick={() => handlePlayAgain()}
                        style={{
                          backgroundImage: `url(${jokDuelOnboardingBtnBg.src})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                        }}
                      >
                        Claim & Play again
                      </button>
                      <button
                        className='w-[100%] h-[20%] mt-[5%]'
                        onClick={() => setCurrentView('onboarding')}
                        style={{
                          backgroundImage: `url(${jokDuelOnboardingBtnBg.src})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                        }}
                      >
                        Claim & Quit
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Finish;
