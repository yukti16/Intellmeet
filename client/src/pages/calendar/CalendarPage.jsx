import React, { useState, useEffect } from 'react';
import { meetingService } from '../../services/meetingService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    meetingService.getMeetings().then((res) => {
      setMeetings(res.meetings || []);
      setIsLoading(false);
    }).catch(err => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading meeting calendar..." />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Meeting Schedule & Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">Upcoming scheduled sessions and historical meeting logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Highlights Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-white">October 2026</h3>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800/80">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const hasMeeting = meetings.some((m) => new Date(m.scheduledAt).getDate() === dayNum);
              return (
                <div
                  key={i}
                  className={`py-2 rounded-lg font-medium transition-colors ${
                    dayNum === 8
                      ? 'bg-brand-600 text-white font-bold'
                      : hasMeeting
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduled List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-100">Scheduled Sessions</h3>
          {meetings.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No meetings scheduled in calendar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {meetings.map((m) => (
                <MeetingCard key={m._id} meeting={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
