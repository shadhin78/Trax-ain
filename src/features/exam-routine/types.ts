/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExamSubject {
  id: string;
  sessionId: string;
  subjectId?: string;
  subjectName: string; // e.g. "MI", "IT", "Assurance"
  programId?: string;
  programName?: string;
  examDate: string; // YYYY-MM-DD
  examTime: string; // HH:mm (e.g. "12:00" or "14:30")
  venue?: string; // e.g. "Main Exam Hall"
  targetScore?: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  title: string; // e.g. "CL - NOV"
  programId?: string;
  programName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description?: string;
  subjects: ExamSubject[];
  createdAt: string;
}

export interface ExamRoutineData {
  sessions: ExamSession[];
  pinnedSubjectId?: string; // 'AUTO' or specific subject ID
  updatedAt: string;
}

export type CountdownTier = 'LONG_TERM' | 'MEDIUM_TERM' | 'SHORT_TERM';
export type ExamActiveStatus = 'UPCOMING' | 'LIVE_IN_PROGRESS' | 'ENDED';

export interface CountdownUnit {
  label: string; // e.g. "YEARS", "MONTHS", "DAYS", "HOURS", "MINS", "SECS"
  value: string; // 2-digit padded string
}

export interface TimeRemainingBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isPast: boolean;
  status: ExamActiveStatus;
  tier: CountdownTier;
  units: [CountdownUnit, CountdownUnit, CountdownUnit, CountdownUnit];
  elapsedSinceStartSeconds: number;
  compactString: string; // e.g. "01MO 10D 00H 26M", "10D 00H 26M 14S", "LIVE NOW"
  formattedDateString: string; // e.g. "Sat, 21 Nov 2026 at 12:00 PM"
}
