import {
  jokDuelOnboardingBg,
  jokDuelOnboardingBtnBg,
  jokDuelOnboardingCard,
  jokDuelOnboardingText,
  jokTrophy,
} from '@/src/app/games/jok-duel/images';
import { FC, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { showBackButton } from '@/utils/ui';

export interface JokDuelOnboardingProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  // decreaseEnergy: (amount: number) => void;
  gameUser: any;
}

const JokDuelOnboarding: FC<JokDuelOnboardingProps> = ({
  currentView,
  setCurrentView,
  // decreaseEnergy,
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
      // if (gameUser.energy - 10 < 0) {
      //   setCurrentView("recover");
      // } else {
      //   decreaseEnergy(10);
      //   setCurrentView("opponent-selection");
      // }
      setCurrentView('opponent-selection');
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
            <div
              className='absolute right-10 flex top-8 z-[5000]'
              onClick={() => setCurrentView('recover')}
            >
              <div className='flex mt-[25%]'>
                <svg
                  width='21'
                  height='25'
                  viewBox='0 0 21 25'
                  fill='none'
                  className='absolute right-[83%] top-[40%]'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M20.5989 10.7568C18.4071 13.885 13.8476 20.4769 11.6867 23.5672C11.0698 24.4541 9.67782 23.9464 9.77807 22.8706L10.4593 15.5226C10.5171 14.907 10.0313 14.3749 9.41301 14.3749C-2.91306 14.3657 0.806273 16.1476 3.93609 1.1541C4.05588 0.690301 4.47492 0.365086 4.95435 0.365086H14.7276C15.4165 0.365086 15.9192 1.01804 15.743 1.68511L14.1287 7.7851C13.9526 8.45217 14.4551 9.10512 15.144 9.10512H19.7364C20.5848 9.10524 21.0835 10.0602 20.5989 10.7568Z'
                    fill='#4ECDEA'
                  />
                  <path
                    d='M15.4936 18.0987L11.6917 23.5637C11.0748 24.4506 9.68279 23.9429 9.78304 22.8672L10.4642 15.5192C10.5221 14.9035 10.0363 14.3714 9.41798 14.3714H1.90037C1.21401 14.3714 0.711497 13.7236 0.882364 13.0591L3.94131 1.15087C4.16426 -0.135731 6.74591 0.506248 7.5812 0.361737L5.83711 9.01047C5.62627 10.0541 6.42448 11.0297 7.49003 11.0297H12.3985C13.5334 11.0297 14.3445 12.1287 14.0089 13.2134L13.1735 15.9151C12.755 17.4257 14.1156 18.3092 15.4936 18.0987Z'
                    fill='#4F9CE8'
                  />
                </svg>
                {/* <div
                  style={{
                    background: 'linear-gradient(to right, #004989, #001323)',
                    width: '68px',
                    height: '20px',
                  }}
                  className='rounded-full flex items-center justify-center'
                >
                  <div
                    style={{ backgroundColor: 'rgba(255,255,255,0.21)' }}
                    className='w-[66px] h-[18px] absolute top-1/2 transform  rounded-full flex justify-end pr-1'
                  >
                    <p className='text-[14px] absolute top-1/2 transform -translate-y-2'>
                      {gameUser.energy}/{50}
                    </p>
                  </div>
                </div> */}
              </div>
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
