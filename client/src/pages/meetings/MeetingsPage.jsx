import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { useNavigate } from 'react-router-dom';
import { meetingService } from '../../services/meetingService';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { CreateMeetingModal } from '../../components/meeting/CreateMeetingModal';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Video, Plus, Search, Filter } from 'lucide-react';

export const MeetingsPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');


  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (search.trim()) params.search = search;

      const res = await meetingService.getMeetings(params);
      setMeetings(res.meetings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMeetings();
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a meeting code');
      return;
    }
    try {
      const res = await meetingService.joinMeeting(joinCode.trim());
      toast.success(`Joined meeting ${res.meeting.title}`);
      navigate(`/room/${res.meeting.meetingCode}`);
      // Refresh list to include the meeting now joined
      fetchMeetings();
      setJoinCode('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to join meeting';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Meetings Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Schedule, join, and review enterprise AI meetings</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" /> Schedule / New Meeting
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search meetings by title, description or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        {/* Join Meeting by Code */}
        <div className="flex gap-2 mt-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Enter meeting code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleJoinSubmit}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold"
          >
            Join Meeting
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'scheduled', 'live', 'ended'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Grid */}
      {isLoading ? (
        <LoadingSpinner label="Loading meetings..." />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings found"
          description="There are no meetings matching your filter. Create a new meeting to get started!"
          actionLabel="Create Meeting"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((m) => (
            <MeetingCard key={m._id} meeting={m} />
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newM) => setMeetings((prev) => [newM, ...prev])}
      />
    </div>
  );
};
