// app/admin/messages/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Clock, Send, Calendar as Schedule, Image, Link, Users, CheckCircle, XCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import moment from 'moment';

interface ScheduledMessage {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  scheduledAt?: string;
  sentAt?: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

const MessageManagement = () => {
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState('instant');
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Edit states
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);

  useEffect(() => {
    fetchScheduledMessages();
  }, []);

  const fetchScheduledMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch('/api/admin/messages');
      if (response.ok) {
        const data = await response.json();
        setScheduledMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setImageUrl('');
    setButtonText('');
    setButtonUrl('');
    setScheduledDate('');
    setScheduledTime('');
    setEditingMessage(null);
  };

  const handleSendInstant = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          imageUrl: imageUrl.trim() || undefined,
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Message sent successfully! Sent: ${data.sentCount}, Failed: ${data.failedCount}`, 'success');
        resetForm();
      } else {
        showToast(data.error || 'Failed to send message', 'error');
      }
    } catch (error) {
      showToast('Failed to send message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      showToast('Scheduled date and time are required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Create moment object in local timezone
      const localDateTime = moment(`${scheduledDate}T${scheduledTime}`);
      
      // Ensure the date is valid
      if (!localDateTime.isValid()) {
        showToast('Invalid date or time format', 'error');
        setIsLoading(false);
        return;
      }

      // Convert to UTC for server
      const utcDateTime = localDateTime.utc();

      const response = await fetch('/api/admin/messages/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          imageUrl: imageUrl.trim() || undefined,
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          scheduledAt: utcDateTime.toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Message scheduled successfully!', 'success');
        resetForm();
        fetchScheduledMessages();
      } else {
        showToast(data.error || 'Failed to schedule message', 'error');
      }
    } catch (error) {
      showToast('Failed to schedule message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelScheduled = async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Message cancelled successfully!', 'success');
        fetchScheduledMessages();
      } else {
        showToast('Failed to cancel message', 'error');
      }
    } catch (error) {
      showToast('Failed to cancel message', 'error');
    }
  };

  const handleEditMessage = (msg: ScheduledMessage) => {
    setEditingMessage(msg);
    setTitle(msg.title);
    setMessage(msg.message);
    setImageUrl(msg.imageUrl || '');
    setButtonText(msg.buttonText || '');
    setButtonUrl(msg.buttonUrl || '');

    if (msg.scheduledAt) {
      // Parse UTC date from server and convert to local timezone for display
      const utcMoment = moment.utc(msg.scheduledAt);
      const localMoment = utcMoment.local();
      
      setScheduledDate(localMoment.format('YYYY-MM-DD'));
      setScheduledTime(localMoment.format('HH:mm'));
    }

    setActiveTab('scheduled');
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage) return;

    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      showToast('Scheduled date and time are required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Create moment object in local timezone
      const localDateTime = moment(`${scheduledDate}T${scheduledTime}`);
      
      // Ensure the date is valid
      if (!localDateTime.isValid()) {
        showToast('Invalid date or time format', 'error');
        setIsLoading(false);
        return;
      }

      // Convert to UTC for server
      const utcDateTime = localDateTime.utc();

      const response = await fetch(`/api/admin/messages/${editingMessage.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          imageUrl: imageUrl.trim() || undefined,
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          scheduledAt: utcDateTime.toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Message updated successfully!', 'success');
        resetForm();
        fetchScheduledMessages();
      } else {
        showToast(data.error || 'Failed to update message', 'error');
      }
    } catch (error) {
      showToast('Failed to update message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/messages/${messageId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Message deleted successfully!', 'success');
        fetchScheduledMessages();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete message', 'error');
      }
    } catch (error) {
      showToast('Failed to delete message', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";

    switch (status) {
      case 'PENDING':
        return <span className={`${baseClasses} bg-gray-600 text-gray-200`}><Clock className="w-3 h-3" /> Pending</span>;
      case 'SENT':
        return <span className={`${baseClasses} bg-green-600 text-white`}><CheckCircle className="w-3 h-3" /> Sent</span>;
      case 'FAILED':
        return <span className={`${baseClasses} bg-red-600 text-white`}><XCircle className="w-3 h-3" /> Failed</span>;
      case 'CANCELLED':
        return <span className={`${baseClasses} bg-gray-500 text-white border border-gray-400`}><AlertCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className={`${baseClasses} bg-gray-600 text-gray-200`}>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1d2025] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-customGreen-700 mb-2">Message Management</h1>
          <p className="text-gray-400">Send messages to all users instantly or schedule for later</p>
        </div>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-[#272a2f] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('instant')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'instant'
                ? 'bg-customGreen-700 text-white'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <Send className="w-4 h-4" />
              Send Instant
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'scheduled'
                ? 'bg-customGreen-700 text-white'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <Schedule className="w-4 h-4" />
              Scheduled Messages
            </button>
          </div>

          {/* Instant Message Tab */}
          {activeTab === 'instant' && (
            <div className="bg-[#272a2f] rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Instant Message
                </h2>
                <p className="text-gray-400 mt-2">
                  Send a message to all users immediately. This will be sent to all active users.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Message title"
                      className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL (optional)</label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={4}
                    className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Button Text (optional)</label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Click here"
                      className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Button URL (optional)</label>
                    <input
                      type="url"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSendInstant}
                    loading={isLoading}
                    disabled={!title.trim() || !message.trim()}
                    className="bg-customGreen-700 hover:bg-customGreen-800 text-white"
                  >
                    {isLoading ? 'Sending...' : 'Send Now'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Messages Tab */}
          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="bg-[#272a2f] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Schedule className="w-5 h-5" />
                    {editingMessage ? 'Edit Scheduled Message' : 'Schedule New Message'}
                  </h2>
                  <p className="text-gray-400 mt-2">
                    {editingMessage ? 'Update the scheduled message details.' : 'Schedule a message to be sent at a specific date and time.'}
                  </p>
                  <p className="text-yellow-400 text-sm mt-1">
                    ⚠️ Note: Scheduled time must be at least 1 minute in the future. All times are handled in UTC for consistency.
                  </p>
                  {editingMessage && (
                    <div className="mt-2">
                      <button
                        onClick={resetForm}
                        className="text-customGreen-700 hover:text-customGreen-600 text-sm underline"
                      >
                        Cancel editing
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Message title"
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Image URL (optional)</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message *</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message here..."
                      rows={4}
                      className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Button Text (optional)</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Click here"
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Button URL (optional)</label>
                      <input
                        type="url"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Scheduled Date *</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Scheduled Time *</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-[#3a3d42] border border-[#4a4d52] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-customGreen-700"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    {editingMessage && (
                      <Button
                        onClick={resetForm}
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={editingMessage ? handleUpdateMessage : handleSchedule}
                      loading={isLoading}
                      disabled={!title.trim() || !message.trim() || !scheduledDate || !scheduledTime}
                      className="bg-customGreen-700 hover:bg-customGreen-800 text-white"
                    >
                      {isLoading ? (editingMessage ? 'Updating...' : 'Scheduling...') : (editingMessage ? 'Update Message' : 'Schedule Message')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-[#272a2f] rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Schedule className="w-5 h-5" />
                    Scheduled Messages
                  </h2>
                  <p className="text-gray-400 mt-2">
                    View and manage your scheduled messages.
                  </p>
                </div>

                <div>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-customGreen-700"></div>
                    </div>
                  ) : scheduledMessages.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No scheduled messages found.</p>
                  ) : (
                    <div className="space-y-4">
                      {scheduledMessages.map((msg) => (
                        <div key={msg.id} className="border border-[#3a3d42] rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{msg.title}</h3>
                              <p className="text-gray-400 text-sm">{msg.message}</p>
                            </div>
                            {getStatusBadge(msg.status)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {msg.scheduledAt ? new Date(msg.scheduledAt).toLocaleDateString() : 'Not scheduled'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              Sent: {msg.sentCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Failed: {msg.failedCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {msg.imageUrl && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                              <Image className="w-4 h-4" />
                              Has image
                            </div>
                          )}

                          {(msg.buttonText && msg.buttonUrl) && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                              <Link className="w-4 h-4" />
                              Button: {msg.buttonText} → {msg.buttonUrl}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {msg.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleEditMessage(msg)}
                                  className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleCancelScheduled(msg.id)}
                                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-950 transition-colors text-sm flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageManagement; 