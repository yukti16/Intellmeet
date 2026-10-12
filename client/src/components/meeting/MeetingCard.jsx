import React from 'react';
import { Calendar, Clock, Users, Video, Copy, Check } from 'lucide-react';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';

export const MeetingCard = ({ meeting, onJoin, onDelete }) => {
  const [copied, setCopied] = React.useState(false);
  const navigate = useNavigate();

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(meeting.meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    scheduled: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    ended: 'bg-slate-700/50 text-slate-400 border-slate-700',
    cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <div
      onClick={() => navigate(`/meetings/${meeting._id}`)}
      className="bg-slate-900 border border-slate-800 hover:border-brand-500/40 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${
              statusColors[meeting.status] || statusColors.scheduled
            }`}
          >
            {meeting.status}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyCode}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-mono"
              title="Copy Meeting Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{meeting.meetingCode}</span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-1 mb-1">
          {meeting.title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-4">
          {meeting.description || 'No description provided.'}
        </p>
      </div>

      <div>
        {/* Date & Host Metadata */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3.5 mb-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{new Date(meeting.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <Clock className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <span>{new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.duration}m)</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Host: {meeting.host?.name || 'Team Host'}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {meeting.status !== 'ended' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (onJoin) onJoin(meeting);
                else navigate(`/room/${meeting.meetingCode}`);
              }}
              variant={meeting.status === 'live' ? 'primary' : 'secondary'}
              size="sm"
              className="w-full"
            >
              <Video className="w-4 h-4 mr-1.5" />
              {meeting.status === 'live' ? 'Join Live Room' : 'Start / Join'}
            </Button>
          )}

          {meeting.status === 'ended' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${meeting._id}`);
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Summary & Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
