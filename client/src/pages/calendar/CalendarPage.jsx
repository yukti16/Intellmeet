import React, { useState, useEffect, useMemo } from 'react';
import { meetingService } from '../../services/meetingService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Filter, CalendarCheck, History } from 'lucide-react';
import { getMeetingEffectiveStatus } from '../../utils/meetingUtils';

export const CalendarPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Month navigation: default to current date
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  // Selected date: null means "All dates in this month", or a Date object
  const [selectedDate, setSelectedDate] = useState(null);
  // View mode tab: 'all' | 'upcoming' | 'past'
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    meetingService.getMeetings().then((res) => {
      setMeetings(res.meetings || []);
      setIsLoading(false);
    }).catch(err => {
      console.error('[Calendar] Failed to load meetings:', err);
      setIsLoading(false);
    });
  }, []);

  // Today reference
  const today = useMemo(() => new Date(), []);

  // Calculate year & month
  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // First day of current month (0: Sunday, 1: Monday, ...)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Days count in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleDateSelect = (dayNum) => {
    if (selectedDate &&
        selectedDate.getDate() === dayNum &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear) {
      // Toggle off selection if clicked again
      setSelectedDate(null);
    } else {
      setSelectedDate(new Date(currentYear, currentMonth, dayNum));
    }
  };

  // Helper to check if a specific day has meetings
  const getMeetingsForDay = (dayNum) => {
    return meetings.filter((m) => {
      const d = new Date(m.scheduledAt);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d.getDate() === dayNum
      );
    });
  };

  // Filter meetings based on selected date & active tab (upcoming vs past)
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const mDate = new Date(m.scheduledAt);

      // If a date is selected, restrict to that exact day
      if (selectedDate) {
        const isSameDay =
          mDate.getFullYear() === selectedDate.getFullYear() &&
          mDate.getMonth() === selectedDate.getMonth() &&
          mDate.getDate() === selectedDate.getDate();
        if (!isSameDay) return false;
      }

      // Tab filtering: upcoming vs past vs all
      const status = getMeetingEffectiveStatus(m);
      if (activeTab === 'upcoming') {
        return status === 'scheduled' || status === 'live';
      }
      if (activeTab === 'past') {
        return status === 'ended' || status === 'cancelled';
      }

      return true;
    }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [meetings, selectedDate, activeTab]);

  // Separate metrics for tabs
  const upcomingCount = useMemo(() => {
    return meetings.filter((m) => {
      const s = getMeetingEffectiveStatus(m);
      return s === 'scheduled' || s === 'live';
    }).length;
  }, [meetings]);

  const pastCount = useMemo(() => {
    return meetings.filter((m) => {
      const s = getMeetingEffectiveStatus(m);
      return s === 'ended' || s === 'cancelled';
    }).length;
  }, [meetings]);

  if (isLoading) return <LoadingSpinner label="Loading meeting calendar..." />;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Meeting Schedule & Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize upcoming scheduled sessions and review past meeting archives
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'upcoming'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Upcoming ({upcomingCount})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'past'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Past Records ({pastCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Calendar Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-white">{monthName}</h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleTodayClick}
                className="px-2 py-1 text-[11px] font-semibold text-brand-400 hover:bg-slate-800 rounded-md transition-colors mr-1 border border-brand-500/30"
                title="Go to Today"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800/80">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty slots before month start */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="py-2.5 opacity-0 pointer-events-none" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday =
                today.getFullYear() === currentYear &&
                today.getMonth() === currentMonth &&
                today.getDate() === dayNum;

              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === currentYear &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getDate() === dayNum;

              const dayMeetings = getMeetingsForDay(dayNum);
              const hasMeeting = dayMeetings.length > 0;
              const hasLive = dayMeetings.some(m => getMeetingEffectiveStatus(m) === 'live');

              let styling = 'text-slate-400 hover:bg-slate-800 hover:text-slate-200';

              if (isSelected) {
                styling = 'bg-brand-600 text-white font-bold ring-2 ring-brand-400 shadow-lg shadow-brand-600/30';
              } else if (isToday) {
                styling = hasMeeting
                  ? 'bg-slate-800 text-brand-400 font-bold border-2 border-brand-500'
                  : 'bg-slate-800 text-white font-bold border-2 border-slate-600';
              } else if (hasMeeting) {
                styling = hasLive
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30';
              }

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => handleDateSelect(dayNum)}
                  className={`py-2 rounded-xl font-medium transition-all relative flex flex-col items-center justify-center ${styling}`}
                >
                  <span>{dayNum}</span>
                  {hasMeeting && !isSelected && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        hasLive ? 'bg-emerald-400 animate-ping' : 'bg-brand-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md border-2 border-brand-500 bg-slate-800 inline-block" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md bg-brand-600 inline-block" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md bg-purple-500/20 border border-purple-500/40 inline-block" />
              <span>Scheduled</span>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>
                {selectedDate
                  ? `Sessions for ${selectedDate.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : activeTab === 'upcoming'
                  ? 'Upcoming Scheduled Sessions'
                  : activeTab === 'past'
                  ? 'Historical Meeting Records'
                  : 'All Meeting Sessions'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {filteredMeetings.length}
              </span>
            </h3>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 underline"
              >
                Clear date filter
              </button>
            )}
          </div>

          {filteredMeetings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No meeting sessions found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {selectedDate
                  ? `There are no meetings on ${selectedDate.toLocaleDateString()}. Select another date or clear the filter.`
                  : activeTab === 'upcoming'
                  ? 'No upcoming scheduled meetings. Create one to get started!'
                  : 'No meeting history available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMeetings.map((m) => (
                <MeetingCard key={m._id} meeting={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
