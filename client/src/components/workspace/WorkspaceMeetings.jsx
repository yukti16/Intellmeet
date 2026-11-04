import React, { useState } from 'react';
import { MeetingCard } from '../meeting/MeetingCard';
import { Button } from '../common/Button';
import { Video, Plus, Calendar } from 'lucide-react';
import { getMeetingEffectiveStatus } from '../../utils/meetingUtils';

export const WorkspaceMeetings = ({
  meetings = [],
  onOpenCreateMeeting,
  onMeetingDelete,
}) => {
  const [filter, setFilter] = useState('all');

  const filteredMeetings = meetings.filter((m) => {
    const status = getMeetingEffectiveStatus(m);
    if (filter === 'upcoming') return status === 'scheduled' || status === 'live';
    if (filter === 'ended') return status === 'ended';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Workspace Meetings</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Meetings associated with this team workspace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['all', 'upcoming', 'ended'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  filter === st
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button onClick={onOpenCreateMeeting} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Meeting
          </Button>
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No meetings found</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {filter === 'all'
              ? 'No meetings have been scheduled in this workspace yet.'
              : `No ${filter} meetings for this workspace.`}
          </p>
          <Button onClick={onOpenCreateMeeting} variant="secondary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule First Meeting
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              onDelete={onMeetingDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
