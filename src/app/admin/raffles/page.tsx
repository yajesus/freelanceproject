'use client';

import { useState, useEffect } from 'react';

interface Raffle {
  id: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'FINISHED';
  prizes: Array<{
    id: string;
    type: string;
    amount: number;
    winnerCount: number;
    tier: string;
  }>;
  entries?: Array<{
    id: string;
    ticketCount: number;
    user: {
      name: string;
      telegramId: string;
    };
  }>;
  winners?: Array<{
    id: string;
    claimed: boolean;
    user: {
      name: string;
      telegramId: string;
      inventory?: {
        equippedAvatarName?: string;
      };
      tonWalletAddress?: string;
    };
    prize: {
      amount: number;
      type: string;
      tier: string;
    };
  }>;
}

interface RaffleSettings {
  bigRewardAmount: number;
  bigRewardPlayers: number;
  smallRewardAmount: number;
  smallRewardPlayers: number;
  name: string;
  updatedAt: string;
}

export default function RafflePayouts() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  // Raffle Settings State
  const [raffleSettings, setRaffleSettings] = useState<RaffleSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [bigRewardAmount, setBigRewardAmount] = useState(30);
  const [bigRewardPlayers, setBigRewardPlayers] = useState(3);
  const [smallRewardAmount, setSmallRewardAmount] = useState(1);
  const [smallRewardPlayers, setSmallRewardPlayers] = useState(100);
  const [updateMode, setUpdateMode] = useState<'immediate' | 'next_raffle'>('immediate');

  // Fetch all raffles
  const fetchRaffles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/raffles');
      if (!response.ok) throw new Error('Failed to fetch raffles');

      const data = await response.json();
      setRaffles(data.raffles || []);
    } catch (error) {
      console.error('Error fetching raffles:', error);
      alert('Failed to fetch raffles');
    } finally {
      setLoading(false);
    }
  };

  // Fetch raffle settings
  const fetchRaffleSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/admin/raffle-settings');
      if (!response.ok) throw new Error('Failed to fetch raffle settings');

      const data = await response.json();
      if (data.settings) {
        setRaffleSettings(data.settings);
        setSettingsName(data.settings.name || 'Default Raffle Settings');
        setBigRewardAmount(data.settings.bigRewardAmount || 30);
        setBigRewardPlayers(data.settings.bigRewardPlayers || 3);
        setSmallRewardAmount(data.settings.smallRewardAmount || 1);
        setSmallRewardPlayers(data.settings.smallRewardPlayers || 100);
      }
    } catch (error) {
      console.error('Error fetching raffle settings:', error);
      alert('Failed to fetch raffle settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Update raffle settings
  const updateRaffleSettings = async () => {
    try {
      setSettingsLoading(true);

      const settingsData = {
        name: settingsName,
        bigRewardAmount,
        bigRewardPlayers,
        smallRewardAmount,
        smallRewardPlayers,
        updateMode
      };

      const response = await fetch('/api/admin/raffle-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) throw new Error('Failed to update raffle settings');

      const data = await response.json();
      if (data.success) {
        setRaffleSettings(data.settings);
        if (updateMode === 'immediate') {
          alert('Raffle settings updated immediately! Active raffles will use these new settings.');
        } else {
          alert('Raffle settings saved for next raffle! Current active raffle will continue with existing settings.');
        }
        fetchRaffles(); // Refresh raffles to see any changes
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating raffle settings:', error);
      alert('Failed to update raffle settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchRaffles();
    fetchRaffleSettings();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-600 text-white';
      case 'FINISHED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  if (loading && settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-customGreen-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Raffle Management</h1>

        {/* Raffle Settings Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Raffle Settings</h2>

          {raffleSettings && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Current Settings</p>
              <p className="text-white">
                Big Reward: {raffleSettings.bigRewardAmount} TON for {raffleSettings.bigRewardPlayers} winners
              </p>
              <p className="text-white">
                Small Reward: {raffleSettings.smallRewardAmount} TON for {raffleSettings.smallRewardPlayers} winners
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(raffleSettings.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Update Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Update Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="updateMode"
                  value="immediate"
                  checked={updateMode === 'immediate'}
                  onChange={(e) => setUpdateMode(e.target.value as 'immediate' | 'next_raffle')}
                  className="mr-2"
                />
                <span className="text-white">Immediate (Update active raffles)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="updateMode"
                  value="next_raffle"
                  checked={updateMode === 'next_raffle'}
                  onChange={(e) => setUpdateMode(e.target.value as 'immediate' | 'next_raffle')}
                  className="mr-2"
                />
                <span className="text-white">Next Raffle Only</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {updateMode === 'immediate'
                ? 'Changes will apply to current active raffles immediately'
                : 'Changes will only apply to future raffles, current active raffle will continue with existing settings'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Settings Name
              </label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Big Reward Amount (TON)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={bigRewardAmount}
                onChange={(e) => setBigRewardAmount(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Number of Big Reward Winners
              </label>
              <input
                type="number"
                min="1"
                value={bigRewardPlayers}
                onChange={(e) => setBigRewardPlayers(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Small Reward Amount (TON)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={smallRewardAmount}
                onChange={(e) => setSmallRewardAmount(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Number of Small Reward Winners
              </label>
              <input
                type="number"
                min="1"
                value={smallRewardPlayers}
                onChange={(e) => setSmallRewardPlayers(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 text-white"
              />
            </div>
          </div>

          <button
            onClick={updateRaffleSettings}
            disabled={settingsLoading}
            className="bg-customGreen-700 hover:bg-customGreen-800 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
          >
            {settingsLoading ? 'Updating...' : `Update Settings (${updateMode === 'immediate' ? 'Immediate' : 'Next Raffle'})`}
          </button>
        </div>

        {/* Raffle Winners Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Raffle Winners</h2>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-customGreen-700"></div>
            </div>
          ) : raffles.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No raffles found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {raffles.map(raffle => (
                <div key={raffle.id} className="bg-gray-700 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Raffle #{raffle.id.slice(-6)}</h3>
                      <p className="text-gray-300">
                        {formatDate(raffle.startDate)} to {formatDate(raffle.endDate)}
                      </p>
                      <div className="flex gap-4 mt-2">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(raffle.status)}`}>
                          {raffle.status}
                        </span>
                        {raffle.winners && (
                          <span className="px-2 py-1 bg-blue-600 text-white rounded text-sm">
                            {raffle.winners.length} Winners
                          </span>
                        )}
                        {raffle.entries && (
                          <span className="px-2 py-1 bg-purple-600 text-white rounded text-sm">
                            {raffle.entries.length} Entries
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col gap-2">
                        {raffle.prizes?.map(prize => (
                          <span key={prize.id} className="text-sm bg-gray-600 px-2 py-1 rounded text-white">
                            {prize.winnerCount}x {prize.amount} {prize.type} ({prize.tier})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {raffle.winners && raffle.winners.length > 0 && (
                    <div className="border-t border-gray-600 pt-4">
                      <h4 className="text-lg font-medium text-white mb-3">Winners Details</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-gray-600">
                              <th className="py-2 text-gray-300">Name</th>
                              <th className="py-2 text-gray-300">Telegram ID</th>
                              <th className="py-2 text-gray-300">Wallet Address</th>
                              <th className="py-2 text-gray-300">Prize</th>
                              <th className="py-2 text-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {raffle.winners.map(winner => (
                              <tr key={winner.id} className="border-b border-gray-600">
                                <td className="py-3 text-white">{winner.user.name || 'Unknown'}</td>
                                <td className="py-3 text-gray-300 font-mono">{winner.user.telegramId}</td>
                                <td className="py-3 text-gray-300 font-mono">
                                  {winner.user.tonWalletAddress ? (
                                    <span className="text-green-400 break-all">
                                      {winner.user.tonWalletAddress}
                                    </span>
                                  ) : (
                                    <span className="text-red-400">No wallet</span>
                                  )}
                                </td>
                                <td className="py-3 text-yellow-400 font-medium">
                                  {winner.prize.amount} {winner.prize.type}
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-1 rounded text-xs ${winner.claimed ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
                                    }`}>
                                    {winner.claimed ? 'PAID' : 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {raffle.status === 'FINISHED' && (!raffle.winners || raffle.winners.length === 0) && (
                    <div className="border-t border-gray-600 pt-4">
                      <p className="text-gray-400 italic">No winners</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 