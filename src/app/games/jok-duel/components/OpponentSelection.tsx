import { FC, useMemo, useEffect, useRef, useState } from 'react';
import {
  jokDuelOpponentSelectionCard1,
  jokDuelOpponentSelectionCard2,
  jokDuelOpponentSelectionCard3,
  ellipse,
} from '@/src/app/games/jok-duel/images';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { character1, shopImageMap } from '@/images';
import { showBackButton, triggerHapticFeedback } from '@/utils/ui';
import MatchCard from '@/components/games/MatchCard';
import MatchHeader from '@/components/games/MatchHeader';
import { timeAgo } from '@/utils/timeAgo';

interface User {
  name: string;
}

export interface lobbyProps {
  id: string;
  userId1: string;
  userId2?: string;
  amount: string;
  createdAt: string;
  status: string;
  user1: User;
  user2?: User;
}

export interface OpponentSelectionProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  startMatch: (lobbyId: string) => void;
  onlinePlayers: number;
  lobbies: lobbyProps[];
  telegramId: string;
  acceptBet: (lobbyId: string) => Promise<void>;
}

const OpponentSelection: FC<OpponentSelectionProps> = ({
  currentView,
  setCurrentView,
  startMatch,
  onlinePlayers,
  lobbies,
  telegramId,
  acceptBet,
}) => {
  const { equippedAvatar, userTelegramName } = useGameStore();

  // Filter lobbies: show only bets from other users that are pending (can be accepted)
  const filteredLobbies = useMemo(() => {
    if (!lobbies || lobbies.length === 0) {
      return [];
    }

    return lobbies.filter((lobby) => {
      // Ensure both are strings for comparison
      const userId1Str = String(lobby.userId1 || '');
      const telegramIdStr = String(telegramId || '');

      // Show only bets from other users that are pending (can be accepted)
      const isNotOwnBet = userId1Str !== telegramIdStr;
      const isPending = lobby.status === 'pending';

      return isNotOwnBet && isPending;
    });
  }, [lobbies, telegramId]);

  const handleAcceptBet = async (lobbyId: string) => {
    try {
      await acceptBet(lobbyId);
    } catch (error) {
      console.error('Error accepting bet:', error);
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

  useEffect(() => {
    const setupBackButton = async () => {
      await showBackButton(() => {
        handleViewChange('onboarding');
      });
    };

    setupBackButton();
  }, []);

  return (
    <div className='bg-black flex justify-center min-h-screen'>
      <div className='w-full bg-black text-white font-bold flex flex-col max-w-xl'>
        <div className='flex-grow mt-4 pt-[3px] h-screen bg-gradient-to-r from-[#44F756] via-[#D3EB2F] to-[#D684F5] rounded-t-[48px] relative top-glow overflow-hidden z-0'>
          {/* content  */}
          <div className='bg-black rounded-t-[46px] pt-10 bg-center h-full w-full overflow-y-auto overflow-hidden no-scrollbar p-[20px]'>
            <div className='flex flex-col gap-8 relative'>
              <Image
                priority={false}
                src={ellipse}
                alt='Ellipse'
                className='z-0 opacity-40 absolute top-[30px] right-0 rotate-[166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl'
              />
              <Image
                priority={false}
                src={ellipse}
                alt='Ellipse'
                className='z-0 opacity-20 absolute -bottom-[300px] -left-[50px] rotate-[-166deg] bg-[linear-gradient(to_top_right,#4FF852,#CDFF0B,#DE82F8,#AE9FD6)] w-[232px] h-[400px] rounded-full blur-3xl'
              />
              {/* Header */}
              <MatchHeader
                currentView={currentView}
                setCurrentView={setCurrentView}
                onlinePlayers={onlinePlayers}
              />

              {/* Available bets to accept */}
              <div className='flex flex-col gap-6 z-0'>
                {filteredLobbies && filteredLobbies.length > 0 ? (
                  <>
                    {filteredLobbies.map((lobby, index) => (
                      <MatchCard
                        key={lobby.id || index}
                        user={lobby?.user1?.name || 'Unknown'}
                        isPremium={
                          parseInt(lobby.amount.toString()) >= 500
                            ? true
                            : false
                        }
                        amount={parseInt(lobby.amount.toString())}
                        minLeft={timeAgo(lobby.createdAt)}
                        startGame={() => handleAcceptBet(lobby.id)}
                        buttonText='Accept'
                      />
                    ))}
                  </>
                ) : (
                  <div className='flex flex-col gap-4'>
                    <p className='text-center text-white/50'>
                      {lobbies && lobbies.length === 0
                        ? 'No matches available'
                        : filteredLobbies.length === 0 &&
                          lobbies &&
                          lobbies.length > 0
                        ? 'No Matches to accept'
                        : 'Loading lobbies...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OpponentSelection;
