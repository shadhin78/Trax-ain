/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates Saturday-to-Friday week slices for a given month.
 * Rule:
 * 1. Weeks run Saturday to Friday (7 days).
 * 2. Weekly dropdown is ONLY for that month: clipped to the month's boundaries.
 * 3. If any last week of a month has 4 days in this month and 3 days in the next month,
 *    in this month it will show the 4 days, and in the next month's 1st week it will show the 3 days.
 */
export interface MonthWeekOption {
  id: string; // e.g. "2026-10-W1"
  monthKey: string; // "2026-10"
  weekIndex: number; // 1, 2, 3, 4, 5, 6
  startDay: number; // 1
  endDay: number; // 2
  daysCount: number; // 2
  startDate: Date;
  endDate: Date;
  label: string; // e.g. "Week 1 (Oct 01 - Oct 02 · 2 days)"
  shortLabel: string; // e.g. "Week 1 (2d)"
  dateRangeStr: string; // "Oct 01 - Oct 02"
  isPartialStart?: boolean;
  isPartialEnd?: boolean;
  nextMonthDays?: number;
  prevMonthDays?: number;
}

export function getMonthWeeks(monthDate: Date): MonthWeekOption[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthShort = monthNames[month];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const weeks: MonthWeekOption[] = [];
  let currentDay = 1;
  let weekIndex = 1;
  
  while (currentDay <= daysInMonth) {
    const startDay = currentDay;
    let d = currentDay;
    
    // Find the next Friday (getDay() === 5) or end of month using noon to prevent DST variance
    while (d <= daysInMonth) {
      const dateObj = new Date(year, month, d, 12, 0, 0);
      // In JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      if (dateObj.getDay() === 5 || d === daysInMonth) {
        break;
      }
      d++;
    }
    
    const endDay = Math.min(d, daysInMonth);
    const daysCount = endDay - startDay + 1;
    
    const startDate = new Date(year, month, startDay, 12, 0, 0);
    const endDate = new Date(year, month, endDay, 23, 59, 59, 999);
    
    const startPad = String(startDay).padStart(2, '0');
    const endPad = String(endDay).padStart(2, '0');
    
    const dateRangeStr = startDay === endDay 
      ? `${monthShort} ${startPad}`
      : `${monthShort} ${startPad} - ${monthShort} ${endPad}`;
      
    const dayLabel = daysCount === 1 ? '1 day' : `${daysCount} days`;
    
    const isPartialStart = startDay === 1 && daysCount < 7;
    const isPartialEnd = endDay === daysInMonth && daysCount < 7;
    const prevMonthDays = isPartialStart ? 7 - daysCount : 0;
    const nextMonthDays = isPartialEnd ? 7 - daysCount : 0;

    let extraNote = '';
    if (isPartialEnd && nextMonthDays > 0) {
      extraNote = ` · ${daysCount}d this mo, ${nextMonthDays}d next mo`;
    } else if (isPartialStart && prevMonthDays > 0) {
      extraNote = ` · ${daysCount}d this mo`;
    }
    
    const label = `Week ${weekIndex} (${dateRangeStr} · ${dayLabel})`;
    const shortLabel = `Week ${weekIndex} (${daysCount}d)`;
    
    weeks.push({
      id: `${monthKey}-W${weekIndex}`,
      monthKey,
      weekIndex,
      startDay,
      endDay,
      daysCount,
      startDate,
      endDate,
      label,
      shortLabel,
      dateRangeStr,
      isPartialStart,
      isPartialEnd,
      prevMonthDays,
      nextMonthDays,
    });
    
    currentDay = endDay + 1;
    weekIndex++;
  }
  
  return weeks;
}

export function getMonthWeeksByMonthKey(monthKey: string): MonthWeekOption[] {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  return getMonthWeeks(new Date(year, month, 1, 12, 0, 0));
}

/**
 * Finds the MonthWeekOption that a given date falls into within that month
 */
export function getMonthWeekForDate(date: Date): MonthWeekOption | undefined {
  const weeks = getMonthWeeks(date);
  const day = date.getDate();
  return weeks.find(w => day >= w.startDay && day <= w.endDay);
}

/**
 * Helper: Format Date to Saturday-to-Friday Week YYYY-Www
 */
export function toWeekKey(date: Date): string {
  const day = date.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToSaturday = day === 6 ? 0 : -(day + 1);
  const sat = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToSaturday, 0, 0, 0, 0);

  // Mid-week (Tuesday = Saturday + 3) to determine the year the week primarily belongs to
  const mid = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 3);
  const year = mid.getFullYear();

  // Find the first Saturday of this cycle belonging to the target year
  let firstSat = new Date(year, 0, 1, 0, 0, 0, 0);
  const dToSat = firstSat.getDay() === 6 ? 0 : -(firstSat.getDay() + 1);
  firstSat.setDate(firstSat.getDate() + dToSat);
  const firstSatTue = new Date(firstSat.getFullYear(), firstSat.getMonth(), firstSat.getDate() + 3);
  if (firstSatTue.getFullYear() < year) {
    firstSat.setDate(firstSat.getDate() + 7);
  }

  const diffDays = Math.round((sat.getTime() - firstSat.getTime()) / 86400000);
  const weekNo = Math.floor(diffDays / 7) + 1;
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Resolves any weekKey (e.g. canonical sprint weekKey like '2026-W39' or a broken month-week ID like '2026-09-W5' / '2026-10-W1')
 * to its canonical Saturday-to-Friday week key (e.g. '2026-W39').
 */
export function resolveToCanonicalWeekKey(weekKey: string): string {
  if (!weekKey) return '';
  const sprintMatch = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (sprintMatch) {
    return `${sprintMatch[1]}-W${sprintMatch[2].padStart(2, '0')}`;
  }

  const monthWeekMatch = weekKey.match(/^(\d{4})-(\d{1,2})-W(\d+)$/);
  if (monthWeekMatch) {
    const year = parseInt(monthWeekMatch[1], 10);
    const month = parseInt(monthWeekMatch[2], 10) - 1;
    const weekIndex = parseInt(monthWeekMatch[3], 10);
    const weeks = getMonthWeeks(new Date(year, month, 1, 12, 0, 0));
    const found = weeks.find((w) => w.id === weekKey || w.weekIndex === weekIndex);
    if (found) {
      return toWeekKey(found.startDate);
    }
  }

  return weekKey;
}

/**
 * Returns all week keys that overlap with the 7-day sprint of the given date.
 * Includes the main canonical sprint week key (e.g. '2026-W39') as well as any broken month-week slices (e.g. '2026-09-W5', '2026-10-W1').
 */
export function getMatchingWeekKeysForDate(date: Date): string[] {
  const day = date.getDay();
  const diffToSaturday = day === 6 ? 0 : -(day + 1);
  const saturday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToSaturday, 0, 0, 0, 0);

  const mainWeekKey = toWeekKey(saturday);
  const matching = new Set<string>([mainWeekKey]);

  for (let i = 0; i < 7; i++) {
    const cur = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + i, 12, 0, 0);
    const mw = getMonthWeekForDate(cur);
    if (mw) {
      matching.add(mw.id);
    }
  }

  return Array.from(matching);
}

/**
 * Checks if a weekKey represents a broken month-week slice (fewer than 7 days) and returns slice display info if so.
 */
export function getBrokenWeekSliceInfo(weekKey?: string): { isBroken: boolean; label: string; dateRangeStr: string } | null {
  if (!weekKey) return null;
  const match = weekKey.match(/^(\d{4})-(\d{1,2})-W(\d+)$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const weekIndex = parseInt(match[3], 10);
  const weeks = getMonthWeeks(new Date(year, month, 1, 12, 0, 0));
  const found = weeks.find((w) => w.id === weekKey || w.weekIndex === weekIndex);
  if (!found) return null;
  if (found.daysCount < 7) {
    return {
      isBroken: true,
      label: found.shortLabel,
      dateRangeStr: found.dateRangeStr,
    };
  }
  return null;
}

