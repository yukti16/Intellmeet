import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingService } from '../../services/meetingService';
import { ActionItemCard } from '../../components/actionItem/ActionItemCard';
import { CreateActionItemModal } from '../../components/actionItem/CreateActionItemModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckSquare,
  MessageSquare,
  Brain,
  Video,
  Plus,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export const MeetingDetailsPage = () => {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await meetingService.getMeetingById(id);
      setMeeting(res.meeting);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (isLoading) return <LoadingSpinner label="Retrieving meeting details and AI analysis..." />;

  if (!meeting) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-slate-200">Meeting Not Found</h3>
        <Button onClick={() => navigate('/meetings')} variant="secondary" className="mt-4">
          Back to Meetings
        </Button>
      </div>
    );
  }

  const summary = meeting.summary || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Back & Action Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/meetings')}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </button>

        {meeting.status !== 'ended' && (
          <Button onClick={() => navigate(`/room/${meeting.meetingCode}`)} variant="primary" size="sm">
            <Video className="w-4 h-4 mr-1.5" /> Join Live Room
          </Button>
        )}
      </div>

      {/* Main Title & Info Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold rounded-lg uppercase">
                {meeting.status}
              </span>
              <span className="text-xs font-mono text-slate-400">Code: {meeting.meetingCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {meeting.title}
            </h1>
            {meeting.description && (
              <p className="text-xs sm:text-sm text-slate-400 mt-2">{meeting.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Meeting report link copied to clipboard!');
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share Report
            </button>
          </div>
        </div>

        {/* Quick Details Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <Calendar className="w-4 h-4 text-brand-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Scheduled</span>
              <span>{new Date(meeting.scheduledAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <Clock className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Duration</span>
              <span>{meeting.duration} Minutes</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <Users className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Host</span>
              <span>{meeting.host?.name || 'Team Lead'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <Brain className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">AI Status</span>
              <span className="text-emerald-400 font-bold">Analysis Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'summary', label: 'AI Executive Summary', icon: Brain },
          { id: 'action-items', label: `Action Items (${meeting.actionItems?.length || 0})`, icon: CheckSquare },
          { id: 'transcript', label: 'Meeting Transcript', icon: FileText },
          { id: 'participants', label: 'Participants', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Executive Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              {summary.executiveSummary || 'AI analysis generated based on recorded meeting conversation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Discussion Points */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Key Discussion Points</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(summary.mainPoints || meeting.keyPoints || []).map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Decisions Made */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Key Decisions</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(summary.decisions || ['Approved system architecture deployment']).map((dec, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span>{dec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Action Items */}
      {activeTab === 'action-items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Extracted & Assigned Action Items</h3>
            <Button onClick={() => setIsActionModalOpen(true)} variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Action Item
            </Button>
          </div>

          {meeting.actionItems?.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No action items created for this meeting yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meeting.actionItems.map((item) => (
                <ActionItemCard
                  key={item._id}
                  actionItem={item}
                  onStatusChange={() => fetchDetails()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Transcript */}
      {activeTab === 'transcript' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Timestamped Transcript</h4>
          {meeting.transcript?.length === 0 ? (
            <p className="text-xs text-slate-500">No transcript captured for this meeting.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {meeting.transcript.map((t, i) => (
                <div key={i} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-brand-400">{t.speaker}</span>
                    <span className="text-[10px] text-slate-500">{t.timestamp}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Participants */}
      {activeTab === 'participants' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Meeting Attendance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {meeting.participants?.map((p) => (
              <div key={p._id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700" />
                <div>
                  <h5 className="text-xs font-bold text-slate-200">{p.name}</h5>
                  <span className="text-[10px] text-slate-400">{p.jobTitle || 'Team Member'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Action Item Modal */}
      <CreateActionItemModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        meetingId={meeting._id}
        onCreated={() => fetchDetails()}
      />
    </div>
  );
};
