/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChapterCompletionRecord } from '../../../../types/academic';

export type ChartFilterRange = 'today' | '7days' | 'month' | 'year' | 'lifetime';

/**
 * Format ISO date string to "DD MMM YYYY" (e.g. "09 Oct 2026")
 */
export function formatRecordDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format ISO date string to "hh:mm AM/PM" (e.g. "01:42 AM")
 */
export function formatRecordTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid Time';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Time';
  }
}

/**
 * Converts ISO string to "YYYY-MM-DD" for HTML date input
 */
export function toDateInputValue(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Converts ISO string to "HH:mm" for HTML time input
 */
export function toTimeInputValue(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/**
 * Combines "YYYY-MM-DD" and "HH:mm" local input values into a valid ISO string
 */
export function combineDateAndTime(dateStr: string, timeStr: string, fallbackIso?: string): string {
  try {
    if (!dateStr) return fallbackIso || new Date().toISOString();
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
    const dateObj = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    if (isNaN(dateObj.getTime())) {
      return fallbackIso || new Date().toISOString();
    }
    return dateObj.toISOString();
  } catch {
    return fallbackIso || new Date().toISOString();
  }
}

export interface ChartDataPoint {
  label: string;
  tooltipTitle: string;
  count: number;
  records: ChapterCompletionRecord[];
}

export interface ChartCalculationResult {
  points: ChartDataPoint[];
  totalCompleted: number;
  peakCount: number;
  rangeLabel: string;
  subtitle: string;
}

/**
 * Helper to check if two dates share the exact same calendar day (local time)
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Calculate dynamic line chart data from completion records according to selected filter
 */
export function calculateChartData(
  records: ChapterCompletionRecord[],
  range: ChartFilterRange,
  now: Date = new Date()
): ChartCalculationResult {
  const validRecords = records.filter(r => {
    const d = new Date(r.completedAt);
    return !isNaN(d.getTime());
  });

  if (range === 'today') {
    // 1. TODAY: Filter to today's records and group into 8 intervals (3 hours each)
    const todayRecords = validRecords.filter(r => isSameDay(new Date(r.completedAt), now));

    const intervals = [
      { label: '3 AM', startHour: 0, endHour: 3 },
      { label: '6 AM', startHour: 3, endHour: 6 },
      { label: '9 AM', startHour: 6, endHour: 9 },
      { label: '12 PM', startHour: 9, endHour: 12 },
      { label: '3 PM', startHour: 12, endHour: 15 },
      { label: '6 PM', startHour: 15, endHour: 18 },
      { label: '9 PM', startHour: 18, endHour: 21 },
      { label: '12 AM', startHour: 21, endHour: 24 },
    ];

    const points: ChartDataPoint[] = intervals.map(inv => {
      const matching = todayRecords.filter(r => {
        const h = new Date(r.completedAt).getHours();
        return h >= inv.startHour && h < inv.endHour;
      });
      return {
        label: inv.label,
        tooltipTitle: `Today (${inv.label})`,
        count: matching.length,
        records: matching,
      };
    });

    const totalCompleted = todayRecords.length;
    const peakCount = Math.max(0, ...points.map(p => p.count));

    return {
      points,
      totalCompleted,
      peakCount,
      rangeLabel: 'Today',
      subtitle: `Today's Activity (${formatRecordDate(now.toISOString())})`,
    };
  }

  if (range === '7days') {
    // 2. 7 DAYS: The last 7 days inclusive of today
    const points: ChartDataPoint[] = [];
    const sevenDayRecords: ChapterCompletionRecord[] = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const matching = validRecords.filter(r => isSameDay(new Date(r.completedAt), targetDate));
      sevenDayRecords.push(...matching);

      const dayLabel = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const fullLabel = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      points.push({
        label: dayLabel,
        tooltipTitle: fullLabel,
        count: matching.length,
        records: matching,
      });
    }

    const totalCompleted = sevenDayRecords.length;
    const peakCount = Math.max(0, ...points.map(p => p.count));

    return {
      points,
      totalCompleted,
      peakCount,
      rangeLabel: '7 Days',
      subtitle: 'Past 7 Days Activity',
    };
  }

  if (range === 'month') {
    // 3. MONTH: Current month's days
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthRecords = validRecords.filter(r => {
      const d = new Date(r.completedAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const points: ChartDataPoint[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(currentYear, currentMonth, day);
      const matching = monthRecords.filter(r => isSameDay(new Date(r.completedAt), targetDate));

      const dayLabel = String(day);
      const fullLabel = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      points.push({
        label: dayLabel,
        tooltipTitle: fullLabel,
        count: matching.length,
        records: matching,
      });
    }

    const totalCompleted = monthRecords.length;
    const peakCount = Math.max(0, ...points.map(p => p.count));
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      points,
      totalCompleted,
      peakCount,
      rangeLabel: 'Month',
      subtitle: `${monthName} Activity`,
    };
  }

  if (range === 'year') {
    // 4. YEAR: 12 months of current year
    const currentYear = now.getFullYear();
    const yearRecords = validRecords.filter(r => new Date(r.completedAt).getFullYear() === currentYear);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const points: ChartDataPoint[] = monthNames.map((name, idx) => {
      const matching = yearRecords.filter(r => new Date(r.completedAt).getMonth() === idx);
      return {
        label: name,
        tooltipTitle: `${name} ${currentYear}`,
        count: matching.length,
        records: matching,
      };
    });

    const totalCompleted = yearRecords.length;
    const peakCount = Math.max(0, ...points.map(p => p.count));

    return {
      points,
      totalCompleted,
      peakCount,
      rangeLabel: 'Year',
      subtitle: `${currentYear} Annual Overview`,
    };
  }

  // 5. LIFETIME: All records aggregated by unique completion dates
  const sortedRecords = [...validRecords].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  if (sortedRecords.length === 0) {
    return {
      points: [],
      totalCompleted: 0,
      peakCount: 0,
      rangeLabel: 'Lifetime',
      subtitle: 'All-Time Records',
    };
  }

  // Map by YYYY-MM-DD
  const dateMap = new Map<string, ChapterCompletionRecord[]>();
  sortedRecords.forEach(r => {
    const d = new Date(r.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const list = dateMap.get(key) || [];
    list.push(r);
    dateMap.set(key, list);
  });

  const uniqueDateKeys = Array.from(dateMap.keys()).sort();

  const points: ChartDataPoint[] = uniqueDateKeys.map(key => {
    const [y, m, d] = key.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const matching = dateMap.get(key) || [];
    const dayLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fullLabel = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
      label: dayLabel,
      tooltipTitle: fullLabel,
      count: matching.length,
      records: matching,
    };
  });

  // If there's only 1 point, add a preceding point with 0 to allow line visualization
  if (points.length === 1) {
    const single = points[0];
    const prevPoint: ChartDataPoint = {
      label: 'Prior',
      tooltipTitle: 'Prior to completion',
      count: 0,
      records: [],
    };
    points.unshift(prevPoint);
  }

  const totalCompleted = sortedRecords.length;
  const peakCount = Math.max(0, ...points.map(p => p.count));

  return {
    points,
    totalCompleted,
    peakCount,
    rangeLabel: 'Lifetime',
    subtitle: 'All-Time Records Timeline',
  };
}
