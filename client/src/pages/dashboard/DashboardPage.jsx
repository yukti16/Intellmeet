import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meetingService } from '../../services/meetingService';
import { actionItemService } from '../../services/actionItemService';
import { userService } from '../../services/userService';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { ActionItemCard } from '../../components/actionItem/ActionItemCard';
import { CreateMeetingModal } from '../../components/meeting/CreateMeetingModal';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Video,
  Calendar,
  CheckSquare,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  Plus,
  Play,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [teamCount, setTeamCount] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [mRes, aRes, uRes] = await Promise.all([
          meetingService.getMeetings(),
          actionItemService.getActionItems(),
          userService.getUsers(),
        ]);
        setMeetings(mRes.meetings || []);
        setActionItems(aRes.actionItems || []);
        setTeamCount(uRes.count || 0);
      } catch (err) {
        console.error('[Dashboard Error]', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    }
  };

  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled' || m.status === 'live');
  const completedMeetings = meetings.filter((m) => m.status === 'ended');

  // Chart data
  const weeklyData = [
    { day: 'Mon', meetings: 3, hours: 2.5 },
    { day: 'Tue', meetings: 5, hours: 4.0 },
    { day: 'Wed', meetings: 4, hours: 3.2 },
    { day: 'Thu', meetings: 7, hours: 5.5 },
    { day: 'Fri', meetings: 6, hours: 4.8 },
    { day: 'Sat', meetings: 1, hours: 0.8 },
    { day: 'Sun', meetings: 0, hours: 0.0 },
  ];

  const actionStatusData = [
    { name: 'Pending', count: actionItems.filter((a) => a.status === 'Pending').length || 2 },
    { name: 'In Progress', count: actionItems.filter((a) => a.status === 'In Progress').length || 4 },
    { name: 'Completed', count: actionItems.filter((a) => a.status === 'Completed').length || 7 },
  ];

  if (isLoading) return <LoadingSpinner label="Loading IntellMeet Dashboard..." />;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {user?.jobTitle} • {user?.department} Department
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Quick Join Input */}
          <form onSubmit={handleQuickJoin} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Enter Code (e.g. INT-8F3K29)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-full sm:w-48 font-mono"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={!joinCode.trim()}>
              <Play className="w-3.5 h-3.5 mr-1" /> Join
            </Button>
          </form>

          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Meeting
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Meetings</span>
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{meetings.length}</h3>
          <span className="text-[10px] text-emerald-400 font-medium">↑ 18% from last week</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{upcomingMeetings.length}</h3>
          <span className="text-[10px] text-slate-400 font-medium">Scheduled in calendar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Action Items</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{actionItems.length}</h3>
          <span className="text-[10px] text-purple-400 font-medium">AI Extracted & Assigned</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Team Velocity</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{teamCount}</h3>
          <span className="text-[10px] text-emerald-400 font-medium">Active workspace members</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Meeting Frequency & Hours</h3>
              <p className="text-xs text-slate-400">Weekly activity trends across all workspaces</p>
            </div>
            <span className="text-xs text-brand-400 font-semibold bg-brand-500/10 px-2.5 py-1 rounded-lg">
              Weekly Overview
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Items Completion Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Task Completion</h3>
              <p className="text-xs text-slate-400">Action items progress status</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Meetings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-white">Upcoming & Recent Meetings</h3>
          <Button onClick={() => navigate('/meetings')} variant="ghost" size="sm">
            View All <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {meetings.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No meetings found. Create your first meeting!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.slice(0, 3).map((m) => (
              <MeetingCard key={m._id} meeting={m} />
            ))}
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newM) => setMeetings((prev) => [newM, ...prev])}
      />
    </div>
  );
};
