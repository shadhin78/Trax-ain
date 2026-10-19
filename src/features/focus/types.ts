/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimerMode = 'STOPWATCH' | 'TIMER' | 'ALARM_RANGE';
export type SessionMode = TimerMode | 'ADDED';
export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type TimerPreset = 'FREE' | '15' | '25' | '45' | '60' | 'CUSTOM';

export interface FocusSession {
  id: string;
  createdAt: string; // ISO string
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm
  subject: string;
  durationSeconds: number;
  mode: SessionMode;
  notes?: string;
}

export interface SubjectTarget {
  id: string;
  subject: string;
  targetMinutes: number;
  completedMinutes: number;
  isCompleted: boolean;
  createdAt: string;
  startDate?: string; // YYYY-MM-DD from which sessions should sync
}

export interface ActiveTimerData {
  userId?: string;
  mode: TimerMode;
  status: TimerStatus;
  startTime: number | null;        // Authoritative epoch ms
  accumulatedTime: number;         // Accumulated ms up to pause
  targetDuration: number;          // Target duration in seconds (for timer)
  selectedSubject: string;
  preset: TimerPreset;
  alarmRangeStart?: string;        // "HH:mm"
  alarmRangeEnd?: string;          // "HH:mm"
  updatedAt?: number;              // epoch ms
  clientUpdatedAt?: number;        // Monotonic epoch ms timestamp of the user action
}

export interface FocusTargetHistoryEntry {
  id: string;
  targetHours: number;      // Target duration in hours (e.g., 8, 6, 4)
  effectiveDate: string;    // YYYY-MM-DD
  createdAt: string;        // ISO string
  updatedAt?: string;       // ISO string
  scope?: 'DAILY_FOCUS';    // Scope of target
}

export interface FocusDataPayload {
  activeTimer: ActiveTimerData;
  sessions: FocusSession[];
  targets: SubjectTarget[];
  targetHistory?: FocusTargetHistoryEntry[];
  dailyTargetHours?: number | null;
  updatedAt: string;
}

