/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimeSpan {
  id?: string;
  hour?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  durationHours?: number;
}

export function formatHourTo12(hour: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const period = norm >= 12 ? 'PM' : 'AM';
  const displayH = norm % 12 === 0 ? 12 : norm % 12;
  return `${String(displayH).padStart(2, '0')}:00 ${period}`;
}

export function formatMinutesTo12(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const mStr = String(m).padStart(2, '0');
  return `${String(displayH).padStart(2, '0')}:${mStr} ${period}`;
}

export function formatMinutesTo24(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTimeToMinutes(timeStr?: string, defaultHour?: number): number {
  if (timeStr) {
    const trimmed = timeStr.trim();
    // 12-hour format e.g. "04:30 PM" or "4:30 pm"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12 && match12[3]) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    // 24-hour format e.g. "16:30"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }
  }
  if (defaultHour !== undefined) {
    return defaultHour * 60;
  }
  return 0;
}

export function getTimeIntervals(span: TimeSpan): { start: number; end: number }[] {
  let start = parseTimeToMinutes(span.startTime, span.hour);
  let duration = span.durationMinutes;

  if (duration === undefined) {
    if (span.durationHours !== undefined && span.durationHours > 0) {
      duration = Math.round(span.durationHours * 60);
    } else if (span.endTime) {
      let endM = parseTimeToMinutes(span.endTime, span.hour !== undefined ? (span.hour + 1) % 24 : undefined);
      if (endM <= start) endM += 1440;
      duration = endM - start;
    } else {
      duration = 60;
    }
  }

  const end = start + duration;
  if (end <= 1440) {
    return [{ start, end }];
  } else {
    return [
      { start, end: 1440 },
      { start: 0, end: end - 1440 },
    ];
  }
}

export function doTimeSpansOverlap(a: TimeSpan, b: TimeSpan): boolean {
  const intervalsA = getTimeIntervals(a);
  const intervalsB = getTimeIntervals(b);

  for (const ia of intervalsA) {
    for (const ib of intervalsB) {
      if (Math.max(ia.start, ib.start) < Math.min(ia.end, ib.end)) {
        return true;
      }
    }
  }
  return false;
}
