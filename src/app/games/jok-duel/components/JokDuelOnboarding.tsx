import {
  jokDuelOnboardingBg,
  jokDuelOnboardingBtnBg,
  jokDuelOnboardingCard,
  jokDuelOnboardingText,
  jokTrophy,
} from '@/src/app/games/jok-duel/images';
import { showBackButton } from '@/utils/ui';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FC, useEffect } from 'react';

export interface JokDuelOnboardingProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  gameUser: any;
}

const JokDuelOnboarding: FC<JokDuelOnboardingProps> = ({
  currentView,
  setCurrentView,
  gameUser,
}) => {
  let router = useRouter();
  let intro = localStorage.getItem('gameIntro');
  localStorage.removeItem('prizeTaken');

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        setCurrentView('myjok');
      });
    };

    setupBackButton();
  }, []);

  const handlePlay = () => {
    if (!intro) {
      setCurrentView('gameIntro');
    } else {
      // const { totalStars } = useGameStore()
      // if (totalStars <= 0) {
      //   setCurrentView("recover");
      // } else {
      //   setCurrentView("opponent-selection");
      // }
      // opponent-selection
      setCurrentView('game');
    }
  };

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0'>
          <div
            className='bg-cover bg-center h-full pt-10 rounded-t-[46px] w-full overflow-y-auto no-scrollbar p-[20px]'
            style={{
              backgroundImage: `url(${jokDuelOnboardingBg.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div
              className='absolute top-10 left-10 flex items-center justify-center w-[43px] h-[43px] p-[13.5px] border-2 border-[#FFFFFF4D] rounded-[12px]'
              onClick={() => setCurrentView('leaderBoard')}
            >
              <Image priority={false} src={jokTrophy} alt='' />
            </div>
            <Image
              priority={false}
              src={jokDuelOnboardingText}
              alt={''}
              className='mx-auto h-[30%] object-contain'
            />
            <Image
              priority={false}
              src={jokDuelOnboardingCard}
              alt={''}
              className='mt-[20px] mx-auto h-[30%] object-contain'
            />
            <button
              onClick={handlePlay}
              className='block mx-auto w-fit relative'
            >
              <Image
                priority={false}
                src={jokDuelOnboardingBtnBg}
                alt={''}
                className='mt-[-5px] h-[20%] mx-auto object-contain'
              />
              <p className='absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2  text-[80%]'>
                Play Now
              </p>
            </button>
            <button
              onClick={() => setCurrentView('game-profile')}
              className='block mx-auto mt-[10px] w-40 relative text-[80%]'
            >
              <Image
                priority={false}
                src={jokDuelOnboardingBtnBg}
                alt={''}
                className='mx-auto h-[20%] object-contain'
              />
              <p className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
                My profile
              </p>
            </button>
            <button
              onClick={() => setCurrentView('myjok')}
              className='block mx-auto mt-[10px] w-fit relative text-[80%]'
            >
              Back to My JOK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default JokDuelOnboarding;
