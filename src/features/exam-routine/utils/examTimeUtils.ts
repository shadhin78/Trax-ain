/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeRemainingBreakdown, CountdownTier, ExamActiveStatus, CountdownUnit, ExamSubject } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 30-minute active live window in milliseconds (stays live for 30 min, then marked as completed)
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;
export const TWO_HOURS_MS = THIRTY_MINUTES_MS; // Backwards-compatible alias

/**
 * Format date into "21 Nov 2026"
 */
export function formatExamDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {}
  return dateStr;
}

/**
 * Format date range into "(17 Nov 2026 - 24 Nov 2026)"
 */
export function formatExamDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return formatExamDisplayDate(startDate);
  if (!startDate && endDate) return formatExamDisplayDate(endDate);
  return `${formatExamDisplayDate(startDate)} - ${formatExamDisplayDate(endDate)}`;
}

/**
 * Format full exam timestamp into "Sat, 21 Nov 2026 at 12:00 PM"
 */
export function formatFullExamDateTime(examDate: string, examTime?: string): string {
  try {
    const [year, month, day] = examDate.split('-').map(Number);
    const [hours, minutes] = (examTime && examTime.trim() ? examTime : '00:00').split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes);
    if (!isNaN(d.getTime())) {
      const dayName = DAY_NAMES[d.getDay()];
      const monthName = MONTH_NAMES[d.getMonth()];
      const dayNum = d.getDate();
      const yr = d.getFullYear();
      const hr = d.getHours();
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const formattedHr = hr % 12 || 12;
      const formattedMin = String(d.getMinutes()).padStart(2, '0');
      return `${dayName}, ${dayNum} ${monthName} ${yr} at ${formattedHr}:${formattedMin} ${ampm}`;
    }
  } catch {}
  return `${examDate} at ${examTime || '00:00'}`;
}

/**
 * Parse an exam date and time into a Date timestamp in milliseconds.
 * If no time is provided, midnight (00:00) is used by default.
 * Handles missing or invalid dates safely, returning 0.
 */
export function getExamTimestamp(examDate?: string, examTime?: string): number {
  if (!examDate || typeof examDate !== 'string') return 0;
  try {
    const parts = examDate.split('-');
    if (parts.length !== 3) return 0;
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;
    const safeTime = examTime && examTime.trim() ? examTime.trim() : '00:00';
    const [hours, minutes] = safeTime.split(':').map(Number);
    const d = new Date(year, month - 1, day, isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
    const ts = d.getTime();
    return isNaN(ts) ? 0 : ts;
  } catch {
    return 0;
  }
}

/**
 * Check whether an exam subject is eligible as an upcoming exam.
 * An eligible upcoming exam:
 * 1. Is not completed (!subject.isCompleted)
 * 2. Has a valid scheduled timestamp > 0
 * 3. Falls within the active window (timestamp + 30m >= now)
 */
export function isEligibleUpcomingExam(subject: ExamSubject, now: number = Date.now()): boolean {
  if (subject.isCompleted) return false;
  const ts = getExamTimestamp(subject.examDate, subject.examTime);
  return ts > 0 && ts + THIRTY_MINUTES_MS >= now;
}

/**
 * Sorts exam subjects by actual countdown:
 * - Eligible upcoming exams appear FIRST in ascending order of scheduled date/time:
 *   Less time remaining -> First position.
 *   More time remaining -> Later position.
 * - Completed, cancelled, past, and otherwise ineligible exams appear AFTER eligible exams.
 * - Handles missing or invalid dates safely (placed at the end).
 * - Uses a stable tie-breaker for exams with identical scheduled times (subjectName, then id).
 */
export function sortExamSubjects(subjects: ExamSubject[], now: number = Date.now()): ExamSubject[] {
  if (!Array.isArray(subjects) || subjects.length <= 1) return subjects || [];

  return [...subjects].sort((a, b) => {
    const aEligible = isEligibleUpcomingExam(a, now);
    const bEligible = isEligibleUpcomingExam(b, now);

    // 1. Eligible upcoming exams always appear before ineligible/completed/past exams
    if (aEligible && !bEligible) return -1;
    if (!aEligible && bEligible) return 1;

    const aTs = getExamTimestamp(a.examDate, a.examTime);
    const bTs = getExamTimestamp(b.examDate, b.examTime);

    if (aEligible && bEligible) {
      // 2. Ascending order of scheduled date and time (less time remaining -> first position)
      if (aTs !== bTs) return aTs - bTs;
      // Stable tie-breaker
      const nameCompare = (a.subjectName || '').localeCompare(b.subjectName || '');
      if (nameCompare !== 0) return nameCompare;
      return (a.id || '').localeCompare(b.id || '');
    }

    // 3. Both ineligible (e.g. both completed or past or missing dates):
    // Valid timestamps appear before missing/invalid timestamps (ts <= 0)
    if (aTs > 0 && bTs <= 0) return -1;
    if (aTs <= 0 && bTs > 0) return 1;
    if (aTs > 0 && bTs > 0 && aTs !== bTs) return aTs - bTs;

    const nameCompare = (a.subjectName || '').localeCompare(b.subjectName || '');
    if (nameCompare !== 0) return nameCompare;
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Step-by-step Calendar-Accurate Borrowing Difference (Target minus Now).
 * Accounts for actual days in preceding calendar month (28, 29, 30, 31).
 */
export function calculateCalendarDifference(now: Date, target: Date) {
  let targetY = target.getFullYear();
  let targetM = target.getMonth();
  let targetD = target.getDate();
  let targetH = target.getHours();
  let targetMin = target.getMinutes();
  let targetS = target.getSeconds();

  const nowY = now.getFullYear();
  const nowM = now.getMonth();
  const nowD = now.getDate();
  const nowH = now.getHours();
  const nowMin = now.getMinutes();
  const nowS = now.getSeconds();

  // 1. Seconds: Target seconds minus current seconds. If negative, borrow 60 seconds from minutes.
  let seconds = targetS - nowS;
  if (seconds < 0) {
    seconds += 60;
    targetMin -= 1;
  }

  // 2. Minutes: Target minutes minus current minutes. If negative, borrow 60 minutes from hours.
  let minutes = targetMin - nowMin;
  if (minutes < 0) {
    minutes += 60;
    targetH -= 1;
  }

  // 3. Hours: Target hours minus current hours. If negative, borrow 24 hours from days.
  let hours = targetH - nowH;
  if (hours < 0) {
    hours += 24;
    targetD -= 1;
  }

  // 4. Days: Target day minus current day. If negative, borrow exact days in previous calendar month.
  let days = targetD - nowD;
  if (days < 0) {
    // Number of days in the month immediately before targetM (in year targetY)
    const daysInPrevMonth = new Date(targetY, targetM, 0).getDate();
    days += daysInPrevMonth;
    targetM -= 1;
  }

  // 5. Months: Target month minus current month. If negative, borrow 12 months from years.
  let months = targetM - nowM;
  if (months < 0) {
    months += 12;
    targetY -= 1;
  }

  // 6. Years: Target year minus current year.
  let years = targetY - nowY;
  if (years < 0) {
    years = 0;
  }

  return { years, months, days, hours, minutes, seconds };
}

/**
 * Compute real-time countdown breakdown from client wall-clock according to the 4 strict rules:
 * 1. Target Exam Selection Rules (active status window: 2 hours)
 * 2. Time Difference Calculation Rules (Elapsed / In-Progress Detection, Calendar-Accurate Borrowing)
 * 3. Dynamic 4-Unit Tier Rules (Long-Term >=1y, Medium-Term 1m-1y, Short-Term <1m)
 * 4. Live Sync & Refresh Rules (1-second heartbeat, instant state transitions)
 */
export function calculateExamTimeRemaining(
  examDate: string,
  examTime?: string,
  currentTimeMs: number = Date.now()
): TimeRemainingBreakdown {
  const targetTs = getExamTimestamp(examDate, examTime);
  const formattedDateString = formatFullExamDateTime(examDate, examTime);

  if (isNaN(targetTs) || targetTs === 0) {
    const fallbackUnits: [CountdownUnit, CountdownUnit, CountdownUnit, CountdownUnit] = [
      { label: 'MONTHS', value: '00' },
      { label: 'DAYS', value: '00' },
      { label: 'HOURS', value: '00' },
      { label: 'MINS', value: '00' },
    ];
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isPast: true,
      status: 'ENDED',
      tier: 'MEDIUM_TERM',
      units: fallbackUnits,
      elapsedSinceStartSeconds: 0,
      compactString: 'NO TARGET',
      formattedDateString,
    };
  }

  const diffMs = targetTs - currentTimeMs;

  // ── CASE A: TARGET TIME HAS PASSED (ELAPSED / IN-PROGRESS DETECTION) ──
  if (diffMs <= 0) {
    const elapsedMs = currentTimeMs - targetTs;
    const elapsedSinceStartSeconds = Math.floor(elapsedMs / 1000);

    // If started less than 30 minutes ago: Live / In Progress Now
    if (elapsedMs <= THIRTY_MINUTES_MS) {
      const elHours = Math.floor(elapsedSinceStartSeconds / 3600);
      const elMins = Math.floor((elapsedSinceStartSeconds % 3600) / 60);
      const elSecs = elapsedSinceStartSeconds % 60;

      const liveUnits: [CountdownUnit, CountdownUnit, CountdownUnit, CountdownUnit] = [
        { label: 'STATUS', value: 'LIVE' },
        { label: 'HOURS', value: String(elHours).padStart(2, '0') },
        { label: 'MINS', value: String(elMins).padStart(2, '0') },
        { label: 'SECS', value: String(elSecs).padStart(2, '0') },
      ];

      return {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isPast: true,
        status: 'LIVE_IN_PROGRESS',
        tier: 'SHORT_TERM',
        units: liveUnits,
        elapsedSinceStartSeconds,
        compactString: 'LIVE NOW',
        formattedDateString,
      };
    }

    // If started more than 30 minutes ago: Ended (auto-marked completed)
    const endedUnits: [CountdownUnit, CountdownUnit, CountdownUnit, CountdownUnit] = [
      { label: 'MONTHS', value: '00' },
      { label: 'DAYS', value: '00' },
      { label: 'HOURS', value: '00' },
      { label: 'MINS', value: '00' },
    ];

    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isPast: true,
      status: 'ENDED',
      tier: 'MEDIUM_TERM',
      units: endedUnits,
      elapsedSinceStartSeconds,
      compactString: 'ENDED',
      formattedDateString,
    };
  }

  // ── CASE B: FUTURE EXAM (CALENDAR-ACCURATE BORROWING) ──
  const nowObj = new Date(currentTimeMs);
  const targetObj = new Date(targetTs);

  const { years, months, days, hours, minutes, seconds } = calculateCalendarDifference(nowObj, targetObj);
  const totalSeconds = Math.floor(diffMs / 1000);

  let tier: CountdownTier;
  let units: [CountdownUnit, CountdownUnit, CountdownUnit, CountdownUnit];
  let compactString: string;

  if (years >= 1) {
    // 1. Long-Term Tier (Remaining time is 1 year or more):
    // Displays: Years, Months, Days, and Hours. Minutes and seconds are omitted.
    tier = 'LONG_TERM';
    units = [
      { label: 'YEARS', value: String(years).padStart(2, '0') },
      { label: 'MONTHS', value: String(months).padStart(2, '0') },
      { label: 'DAYS', value: String(days).padStart(2, '0') },
      { label: 'HOURS', value: String(hours).padStart(2, '0') },
    ];
    compactString = `${String(years).padStart(2, '0')}YR ${String(months).padStart(2, '0')}MO ${String(days).padStart(2, '0')}D ${String(hours).padStart(2, '0')}H`;
  } else if (months >= 1) {
    // 2. Medium-Term Tier (Remaining time is between 1 month and 1 year):
    // Displays: Months, Days, Hours, and Minutes. Years omitted, seconds hidden.
    tier = 'MEDIUM_TERM';
    units = [
      { label: 'MONTHS', value: String(months).padStart(2, '0') },
      { label: 'DAYS', value: String(days).padStart(2, '0') },
      { label: 'HOURS', value: String(hours).padStart(2, '0') },
      { label: 'MINS', value: String(minutes).padStart(2, '0') },
    ];
    compactString = `${String(months).padStart(2, '0')}MO ${String(days).padStart(2, '0')}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M`;
  } else {
    // 3. Short-Term Tier (Remaining time is under 1 month):
    // Displays: Days, Hours, Minutes, and Seconds. Live second-by-second countdown.
    tier = 'SHORT_TERM';
    units = [
      { label: 'DAYS', value: String(days).padStart(2, '0') },
      { label: 'HOURS', value: String(hours).padStart(2, '0') },
      { label: 'MINS', value: String(minutes).padStart(2, '0') },
      { label: 'SECS', value: String(seconds).padStart(2, '0') },
    ];
    compactString = `${String(days).padStart(2, '0')}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
  }

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isPast: false,
    status: 'UPCOMING',
    tier,
    units,
    elapsedSinceStartSeconds: 0,
    compactString,
    formattedDateString,
  };
}
