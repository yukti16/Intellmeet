import React from 'react';
import { Calendar, Clock, Users, Video, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meetingService } from '../../services/meetingService';
import toast from 'react-hot-toast';
import {
  getMeetingEffectiveStatus,
  getStatusBadgeConfig,
  sanitizeMeetingTitle,
  sanitizeMeetingDescription,
} from '../../utils/meetingUtils';

export const MeetingCard = ({ meeting, onJoin, onDelete }) => {
  const { user, isAdmin } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const navigate = useNavigate();

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(meeting.meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }
    try {
      await meetingService.deleteMeeting(meeting._id);
      toast.success('Meeting deleted');
      if (onDelete) onDelete(meeting);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete meeting';
      toast.error(msg);
    }
  };
  const effectiveStatus = getMeetingEffectiveStatus(meeting);
  const badgeConfig = getStatusBadgeConfig(effectiveStatus);
  const cleanTitle = sanitizeMeetingTitle(meeting.title, meeting.meetingCode);
  const cleanDescription = sanitizeMeetingDescription(meeting.description);

  // Helper to extract host ID regardless of population
  const getHostId = (host) => {
    if (!host) return null;
    if (typeof host === 'string') return host;
    return host._id?.toString() || host.id?.toString() || null;
  };

  // Helper to extract current user ID (supports _id or id)
  const getUserId = (usr) => {
    if (!usr) return null;
    if (typeof usr === 'string') return usr;
    return usr._id?.toString() || usr.id?.toString() || null;
  };

  const hostId = getHostId(meeting.host);
  const userId = getUserId(user);
  const canDelete = isAdmin || Boolean(hostId && userId && hostId === userId);

  return (
    <div
      onClick={() => navigate(`/meetings/${meeting._id}`)}
      className="bg-slate-900 border border-slate-800 hover:border-brand-500/40 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${badgeConfig.className}`}
          >
            {badgeConfig.label}
          </span>

          <div className="flex items-center gap-1">
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-red-400 hover:text-red-100 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-mono"
                  title="Delete Meeting"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
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
          {cleanTitle}
        </h3>
        {cleanDescription ? (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
            {cleanDescription}
          </p>
        ) : (
          <div className="mb-4" />
        )}
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
          {effectiveStatus !== 'ended' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (onJoin) onJoin(meeting);
                else navigate(`/room/${meeting.meetingCode}`);
              }}
              variant={effectiveStatus === 'live' ? 'primary' : 'secondary'}
              size="sm"
              className="w-full"
            >
              <Video className="w-4 h-4 mr-1.5" />
              {effectiveStatus === 'live' ? 'Join Live Room' : 'Start / Join'}
            </Button>
          )}

          {effectiveStatus === 'ended' && (
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
