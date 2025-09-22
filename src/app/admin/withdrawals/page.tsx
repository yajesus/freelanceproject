'use client';

import { useToast } from '@/contexts/ToastContext';
import { useState, useEffect } from 'react';
import { Address } from '@ton/core';

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  walletAddress: string;
  requestedAt: string;
  processedAt?: string;
  transactionHash?: string;
  notes?: string;
  user: {
    telegramId: string;
    name: string;
    tonWalletAddress: string;
  };
}

export default function WithdrawalsPage() {
  const showToast = useToast();

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const parseAddress = (address: string) => {
    try {
      return Address.parse(address).toString({
        bounceable: false,
        urlSafe: true,
        testOnly: false
      });
    } catch (e) {
      return address;
    }
  };

  const formatAddress = (address: string) => {
    try {
      const tempAddress = parseAddress(address);
      return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
    } catch (e) {
      showToast('Unknown Address Type', 'error');
      return '';
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (withdrawal: WithdrawalRequest) => {
    try {
      const address = parseAddress(withdrawal.walletAddress);
      await navigator.clipboard.writeText(address);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = withdrawal.walletAddress;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Fetch withdrawals
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/withdrawals?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch withdrawals');

      const data = await response.json();
      setWithdrawals(data.withdrawals || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      alert('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  // Update withdrawal status
  const updateWithdrawalStatus = async (
    withdrawalId: string,
    status: string,
    transactionHash?: string,
    notes?: string
  ) => {
    try {
      const response = await fetch('/api/withdrawal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          status,
          transactionHash,
          notes
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update withdrawal status');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update withdrawal status');
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-600 text-white';
      case 'PENDING':
        return 'bg-yellow-600 text-white';
      case 'REJECTED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-3xl font-bold text-white mb-8'>Withdrawal Requests</h1>

        {/* Status Filter */}
        <div className='mb-6'>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='bg-gray-800 text-white p-2 rounded-lg'
          >
            <option value=''>All</option>
            <option value='PENDING'>Pending</option>
            <option value='PROCESSING'>Processing</option>
            <option value='COMPLETED'>Completed</option>
            <option value='REJECTED'>Rejected</option>
            <option value='FAILED'>Failed</option>
          </select>
        </div>

        {/* Withdrawals Table */}
        <div className='bg-gray-800 rounded-lg overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-full'>
              <thead>
                <tr className='bg-gray-700'>
                  <th className='p-4 text-left text-white whitespace-nowrap'>User</th>
                  <th className='p-4 text-left text-white whitespace-nowrap'>Amount (TON)</th>
                  <th className='p-4 text-left text-white whitespace-nowrap'>Wallet</th>
                  <th className='p-4 text-left text-white whitespace-nowrap'>Requested</th>
                  <th className='p-4 text-left text-white whitespace-nowrap'>Status</th>
                  <th className='p-4 text-left text-white whitespace-nowrap'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className='p-8 text-center'>
                      <div className='flex items-center justify-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-customGreen-700 mr-3'></div>
                        <span className='text-white'>Loading withdrawals...</span>
                      </div>
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-8 text-center text-gray-400'>
                      No withdrawals found
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className='border-t border-gray-700 hover:bg-gray-750'>
                      <td className='p-4 text-white'>
                        <div className='flex flex-col'>
                          <span className='font-medium'>{withdrawal.user.name}</span>
                          <span className='text-sm text-gray-400'>ID: {withdrawal.user.telegramId}</span>
                        </div>
                      </td>
                      <td className='p-4 text-white font-medium'>{withdrawal.amount}</td>
                      <td className='p-4 text-white'>
                        <div
                          className='max-w-xs truncate cursor-pointer hover:bg-gray-600 px-2 py-1 rounded transition-colors relative group'
                          title={`Click to copy: ${withdrawal.walletAddress}`}
                          onClick={() => copyToClipboard(withdrawal)}
                        >
                          {formatAddress(withdrawal.walletAddress)}
                          <div className='absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded transition-opacity pointer-events-none'></div>
                        </div>
                      </td>
                      <td className='p-4 text-white'>
                        <div className='flex flex-col'>
                          <span className='text-sm'>{formatDate(withdrawal.requestedAt)}</span>
                        </div>
                      </td>
                      <td className='p-4'>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className='p-4'>
                        <div className='flex flex-col gap-2'>
                          {withdrawal.status === 'PENDING' && (
                            <div className='flex gap-2'>
                              <button
                                onClick={() => {
                                  const hash = prompt('Enter transaction hash:');
                                  if (hash) {
                                    updateWithdrawalStatus(withdrawal.id, 'COMPLETED', hash);
                                  }
                                }}
                                className='bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs'
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => {
                                  const notes = prompt('Enter rejection reason:');
                                  if (notes) {
                                    updateWithdrawalStatus(withdrawal.id, 'REJECTED', undefined, notes);
                                  }
                                }}
                                className='bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs'
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {withdrawal.transactionHash && (
                            <a
                              href={`https://tonscan.org/tx/${withdrawal.transactionHash}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-blue-400 hover:text-blue-300 text-xs'
                            >
                              View Transaction
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
