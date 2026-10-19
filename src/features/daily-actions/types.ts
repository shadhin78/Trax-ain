/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DailyActionColor = 
  | 'indigo' 
  | 'emerald' 
  | 'amber' 
  | 'cyan' 
  | 'rose' 
  | 'violet' 
  | 'sky' 
  | 'teal';

export type DailyActionIcon = 
  | 'list' 
  | 'check' 
  | 'flame' 
  | 'target' 
  | 'book' 
  | 'code' 
  | 'dumbbell' 
  | 'brain' 
  | 'sparkles' 
  | 'zap';

export interface MonthlyTarget {
  id: string;
  monthKey: string; // 'YYYY-MM', e.g. '2026-10'
  title: string;
  targetCount: number;
  completedCount: number;
  unitLabel?: string; // 'Chapters', 'Tasks', 'Units'
  track?: string; // Track/Subject label
  isCompleted: boolean;
  createdAt: string;
  notes?: string;
  chapterId?: string; // Linked Chapter ID
  size?: string; // e.g. 'S' | 'M' | 'L' | 'XL'
}

export interface DailyAction {
  id: string;
  title: string;
  description?: string;
  startDate: string; // 'YYYY-MM-DD'
  themeColor: DailyActionColor;
  icon: DailyActionIcon;
  track?: string; // e.g. Subject or custom track
  completedDates: string[]; // List of 'YYYY-MM-DD'
  streak: number;
  bestStreak: number;
  createdAt: string;
  notes?: string;
}

export interface MonthlyPaceStats {
  requiredPace: number;
  actualPace: number;
  estFinish: 'Goal Met' | 'On Track' | 'Behind Pace' | 'Overdue';
  totalTargets: number;
  completedTargets: number;
  totalChaptersTarget: number;
  totalChaptersCompleted: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
}

export interface WeeklyTarget {
  id: string;
  weekKey: string; // 'YYYY-Www', e.g. '2026-W41' or month-week ID '2026-10-W1'
  title: string;
  targetCount: number;
  completedCount: number;
  unitLabel?: string; // 'Chapters', 'Tasks', 'Units'
  track?: string; // Track/Subject label
  isCompleted: boolean;
  createdAt: string;
  notes?: string;
  monthlyTargetId?: string; // Linked monthly target if derived
  chapterId?: string; // Linked Chapter ID
  size?: string; // e.g. 'S' | 'M' | 'L' | 'XL'
}

export interface WeeklyPaceStats {
  requiredPace: number;
  actualPace: number;
  estFinish: 'Goal Met' | 'On Track' | 'Behind Pace' | 'Overdue';
  totalTargets: number;
  completedTargets: number;
  totalChaptersTarget: number;
  totalChaptersCompleted: number;
  daysInWeek: number;
  daysElapsed: number;
  daysRemaining: number;
}
