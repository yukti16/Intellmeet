/**
 * Helper utilities for formatting and normalizing meeting metadata
 * (statuses, titles, descriptions, badges)
 */

export const getMeetingEffectiveStatus = (meeting) => {
  if (!meeting) return 'scheduled';

  const rawStatus = (meeting.status || 'scheduled').toLowerCase();

  // If permanently ended or cancelled, respect persisted status
  if (rawStatus === 'ended' || rawStatus === 'cancelled') {
    return rawStatus;
  }

  // If marked live in DB, check if it's genuinely ongoing or stale
  const scheduledTime = new Date(meeting.scheduledAt || meeting.createdAt || Date.now()).getTime();
  const durationMs = (Number(meeting.duration) || 30) * 60 * 1000;
  const now = Date.now();

  if (rawStatus === 'live') {
    // A meeting can't be realistically "live" indefinitely without ending.
    // If the scheduled window plus a generous buffer (e.g. 4 hours) has elapsed, treat as ended.
    const maxLiveWindow = Math.max(durationMs * 2, 4 * 60 * 60 * 1000);
    if (now > scheduledTime + maxLiveWindow) {
      return 'ended';
    }
    return 'live';
  }

  // If status is 'scheduled':
  // If current time is past the scheduled end time (scheduledTime + durationMs + 30m grace buffer),
  // it is no longer upcoming. If it never transitioned to live, it is a past/ended meeting record.
  const graceBufferMs = 15 * 60 * 1000; // 15 mins
  if (now > scheduledTime + durationMs + graceBufferMs) {
    return 'ended';
  }

  // If current time is within [scheduledTime - 5m, scheduledTime + durationMs],
  // and has active indicators or scheduled for right now, it can be considered live or scheduled
  if (now >= scheduledTime && now <= scheduledTime + durationMs) {
    // If explicitly live, it's live; otherwise scheduled (starting now)
    return rawStatus === 'live' ? 'live' : 'scheduled';
  }

  return 'scheduled';
};

export const getStatusBadgeConfig = (status) => {
  const normalized = (status || 'scheduled').toLowerCase();
  switch (normalized) {
    case 'live':
      return {
        label: 'LIVE',
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
      };
    case 'ended':
    case 'completed':
      return {
        label: 'COMPLETED',
        className: 'bg-slate-700/50 text-slate-400 border-slate-700',
      };
    case 'cancelled':
      return {
        label: 'CANCELLED',
        className: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      };
    case 'scheduled':
    case 'upcoming':
    default:
      return {
        label: 'UPCOMING',
        className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      };
  }
};

/**
 * Validates and cleans up meeting titles that are empty, whitespace-only,
 * or punctuation-only (e.g. ".....", "....")
 */
export const sanitizeMeetingTitle = (title, fallbackCode = '') => {
  if (!title || typeof title !== 'string') {
    return fallbackCode ? `Meeting (${fallbackCode})` : 'Untitled Meeting';
  }

  const trimmed = title.trim();
  // Check if string contains only dots, dashes, underscores, or punctuation
  const hasLettersOrDigits = /[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed);

  if (!hasLettersOrDigits) {
    return fallbackCode ? `Meeting (${fallbackCode})` : 'General Discussion';
  }

  return trimmed;
};

/**
 * Validates and cleans up meeting descriptions
 */
export const sanitizeMeetingDescription = (description) => {
  if (!description || typeof description !== 'string') return null;
  const trimmed = description.trim();
  const hasLettersOrDigits = /[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed);
  if (!hasLettersOrDigits) return null;
  return trimmed;
};
