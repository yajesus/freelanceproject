'use client';

import { Game1Img, GamesBg } from '@/images';
import { useEffect, useState } from 'react';
import GameItem from './games/GameItem';
import { useTranslations } from 'next-intl';
interface GamesPageProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Games: React.FC<GamesPageProps> = ({ currentView, setCurrentView }) => {
  const t = useTranslations('Games');
  const [games, setGames] = useState([
    {
      id: 1,
      name: 'Jock Duel',
      smallDescription: 'Strategic card battles',
      image: Game1Img,
      rate: 4.3,
      link: '/games/jok-duel'
    },
    {
      id: 2,
      name: 'Jock Duel',
      smallDescription: 'Strategic card battles',
      image: Game1Img,
      rate: 4.3,
      link: '/games/jok-duel'
    },
    {
      id: 3,
      name: 'Jock Duel',
      smallDescription: 'Strategic card battles',
      image: Game1Img,
      rate: 4.3,
      link: '/games/jok-duel'
    },
    {
      id: 4,
      name: 'Jock Duel',
      smallDescription: 'Strategic card battles',
      image: Game1Img,
      rate: 4.3,
      link: '/games/jok-duel'
    }
  ]);
  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow z-0'>
          <div
            className='mt-[2px] bg-cover bg-center rounded-t-[46px] h-full w-full overflow-y-auto no-scrollbar p-[20px]'
            style={{ backgroundImage: `url(${GamesBg.src})` }}
          >
            <p className='text-center font-normal p-4'>{t('games')}</p>
            <div className='flex justify-around flex-wrap gap-[20px]'>
              {games.map((game) => {
                return <GameItem game={game} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games;
