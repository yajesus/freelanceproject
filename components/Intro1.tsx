import { FC } from 'react';
import { Earth } from '@/icons/Earth';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import Angle from '@/icons/Angle';
import Image from 'next/image';
import { introBG, sitJoker1, cards, star } from '@/images';
import { useTranslations } from 'next-intl';
import { NEW_USER_BONUS_POINTS, NEW_USER_BONUS_STARS } from '@/utils/consts';

export interface Intro1Props {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Intro1: FC<Intro1Props> = ({ currentView, setCurrentView }) => {
  const t = useTranslations('Intro1');

  const onClick = () => {
    setCurrentView('myjok');
    localStorage.setItem('introEnded', 'true');
  };

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white h-screen font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 bg-gradient-airdrop-page-header rounded-t-[48px] relative top-glow z-0 h-screen'>
          <div className='relative mt-[2px] bg-[#080808] rounded-t-[46px] h-full overflow-hidden no-scrollbar flex flex-col pt-[6px] px-5 pb-28'>
            <div
              className='h-[450px] z-20 w-full  pt-[19px] pb-[21px] px-[38px] rounded-[32px]'
              style={{
                backgroundImage: `url(${introBG.src})`,
                backgroundSize: 'cover'
              }}
            >
              <div className='flex items-center justify-center gap-[7px] text-nowrap'>
                <Earth />
                <p className='text-sm font-normal'>{t('language')}</p>
              </div>
              <div className='w-full flex justify-center items-center mt-[9px]'>
                <LocaleSwitcher />
              </div>
              <p className='text-center text-[20px] font-semibold  mt-[20px] whitespace-nowrap'>{t('how')}</p>

              <div className='mt-[12px] flex font-bold justify-center items-center gap-1 text-[14px] text-center whitespace-nowrap'>
                <p>{t('do')}</p>
              </div>
              <div className='mx-auto mt-[20px] flex justify-center items-center gap-1 text-xs text-center whitespace-nowrap'>
                <p>{t('text1')}</p>
              </div>
              <div className='mx-auto mt-[20px] flex justify-center items-center gap-1 text-xs text-center whitespace-nowrap'>
                <p>{t('text2')}</p>
              </div>
              <div className='mx-auto mt-[20px] flex justify-center items-center gap-1 text-xs text-center whitespace-nowrap'>
                <p>{t('text3')}</p>
              </div>
              <div className='mx-auto mt-[20px] flex justify-center items-center gap-1 text-xs text-center whitespace-nowrap'>
                <p>{t('text4').split(':')[0]}</p>
                <img src={cards.src} className='w-[20px]' alt='cards' />
                {NEW_USER_BONUS_POINTS} + <img src={star.src} alt='star' width={20} height={20} />{' '}
                {NEW_USER_BONUS_STARS} {t('text4').split(':')[1]}
              </div>
              <div className='mx-auto mt-[20px] flex justify-center items-center gap-1 text-xs text-center whitespace-nowrap'>
                <p>{t('text5')}</p>
              </div>
              <div className='flex justify-center mt-[31px]'>
                <button className='w-fit' onClick={onClick}>
                  <div className='relative w-full flex justify-center items-center'>
                    <div className='w-[163px] relative pl-[32px] pr-[5px] py-[5px] rounded-[35px] cursor-pointer pointer bg-gradient-button text-white text-xs z-50'>
                      <div className='rounded-[35px] absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-[#151515] w-[calc(100%-3px)] h-[calc(100%-3px)]'></div>
                      <div className='relative z-20 flex justify-between items-center'>
                        <div className='flex items-center'>
                          <span className='font-medium'>{t('play')}</span>
                        </div>
                        <div className='w-[30px] h-[30px] bg-[#000000] rounded-full flex justify-center items-center '>
                          <Angle size={40} className='text-white' />
                        </div>
                      </div>
                    </div>
                    <div className='w-[80%] h-[13px] absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#E546D8] via-[#A6DA93] to-[#BEE110] blur-[12.8px]'></div>
                  </div>
                </button>
              </div>
            </div>
            <div className={'h-[calc(100%-450px)]'}>
              <Image
                priority={false}
                src={sitJoker1}
                alt={''}
                width={0}
                height={0}
                sizes={'100vh'}
                className='h-full w-full object-contain object-left-top'
              />
            </div>
            <div
              className='absolute right-0 bottom-0 w-[232px] h-[385px] rotate-[-149.95deg] opacity-[0.48] blur-[214px]'
              style={{
                background: 'linear-gradient(to bottom, #4FF852, #CDFF0B, #DE82F8, #AE9FD6)'
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Intro1;
