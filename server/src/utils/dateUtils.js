/**
 * Date extraction and normalization utilities for IntellMeet
 * Accurately parses natural language deadlines into JavaScript Date objects.
 */

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const DAY_MAP = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Parses natural language or formatted due date strings into a concrete Date.
 * Handles:
 *  - "by 28 October", "October 28", "28th of October"
 *  - Explicit year: "28 October 2026", "October 28, 2026"
 *  - Relative phrases: "today", "tomorrow", "next week", "in 3 days", "by Friday"
 *  - ISO / numeric dates: "2026-10-28", "28/10/2026", "28-10-2026"
 *  - "TBD", null, undefined -> defaults to 7 days from referenceDate
 *
 * Avoids the V8 Date.parse year 2001 fallback bug when year is omitted.
 *
 * @param {string|Date} dueDateStr - The raw due date string or Date object
 * @param {Date} [referenceDate] - Base reference date (defaults to current date)
 * @returns {Date} Valid JavaScript Date
 */
const parseDueDate = (dueDateStr, referenceDate = new Date()) => {
  const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();

  // 1. If already a Date object
  if (dueDateStr instanceof Date) {
    return isNaN(dueDateStr.getTime())
      ? new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000)
      : dueDateStr;
  }

  // 2. Default fallback for empty, null, or TBD
  if (!dueDateStr || typeof dueDateStr !== 'string') {
    return new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  let cleaned = dueDateStr.trim();
  if (!cleaned || /^tbd$/i.test(cleaned) || /^none$/i.test(cleaned)) {
    return new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  // Clean leading prepositions: "by", "on", "before", "due", "due by", "until", "for"
  cleaned = cleaned.replace(/^(?:due\s+by|due|by|on|before|until|for)\s+/i, '').trim();

  // 3. Relative keywords: today, tonight, eod
  if (/^(?:today|tonight|eod|end\s+of\s+day)$/i.test(cleaned)) {
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 18, 0, 0);
  }

  // Tomorrow
  if (/^tomorrow$/i.test(cleaned)) {
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1, 18, 0, 0);
  }

  // "in X days" / "in X day"
  const inDaysMatch = cleaned.match(/^in\s+(\d+)\s+days?$/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + days, 18, 0, 0);
  }

  // "in X weeks" / "in X week"
  const inWeeksMatch = cleaned.match(/^in\s+(\d+)\s+weeks?$/i);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1], 10);
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + weeks * 7, 18, 0, 0);
  }

  // "next week"
  if (/^next\s+week$/i.test(cleaned)) {
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 7, 18, 0, 0);
  }

  // "end of (the )?week" / "eow"
  if (/^(?:end\s+of\s+(?:the\s+)?week|eow)$/i.test(cleaned)) {
    const currentDay = ref.getDay();
    const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + daysUntilFriday, 18, 0, 0);
  }

  // "end of (the )?month"
  if (/^end\s+of\s+(?:the\s+)?month$/i.test(cleaned)) {
    return new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 18, 0, 0);
  }

  // Named weekdays: e.g. "Friday", "next Monday"
  const weekdayMatch = cleaned.match(/^(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)$/i);
  if (weekdayMatch) {
    const targetDay = DAY_MAP[weekdayMatch[1].toLowerCase()];
    if (targetDay !== undefined) {
      const currentDay = ref.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0 || /^next\s+/i.test(cleaned)) {
        diff = diff === 0 ? 7 : diff + 7;
      }
      return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff, 18, 0, 0);
    }
  }

  // 4. ISO Date format: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 18, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 5. Numeric formats: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    // Sanity check: if day > 12 and month <= 12, it's definitely DD/MM/YYYY
    // If month > 12 and day <= 12, swap
    if (month > 11 && day <= 12) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }

    const d = new Date(year, month, day, 18, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 6. Day then Month: "28 October", "28th October", "28th of October", "28 Oct 2026", "28th October, 2026"
  const dayMonthMatch = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([A-Za-z]+)(?:\s*,?\s*(\d{2,4}))?$/i);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthName = dayMonthMatch[2].toLowerCase();
    const month = MONTH_MAP[monthName];

    if (month !== undefined && day >= 1 && day <= 31) {
      let year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : ref.getFullYear();
      if (year < 100) year += 2000;

      let candidate = new Date(year, month, day, 18, 0, 0);

      // If no year was specified and the date is more than 30 days in the past, roll to next year
      if (!dayMonthMatch[3]) {
        const thirtyDaysAgo = new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (candidate < thirtyDaysAgo) {
          candidate = new Date(year + 1, month, day, 18, 0, 0);
        }
      }

      if (!isNaN(candidate.getTime())) return candidate;
    }
  }

  // 7. Month then Day: "October 28", "October 28th", "Oct 28, 2026"
  const monthDayMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{2,4}))?$/i);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = MONTH_MAP[monthName];

    if (month !== undefined && day >= 1 && day <= 31) {
      let year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : ref.getFullYear();
      if (year < 100) year += 2000;

      let candidate = new Date(year, month, day, 18, 0, 0);

      if (!monthDayMatch[3]) {
        const thirtyDaysAgo = new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (candidate < thirtyDaysAgo) {
          candidate = new Date(year + 1, month, day, 18, 0, 0);
        }
      }

      if (!isNaN(candidate.getTime())) return candidate;
    }
  }

  // 8. Safe fallback parser with V8 2001 year correction
  const parsedMs = Date.parse(cleaned);
  if (!isNaN(parsedMs)) {
    const candidate = new Date(parsedMs);
    // If V8 defaulted to 2001 and the input string never mentioned 2001, correct it to the reference year
    if (candidate.getFullYear() === 2001 && !/\b2001\b/.test(cleaned)) {
      candidate.setFullYear(ref.getFullYear());
      // If now in the past by > 30 days, roll to next year
      if (candidate < new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000)) {
        candidate.setFullYear(ref.getFullYear() + 1);
      }
    }
    if (!isNaN(candidate.getTime())) return candidate;
  }

  // 9. Final safe fallback: 7 days from now
  return new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000);
};

module.exports = {
  parseDueDate,
  MONTH_MAP,
  DAY_MAP,
};
