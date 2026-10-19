/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RoutineBlock {
  id: string;
  title: string;
  hour: number; // 0 to 23 (represents 1-hour block: hour:00 to hour+1:00)
  category?: string; // e.g. Study, Work, Travel, Health, etc.
  sessionId?: string; // Grouping identifier for user's added slot/session
  sessionStartTime?: string; // Overall start time of the added slot (e.g. 10:00 AM)
  sessionEndTime?: string; // Overall end time of the added slot (e.g. 01:00 PM)
  groupId?: string;
  groupName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  durationHours?: number;
  isDayStart?: boolean;
  trackId?: string;
  trackName?: string;
  programId?: string;
  programName?: string;
  color: string; // Hex color for the block container (e.g. #E11D48)
  notes?: string;
  createdAt: string;
}

export interface RoutineCategoryItem {
  id: string;
  name: string;
  icon: string;
  hours: number;
}

export interface RoutineGroup {
  id: string;
  name: string;
  color: string;
  targetHours?: number;
  categories?: string[];
  categoryDetails?: RoutineCategoryItem[];
  createdAt: string;
}

export interface RoutineCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt?: string;
}

export interface RoutineProfile {
  id: string;
  name: string; // e.g. "ROUTINE 1", "ROUTINE 2", "WEEKDAY"
  blocks: RoutineBlock[];
}

export interface DailyScheduleData {
  routines: RoutineProfile[];
  activeRoutineId: string;
  groups: RoutineGroup[];
  categories?: RoutineCategory[];
  updatedAt: string;
}
