/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PaceBundleType = 'subjects' | 'programs' | 'global';

export type PaceGoalScopeType = 'global' | 'bundle' | 'programs' | 'subjects';

export interface PaceGoal {
  id: string;
  type: PaceGoalScopeType;
  target: string; // Goal Name / Target, e.g. "Phase 1 Target"
  startDate: string; // "YYYY-MM-DD"
  deadline: string; // "YYYY-MM-DD"
  subjects?: string[]; // Array of Subject IDs
  programs?: string[]; // Array of Program IDs
  secondaryPaces?: string[]; // Array of linked PaceGoal IDs
  notes?: string;
  createdAt?: string;
}

export interface GlobalBaseline {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
}

export interface StoredPaceState {
  globalBaseline: GlobalBaseline;
  goals: PaceGoal[];
  activeGoalId: string | null;
  subjectTimeRanges?: Record<string, { startDate: string; deadline: string }>;
}

export interface SubjectWorkloadDetail {
  id: string;
  name: string;
  programId: string;
  programName: string;
  totalChapters: number;
  completedChapters: number;
  remainingChapters: number;
  percentage: number;
  isPassed: boolean;
  reqPace?: number;
  curPace?: number;
}

export interface PaceStats {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  diffDaysTarget: number;
  reqPace: number; // Ch/Day
  curPace: number; // Ch/Day
  daysNeeded: number;
  projectedDate: Date | null;
  projectedFinishStr: string;
  countdownText: string;
  timeElapsedText: string;
  isBehind: boolean;
  status: 'finished' | 'on-track' | 'behind' | 'future' | 'overdue';
  targetedSubjectIds: Set<string>;
  subjectDetails: SubjectWorkloadDetail[];
}

export interface DailyVelocityDataPoint {
  dateStr: string; // "YYYY-MM-DD"
  displayDate: string; // "09 Oct"
  completedCount: number;
  cumulativeCompleted: number;
}
