/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { 
  MonthlyTarget, 
  WeeklyTarget,
  DailyAction, 
  MonthlyPaceStats,
  WeeklyPaceStats,
  DailyActionColor,
  DailyActionIcon
} from '../types';

import { updateGlobalAppState, useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { 
  getActiveUserId, 
  recordDeletion, 
  filterDeletedItems 
} from '../../../lib/tombstones';
import { Chapter, ChapterStatus } from '../../../types/academic';
import { 
  resolveTargetChapterId, 
  resolveTargetChapterIds, 
  isChapterCanonicallyComplete, 
  reconcileTargetsWithChapters, 
  syncChapterCompletionAcrossTargets,
  areTargetsLinked
} from '../utils/chapterTargetSync';
import { 
  getMonthWeekForDate, 
  getMonthWeeks, 
  MonthWeekOption, 
  toWeekKey, 
  resolveToCanonicalWeekKey, 
  getMatchingWeekKeysForDate,
  getBrokenWeekSliceInfo
} from '../utils/weekUtils';

export { toWeekKey, resolveToCanonicalWeekKey, getMatchingWeekKeysForDate, getBrokenWeekSliceInfo };

export function getMonthlyTargetsStorageKey(userId?: string | null): string {
  return userId ? `x29_monthly_targets_${userId}` : 'x29_monthly_targets_data';
}

export function getWeeklyTargetsStorageKey(userId?: string | null): string {
  return userId ? `x29_weekly_targets_${userId}` : 'x29_weekly_targets_data';
}

export function getDailyActionsStorageKey(userId?: string | null): string {
  return userId ? `x29_daily_actions_${userId}` : 'x29_daily_actions_data';
}

// Helper: Format Date to YYYY-MM
export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getWeekRangeDetails(date: Date): {
  weekKey: string;
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  formattedRange: string;
  days: { name: string; short: string; dateNum: number; iso: string; isToday: boolean }[];
} {
  const day = date.getDay(); // 0 is Sun, 1 is Mon... 6 is Sat
  const diffToSaturday = day === 6 ? 0 : -(day + 1);
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + diffToSaturday);
  saturday.setHours(0, 0, 0, 0); // Saturday 12:00 AM

  const friday = new Date(saturday);
  friday.setDate(saturday.getDate() + 6);
  friday.setHours(23, 59, 59, 999); // Friday 11:59:59 PM

  const weekKey = toWeekKey(saturday);
  const weekNumber = parseInt(weekKey.split('-W')[1], 10) || 1;
  const year = saturday.getFullYear();

  const startDay = String(saturday.getDate()).padStart(2, '0');
  const startMonth = MONTH_NAMES_SHORT[saturday.getMonth()];
  const startYear = saturday.getFullYear();

  const endDay = String(friday.getDate()).padStart(2, '0');
  const endMonth = MONTH_NAMES_SHORT[friday.getMonth()];
  const endYear = friday.getFullYear();

  const formattedRange = `[ WEEK ${String(weekNumber).padStart(2, '0')} : ${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear} ]`;

  const now = new Date();
  const nowIso = toIsoDate(now);
  const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(saturday);
    cur.setDate(saturday.getDate() + i);
    const iso = toIsoDate(cur);
    days.push({
      name: dayNames[i],
      short: dayNames[i].slice(0, 2),
      dateNum: cur.getDate(),
      iso,
      isToday: iso === nowIso,
    });
  }

  return {
    weekKey,
    weekNumber,
    year,
    startDate: saturday,
    endDate: friday,
    formattedRange,
    days,
  };
}

// Helper: Format Date to YYYY-MM-DD
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const MONTH_NAMES_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const DAY_NAMES = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
];

interface DailyActionsContextType {
  // Month Navigation
  selectedDate: Date;
  selectedMonthKey: string;
  isCurrentMonth: boolean;
  goToPrevMonth: () => void;
  goToCurrentMonth: () => void;
  goToNextMonth: () => void;
  formattedMonthRange: string;
  formattedToday: string;

  // Monthly Targets
  monthlyTargets: MonthlyTarget[];
  currentMonthTargets: MonthlyTarget[];
  monthlyPaceStats: MonthlyPaceStats;
  addMonthlyTarget: (target: Omit<MonthlyTarget, 'id' | 'createdAt' | 'isCompleted' | 'completedCount'> & { targetCount?: number; completedCount?: number; chapterId?: string }) => void;
  allocateMonthlyAndWeeklyBatch: (params: {
    monthKey: string;
    items: Array<{
      chapterId: string;
      title: string;
      track?: string;
      notes?: string;
      weekKey?: string;
      size?: string;
      targetCount?: number;
      completedCount?: number;
    }>;
  }) => void;
  updateMonthlyTarget: (id: string, updates: Partial<MonthlyTarget>) => void;
  deleteMonthlyTarget: (id: string) => void;
  toggleMonthlyTargetComplete: (id: string) => void;
  updateMonthlyTargetProgress: (id: string, completedCount: number) => void;

  // Week Navigation
  selectedWeekDate: Date;
  selectedWeekKey: string;
  isCurrentWeek: boolean;
  goToPrevWeek: () => void;
  goToCurrentWeek: () => void;
  goToNextWeek: () => void;
  formattedWeekRange: string;
  weekDaysInfo: { name: string; short: string; dateNum: number; iso: string; isToday: boolean }[];
  monthWeeks: MonthWeekOption[];
  activeMonthWeek?: MonthWeekOption;
  selectedMonthWeekId: string | null;
  selectMonthWeekById: (weekId: string) => void;

  // Weekly Targets
  weeklyTargets: WeeklyTarget[];
  currentWeekTargets: WeeklyTarget[];
  weeklyPaceStats: WeeklyPaceStats;
  addWeeklyTarget: (target: Omit<WeeklyTarget, 'id' | 'createdAt' | 'isCompleted' | 'completedCount'> & { targetCount?: number; completedCount?: number }) => void;
  bindChapterToWeek: (params: { chapterId: string; weekKey: string; title: string; track?: string; size?: string; notes?: string }) => void;
  unbindChapterFromWeek: (chapterId: string, weekKey?: string) => void;
  updateWeeklyTarget: (id: string, updates: Partial<WeeklyTarget>) => void;
  deleteWeeklyTarget: (id: string) => void;
  toggleWeeklyTargetComplete: (id: string) => void;
  updateWeeklyTargetProgress: (id: string, completedCount: number) => void;
  syncWeeklyFromMonthlyTargets: () => void;

  // Daily Actions
  dailyActions: DailyAction[];
  currentDayIso: string;
  timeUntilMidnightStr: string;
  totalDailyActions: number;
  completedTodayCount: number;
  todayPercentage: number;
  addDailyAction: (action: {
    title: string;
    description?: string;
    startDate?: string;
    themeColor: DailyActionColor;
    icon: DailyActionIcon;
    track?: string;
    notes?: string;
  }) => string;
  updateDailyAction: (id: string, updates: Partial<DailyAction>) => void;
  deleteDailyAction: (id: string) => void;
  toggleDailyActionToday: (id: string) => void;
  toggleDailyActionDate: (id: string, dateStr: string) => void;
}

const DailyActionsContext = createContext<DailyActionsContextType | null>(null);

function loadInitialWeeklyTargets(userId?: string | null): WeeklyTarget[] {
  const effectiveUid = userId !== undefined ? userId : getActiveUserId();
  try {
    const key = getWeeklyTargetsStorageKey(effectiveUid);
    let raw = localStorage.getItem(key);
    if (!raw && effectiveUid) {
      raw = localStorage.getItem('x29_weekly_targets_data');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return filterDeletedItems(parsed, effectiveUid).filter(
          (t: WeeklyTarget) => !t.id.startsWith('wt_init_')
        );
      }
    }
  } catch (err) {
    console.error('Failed to load weekly targets from localStorage:', err);
  }

  return [];
}

function loadInitialMonthlyTargets(userId?: string | null): MonthlyTarget[] {
  const effectiveUid = userId !== undefined ? userId : getActiveUserId();
  try {
    const key = getMonthlyTargetsStorageKey(effectiveUid);
    let raw = localStorage.getItem(key);
    if (!raw && effectiveUid) {
      raw = localStorage.getItem('x29_monthly_targets_data');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return filterDeletedItems(parsed, effectiveUid);
    }
  } catch (err) {
    console.error('Failed to load monthly targets from localStorage:', err);
  }
  return [];
}

function loadInitialDailyActions(userId?: string | null): DailyAction[] {
  const effectiveUid = userId !== undefined ? userId : getActiveUserId();
  try {
    const key = getDailyActionsStorageKey(effectiveUid);
    let raw = localStorage.getItem(key);
    if (!raw && effectiveUid) {
      raw = localStorage.getItem('x29_daily_actions_data');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return filterDeletedItems(parsed, effectiveUid);
    }
  } catch (err) {
    console.error('Failed to load daily actions from localStorage:', err);
  }
  return [];
}

// Helper: calculate streak based on completed dates
export function calculateStreak(completedDates: string[]): { streak: number; bestStreak: number } {
  if (!completedDates.length) return { streak: 0, bestStreak: 0 };
  const dateSet = new Set(completedDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // If today is completed, start from today. If not, check if yesterday was completed.
  const todayIso = toIsoDate(today);
  if (!dateSet.has(todayIso)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dateSet.has(toIsoDate(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Sort all dates to find all-time best streak
  const sortedDates = [...completedDates].sort();
  let best = 0;
  let curConsecutive = 0;
  let prevTime = 0;

  sortedDates.forEach((d) => {
    const time = new Date(d).getTime();
    if (prevTime === 0) {
      curConsecutive = 1;
    } else {
      const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        curConsecutive++;
      } else if (diffDays > 1) {
        curConsecutive = 1;
      }
    }
    prevTime = time;
    if (curConsecutive > best) best = curConsecutive;
  });

  return { streak, bestStreak: Math.max(best, streak) };
}

export const DailyActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => new Date());
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>(() => loadInitialMonthlyTargets(getActiveUserId()));
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>(() => loadInitialWeeklyTargets(getActiveUserId()));
  const [dailyActions, setDailyActions] = useState<DailyAction[]>(() => loadInitialDailyActions(getActiveUserId()));

  // Live Current Day & Midnight Countdown
  const [currentDayIso, setCurrentDayIso] = useState<string>(() => toIsoDate(new Date()));
  const [timeUntilMidnightStr, setTimeUntilMidnightStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const iso = toIsoDate(now);
      if (iso !== currentDayIso) {
        setCurrentDayIso(iso);
      }
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const diffMs = Math.max(0, endOfDay.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilMidnightStr(`${hours}h ${mins}m left`);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [currentDayIso]);

  // Daily Actions Telemetry
  const totalDailyActions = dailyActions.length;
  const completedTodayCount = dailyActions.filter((a) => a.completedDates.includes(currentDayIso)).length;
  const todayPercentage = totalDailyActions > 0 
    ? Math.round((completedTodayCount / totalDailyActions) * 100) 
    : 0;

  const { user, appData, updateAppData, isCloudLoaded } = useAuthSync();
  const { tracks, programs, subjects, chapters, setChapterStatus, setChaptersStatus } = useAcademicHierarchy();

  // Fresh state references to prevent closure staleness and race conditions
  const dailyActionsRef = useRef<DailyAction[]>(dailyActions);
  dailyActionsRef.current = dailyActions;

  const monthlyTargetsRef = useRef<MonthlyTarget[]>(monthlyTargets);
  monthlyTargetsRef.current = monthlyTargets;

  const weeklyTargetsRef = useRef<WeeklyTarget[]>(weeklyTargets);
  weeklyTargetsRef.current = weeklyTargets;

  // Sync state tracking: prevents echo loops, clobbering rapid clicks, and race conditions
  const isLocalDirtyRef = useRef<boolean>(false);
  const cloudSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedJsonRef = useRef<string>('');
  const isHydratedRef = useRef<boolean>(false);
  const isCloudSyncInFlightRef = useRef<boolean>(false);
  const pendingSyncScheduledRef = useRef<boolean>(false);

  // Immediate localStorage persistence: Never lose user clicks on sudden close/refresh
  useEffect(() => {
    try {
      const key = getDailyActionsStorageKey(user?.uid);
      localStorage.setItem(key, JSON.stringify(dailyActions));
    } catch (err) {
      console.error('Failed to write daily actions to localStorage:', err);
    }
    updateGlobalAppState({ dailyActions });
  }, [dailyActions, user?.uid]);

  useEffect(() => {
    try {
      const key = getMonthlyTargetsStorageKey(user?.uid);
      localStorage.setItem(key, JSON.stringify(monthlyTargets));
    } catch (err) {
      console.error('Failed to write monthly targets to localStorage:', err);
    }
    updateGlobalAppState({ monthlyTargets });
  }, [monthlyTargets, user?.uid]);

  useEffect(() => {
    try {
      const key = getWeeklyTargetsStorageKey(user?.uid);
      localStorage.setItem(key, JSON.stringify(weeklyTargets));
    } catch (err) {
      console.error('Failed to write weekly targets to localStorage:', err);
    }
    updateGlobalAppState({ weeklyTargets });
  }, [weeklyTargets, user?.uid]);

  // On user change/auth resolution: hydrate from user-scoped storage
  useEffect(() => {
    if (user) {
      const userActions = loadInitialDailyActions(user.uid);
      const userTargets = loadInitialMonthlyTargets(user.uid);
      const userWeekly = loadInitialWeeklyTargets(user.uid);
      setDailyActions(userActions);
      dailyActionsRef.current = userActions;
      setMonthlyTargets(userTargets);
      monthlyTargetsRef.current = userTargets;
      setWeeklyTargets(userWeekly);
      weeklyTargetsRef.current = userWeekly;
    }
  }, [user]);

  // Cross-Tab Synchronization (Instant updates across open windows on same machine)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const actionsKey = getDailyActionsStorageKey(user?.uid);
      const targetsKey = getMonthlyTargetsStorageKey(user?.uid);
      const weeklyKey = getWeeklyTargetsStorageKey(user?.uid);
      if (e.key === actionsKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setDailyActions(parsed);
            dailyActionsRef.current = parsed;
          }
        } catch {}
      }
      if (e.key === targetsKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMonthlyTargets(parsed);
            monthlyTargetsRef.current = parsed;
          }
        } catch {}
      }
      if (e.key === weeklyKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setWeeklyTargets(parsed);
            weeklyTargetsRef.current = parsed;
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.uid]);

  // Helper to serialize daily actions data consistently for echo-detection
  const serializeSyncPayload = useCallback((
    monthly?: MonthlyTarget[],
    weekly?: WeeklyTarget[],
    daily?: DailyAction[]
  ): string => {
    return JSON.stringify({
      monthlyTargets: monthly || [],
      weeklyTargets: weekly || [],
      dailyActions: daily || [],
    });
  }, []);

  // Schedule Cloud Sync: Debounces rapid clicks so all changes are saved smoothly without dropped clicks
  const scheduleCloudSync = useCallback((immediate: boolean = false) => {
    isLocalDirtyRef.current = true;

    if (cloudSaveTimeoutRef.current) {
      clearTimeout(cloudSaveTimeoutRef.current);
      cloudSaveTimeoutRef.current = null;
    }

    const executeSave = async () => {
      if (!user) {
        isLocalDirtyRef.current = false;
        return;
      }

      // Prevent concurrent write races to Firestore: if a write is in-flight, queue one trailing save
      if (isCloudSyncInFlightRef.current) {
        pendingSyncScheduledRef.current = true;
        return;
      }

      const currentMonthly = monthlyTargetsRef.current;
      const currentWeekly = weeklyTargetsRef.current;
      const currentDaily = dailyActionsRef.current;

      const syncHash = serializeSyncPayload(currentMonthly, currentWeekly, currentDaily);

      // Skip redundant write if cloud already has this identical payload
      if (syncHash === lastSyncedJsonRef.current) {
        isLocalDirtyRef.current = false;
        return;
      }

      isCloudSyncInFlightRef.current = true;
      lastSyncedJsonRef.current = syncHash;

      const payload = {
        monthlyTargets: currentMonthly,
        weeklyTargets: currentWeekly,
        dailyActions: currentDaily,
        lastModified: new Date().toISOString(),
      };

      try {
        await updateAppData({
          customData: {
            dailyActionsData: payload,
          },
        }, { immediate: true, section: 'dailyActions' });
      } catch (err) {
        console.error('Failed to sync daily actions to cloud:', err);
      } finally {
        isCloudSyncInFlightRef.current = false;
        if (syncHash === serializeSyncPayload(monthlyTargetsRef.current, weeklyTargetsRef.current, dailyActionsRef.current)) {
          isLocalDirtyRef.current = false;
        }
        // If mutations happened while saving was in-flight, flush the newest snapshot immediately
        if (pendingSyncScheduledRef.current) {
          pendingSyncScheduledRef.current = false;
          executeSave();
        }
      }
    };

    if (immediate) {
      // 30ms trailing debounce ensures batched calls within the same event cycle combine cleanly
      cloudSaveTimeoutRef.current = setTimeout(executeSave, 30);
    } else {
      cloudSaveTimeoutRef.current = setTimeout(executeSave, 250);
    }
  }, [user, updateAppData, serializeSyncPayload]);

  // ── TWO-WAY CANONICAL CHAPTER STATUS RECONCILIATION ──
  // Whenever canonical chapters change in AcademicHierarchyContext (from Subjects page,
  // Completion Database, remote Firestore sync, or Target views), automatically reconcile targets!
  useEffect(() => {
    if (!chapters.length) return;

    const currentMonthly = monthlyTargetsRef.current;
    const currentWeekly = weeklyTargetsRef.current;

    const { updatedMonthly, updatedWeekly, hasChanges } = reconcileTargetsWithChapters({
      monthlyTargets: currentMonthly,
      weeklyTargets: currentWeekly,
      chapters,
      subjects,
    });

    const effectiveUid = user?.uid || getActiveUserId();
    const sanitizedMonthly = filterDeletedItems(updatedMonthly, effectiveUid);
    const sanitizedWeekly = filterDeletedItems(updatedWeekly, effectiveUid);

    if (hasChanges || sanitizedMonthly.length !== updatedMonthly.length || sanitizedWeekly.length !== updatedWeekly.length) {
      setMonthlyTargets(sanitizedMonthly);
      monthlyTargetsRef.current = sanitizedMonthly;

      setWeeklyTargets(sanitizedWeekly);
      weeklyTargetsRef.current = sanitizedWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(sanitizedMonthly));
        localStorage.setItem('x29_monthly_targets_data', JSON.stringify(sanitizedMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(sanitizedWeekly));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(sanitizedWeekly));
      } catch {}

      updateGlobalAppState({
        monthlyTargets: sanitizedMonthly,
        weeklyTargets: sanitizedWeekly,
      });

      scheduleCloudSync(false);
    }
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  // Incoming Cloud Sync: Seamlessly syncs changes from other devices in real time without refreshing
  useEffect(() => {
    if (!user || !isCloudLoaded) return;

    const remote = appData.customData?.dailyActionsData as {
      monthlyTargets?: MonthlyTarget[];
      weeklyTargets?: WeeklyTarget[];
      dailyActions?: DailyAction[];
      lastModified?: string;
    } | undefined;

    if (!remote) {
      isHydratedRef.current = true;
      return;
    }

    const remoteJson = serializeSyncPayload(
      remote.monthlyTargets,
      remote.weeklyTargets,
      remote.dailyActions
    );

    // 1. ECHO PREVENTION: If the incoming data matches what WE just pushed, ignore it completely!
    if (remoteJson === lastSyncedJsonRef.current) {
      return;
    }

    // 2. ACTIVE USER PROTECTION: If user is actively clicking or has pending local mutations, DO NOT OVERWRITE!
    if (isLocalDirtyRef.current) {
      return;
    }

    isHydratedRef.current = true;
    lastSyncedJsonRef.current = remoteJson;

    // Authoritative incoming cloud data:
    const effectiveUid = user.uid || getActiveUserId();
    if (Array.isArray(remote.dailyActions)) {
      const sanitizedDaily = filterDeletedItems(remote.dailyActions, effectiveUid);
      setDailyActions(sanitizedDaily);
      dailyActionsRef.current = sanitizedDaily;
      try {
        localStorage.setItem(getDailyActionsStorageKey(effectiveUid), JSON.stringify(sanitizedDaily));
        localStorage.setItem('x29_daily_actions_data', JSON.stringify(sanitizedDaily));
      } catch {}
    }

    if (Array.isArray(remote.monthlyTargets)) {
      const sanitizedMonthly = filterDeletedItems(remote.monthlyTargets, effectiveUid);
      const remoteIds = new Set(sanitizedMonthly.map(t => t.id));
      const localPending = filterDeletedItems(monthlyTargetsRef.current, effectiveUid).filter(t => !remoteIds.has(t.id));
      const mergedMonthly = [...sanitizedMonthly, ...localPending];

      setMonthlyTargets(mergedMonthly);
      monthlyTargetsRef.current = mergedMonthly;
      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(mergedMonthly));
        localStorage.setItem('x29_monthly_targets_data', JSON.stringify(mergedMonthly));
      } catch {}
      if (localPending.length > 0) {
        scheduleCloudSync(true);
      }
    }

    if (Array.isArray(remote.weeklyTargets)) {
      const sanitizedWeekly = filterDeletedItems(remote.weeklyTargets, effectiveUid).filter(
        (t: WeeklyTarget) => !t.id.startsWith('wt_init_')
      );
      const remoteIds = new Set(sanitizedWeekly.map(t => t.id));
      const localPending = filterDeletedItems(weeklyTargetsRef.current, effectiveUid).filter(
        (t: WeeklyTarget) => !remoteIds.has(t.id) && !t.id.startsWith('wt_init_')
      );
      const mergedWeekly = [...sanitizedWeekly, ...localPending];

      setWeeklyTargets(mergedWeekly);
      weeklyTargetsRef.current = mergedWeekly;
      try {
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(mergedWeekly));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(mergedWeekly));
      } catch {}
      if (localPending.length > 0) {
        scheduleCloudSync(true);
      }
    }

    updateGlobalAppState({
      dailyActions: remote.dailyActions ? filterDeletedItems(remote.dailyActions, effectiveUid) : [],
      monthlyTargets: remote.monthlyTargets ? filterDeletedItems(remote.monthlyTargets, effectiveUid) : [],
      weeklyTargets: remote.weeklyTargets ? filterDeletedItems(remote.weeklyTargets, effectiveUid) : [],
    });
  }, [appData?.customData?.dailyActionsData, user, isCloudLoaded, scheduleCloudSync]);

  // Selected Month Key
  const selectedMonthKey = useMemo(() => toMonthKey(selectedDate), [selectedDate]);

  // Check if selected is current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth()
    );
  }, [selectedDate]);

  // Month Navigation Handlers
  const goToPrevMonth = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Formatted Range: [ OCTOBER 2026 : 01 OCT 2026 - 31 OCT 2026 ]
  const formattedMonthRange = useMemo(() => {
    const year = selectedDate.getFullYear();
    const monthIdx = selectedDate.getMonth();
    const monthName = MONTH_NAMES[monthIdx];
    const monthShort = MONTH_NAMES_SHORT[monthIdx];
    
    // First day of month
    const firstDay = '01';
    // Last day of month
    const lastDate = new Date(year, monthIdx + 1, 0).getDate();
    const lastDay = String(lastDate).padStart(2, '0');

    return `[ ${monthName} ${year} : ${firstDay} ${monthShort} ${year} - ${lastDay} ${monthShort} ${year} ]`;
  }, [selectedDate]);

  // Formatted Today: TODAY: SATURDAY, 10 OCT 2026
  const formattedToday = useMemo(() => {
    const now = new Date();
    const dayName = DAY_NAMES[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const monthShort = MONTH_NAMES_SHORT[now.getMonth()];
    const year = now.getFullYear();

    return `TODAY: ${dayName}, ${day} ${monthShort} ${year}`;
  }, []);

  // Filter Targets for the active month
  const currentMonthTargets = useMemo(() => {
    return monthlyTargets.filter((t) => t.monthKey === selectedMonthKey);
  }, [monthlyTargets, selectedMonthKey]);

  // Calculate Live Pace Stats for selected month
  const monthlyPaceStats = useMemo<MonthlyPaceStats>(() => {
    const now = new Date();
    const year = selectedDate.getFullYear();
    const monthIdx = selectedDate.getMonth();
    const totalDays = new Date(year, monthIdx + 1, 0).getDate();

    let daysElapsed = 0;
    let daysRemaining = 0;

    const isPast = year < now.getFullYear() || (year === now.getFullYear() && monthIdx < now.getMonth());
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && monthIdx > now.getMonth());

    if (isPast) {
      daysElapsed = totalDays;
      daysRemaining = 0;
    } else if (isFuture) {
      daysElapsed = 0;
      daysRemaining = totalDays;
    } else {
      // Current Month
      daysElapsed = Math.max(1, now.getDate());
      daysRemaining = Math.max(0, totalDays - now.getDate());
    }

    const totalTargets = currentMonthTargets.length;
    const completedTargets = currentMonthTargets.filter((t) => t.isCompleted).length;

    let totalUnitsTarget = 0;
    let totalUnitsCompleted = 0;

    currentMonthTargets.forEach((t) => {
      const targetCount = t.targetCount > 0 ? t.targetCount : 1;
      totalUnitsTarget += targetCount;
      if (t.isCompleted) {
        totalUnitsCompleted += targetCount;
      } else {
        totalUnitsCompleted += Math.min(targetCount, t.completedCount || 0);
      }
    });

    const remainingUnits = Math.max(0, totalUnitsTarget - totalUnitsCompleted);

    // Required Pace = remainingUnits / daysRemaining
    const effectiveDaysRemaining = Math.max(1, daysRemaining);
    const requiredPace = totalTargets === 0 ? 0 : Number((remainingUnits / effectiveDaysRemaining).toFixed(2));

    // Actual Pace = completedUnits / daysElapsed
    const effectiveDaysElapsed = Math.max(1, daysElapsed);
    const actualPace = totalTargets === 0 ? 0 : Number((totalUnitsCompleted / effectiveDaysElapsed).toFixed(2));

    let estFinish: MonthlyPaceStats['estFinish'] = 'Goal Met';
    if (totalTargets === 0 || remainingUnits === 0) {
      estFinish = 'Goal Met';
    } else if (isPast) {
      estFinish = 'Overdue';
    } else if (actualPace >= requiredPace) {
      estFinish = 'On Track';
    } else {
      estFinish = 'Behind Pace';
    }

    return {
      requiredPace,
      actualPace,
      estFinish,
      totalTargets,
      completedTargets,
      totalChaptersTarget: totalUnitsTarget,
      totalChaptersCompleted: totalUnitsCompleted,
      daysInMonth: totalDays,
      daysElapsed,
      daysRemaining,
    };
  }, [selectedDate, currentMonthTargets]);

  // Target Actions
  const addMonthlyTarget = useCallback((targetData: Omit<MonthlyTarget, 'id' | 'createdAt' | 'isCompleted' | 'completedCount'> & { targetCount?: number; completedCount?: number; chapterId?: string }) => {
    let resolvedChapId = targetData.chapterId;
    if (!resolvedChapId) {
      resolvedChapId = resolveTargetChapterId(targetData as any, chapters, subjects);
    }

    let initialCount = Math.max(0, targetData.completedCount || 0);
    let initialCompleted = (targetData.completedCount || 0) >= (targetData.targetCount || 1);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (isChapterCanonicallyComplete(chap)) {
        initialCompleted = true;
        initialCount = Math.max(1, targetData.targetCount || 1);
      }
    } else {
      const multiChapIds = resolveTargetChapterIds(targetData as any, chapters, subjects);
      if (multiChapIds.length > 0) {
        const completedChaps = multiChapIds.filter(cid => {
          const c = chapters.find(ch => ch.id === cid);
          return isChapterCanonicallyComplete(c);
        });
        if (completedChaps.length === multiChapIds.length) {
          initialCompleted = true;
          initialCount = Math.max(multiChapIds.length, targetData.targetCount || multiChapIds.length);
        } else if (completedChaps.length > 0) {
          initialCount = Math.max(initialCount, completedChaps.length);
        }
      }
    }

    const newTarget: MonthlyTarget = {
      id: `mt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      monthKey: targetData.monthKey || selectedMonthKey,
      title: targetData.title.trim(),
      targetCount: Math.max(1, targetData.targetCount || 1),
      completedCount: initialCount,
      unitLabel: targetData.unitLabel || 'Units',
      track: targetData.track?.trim() || undefined,
      chapterId: resolvedChapId || targetData.chapterId,
      isCompleted: initialCompleted,
      createdAt: new Date().toISOString(),
      notes: targetData.notes?.trim() || undefined,
    };
    const effectiveUid = user?.uid || getActiveUserId();
    setMonthlyTargets((prev) => {
      const next = [newTarget, ...prev];
      monthlyTargetsRef.current = next;
      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_monthly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });
    updateGlobalAppState({ monthlyTargets: monthlyTargetsRef.current });
    scheduleCloudSync(true);
  }, [chapters, subjects, selectedMonthKey, scheduleCloudSync, user?.uid]);

  const allocateMonthlyAndWeeklyBatch = useCallback((params: {
    monthKey: string;
    items: Array<{
      chapterId: string;
      title: string;
      track?: string;
      notes?: string;
      weekKey?: string;
      size?: string;
      targetCount?: number;
      completedCount?: number;
    }>;
  }) => {
    const { monthKey, items } = params;
    if (!items || items.length === 0) return;

    const effectiveUid = user?.uid || getActiveUserId();
    const currentMonthly = monthlyTargetsRef.current;
    const currentWeekly = weeklyTargetsRef.current;

    // Track monthly targets map
    const updatedMonthlyMap = new Map<string, MonthlyTarget>();
    currentMonthly.forEach(t => updatedMonthlyMap.set(t.id, t));

    // Map of existing chapterId -> monthly target for this month
    const existingMonthlyByChap = new Map<string, MonthlyTarget>();
    currentMonthly.forEach(t => {
      if (t.monthKey === monthKey) {
        const cid = t.chapterId || resolveTargetChapterId(t, chapters, subjects);
        if (cid) existingMonthlyByChap.set(cid, t);
      }
    });

    // 1. Process Monthly Targets
    items.forEach(item => {
      const chap = chapters.find(c => c.id === item.chapterId);
      const isComplete = isChapterCanonicallyComplete(chap);
      const initialCount = isComplete ? 1 : Math.max(0, item.completedCount || 0);

      const existingMt = existingMonthlyByChap.get(item.chapterId);
      if (existingMt) {
        const updated: MonthlyTarget = {
          ...existingMt,
          notes: item.notes || existingMt.notes,
          track: item.track || existingMt.track,
          isCompleted: isComplete || existingMt.isCompleted,
          completedCount: isComplete ? Math.max(1, existingMt.targetCount) : existingMt.completedCount,
        };
        updatedMonthlyMap.set(existingMt.id, updated);
        existingMonthlyByChap.set(item.chapterId, updated);
      } else {
        const newMt: MonthlyTarget = {
          id: `mt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          monthKey,
          title: item.title.trim(),
          targetCount: Math.max(1, item.targetCount || 1),
          completedCount: initialCount,
          unitLabel: 'Chapters',
          track: item.track?.trim() || undefined,
          chapterId: item.chapterId,
          isCompleted: isComplete,
          createdAt: new Date().toISOString(),
          notes: item.notes?.trim() || undefined,
        };
        updatedMonthlyMap.set(newMt.id, newMt);
        existingMonthlyByChap.set(item.chapterId, newMt);
      }
    });

    const nextMonthly = Array.from(updatedMonthlyMap.values());

    // 2. Process Weekly Targets
    const targetChapIds = new Set(items.map(it => it.chapterId));

    const keptWeekly = currentWeekly.filter(wt => {
      const cid = wt.chapterId || resolveTargetChapterId(wt, chapters, subjects);
      if (cid && targetChapIds.has(cid)) {
        // If this target is being re-allocated or removed from weekly, delete old record
        recordDeletion(wt.id, 'weeklyTarget', effectiveUid);
        return false;
      }
      return true;
    });

    const newWeeklyTargets: WeeklyTarget[] = [];
    items.forEach(item => {
      if (!item.weekKey) return; // Stays monthly only

      const chap = chapters.find(c => c.id === item.chapterId);
      const isComplete = isChapterCanonicallyComplete(chap);
      const initialCount = isComplete ? 1 : Math.max(0, item.completedCount || 0);
      const linkedMt = existingMonthlyByChap.get(item.chapterId);

      const newWt: WeeklyTarget = {
        id: `wt_ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        weekKey: item.weekKey,
        title: item.title.trim(),
        targetCount: 1,
        completedCount: initialCount,
        unitLabel: 'Chapters',
        track: item.track?.trim() || undefined,
        size: item.size || 'M',
        chapterId: item.chapterId,
        isCompleted: isComplete,
        createdAt: new Date().toISOString(),
        notes: item.notes?.trim() || undefined,
        monthlyTargetId: linkedMt?.id,
      };
      newWeeklyTargets.push(newWt);
    });

    const nextWeekly = [...newWeeklyTargets, ...keptWeekly];

    // 3. Commit state synchronously
    monthlyTargetsRef.current = nextMonthly;
    setMonthlyTargets(nextMonthly);

    weeklyTargetsRef.current = nextWeekly;
    setWeeklyTargets(nextWeekly);

    // 4. Synchronously write to all localStorage keys
    try {
      localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(nextMonthly));
      localStorage.setItem('x29_monthly_targets_data', JSON.stringify(nextMonthly));
      localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(nextWeekly));
      localStorage.setItem('x29_weekly_targets_data', JSON.stringify(nextWeekly));
    } catch (e) {
      console.warn('Failed to save allocated targets to localStorage:', e);
    }

    // 5. Update global app state
    updateGlobalAppState({
      monthlyTargets: nextMonthly,
      weeklyTargets: nextWeekly,
    });

    // 6. Schedule cloud sync once
    scheduleCloudSync(true);
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  const updateMonthlyTarget = useCallback((id: string, updates: Partial<MonthlyTarget>) => {
    setMonthlyTargets((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        if (updated.completedCount >= updated.targetCount) {
          updated.isCompleted = true;
        }
        return updated;
      });
      monthlyTargetsRef.current = next;
      return next;
    });
    scheduleCloudSync();
  }, [scheduleCloudSync]);

  const deleteMonthlyTarget = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'monthlyTarget', effectiveUid);

    const targetToDelete = monthlyTargetsRef.current.find(t => t.id === id);

    // 1. Delete from Monthly Targets
    setMonthlyTargets((prev) => {
      const next = prev.filter((t) => t.id !== id);
      monthlyTargetsRef.current = next;
      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_monthly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Also delete from Weekly Targets (two-way delete sync)
    if (targetToDelete) {
      setWeeklyTargets((prev) => {
        const next = prev.filter((wt) => {
          if (areTargetsLinked(targetToDelete, wt, chapters, subjects)) {
            recordDeletion(wt.id, 'weeklyTarget', effectiveUid);
            return false;
          }
          return true;
        });
        weeklyTargetsRef.current = next;
        try {
          localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(next));
          localStorage.setItem('x29_weekly_targets_data', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    updateGlobalAppState({
      monthlyTargets: monthlyTargetsRef.current,
      weeklyTargets: weeklyTargetsRef.current,
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  const toggleMonthlyTargetComplete = useCallback((id: string) => {
    const target = monthlyTargetsRef.current.find(t => t.id === id);
    if (!target) return;

    // Resolve chapter ID
    const resolvedChapId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (chap && (chap.isSkipped || chap.status === 'skipped')) {
        // Skipped chapters cannot be completed
        return;
      }

      // Determine next status
      const currentlyComplete = isChapterCanonicallyComplete(chap);
      const willComplete = !currentlyComplete;

      // 1. Update canonical chapter in AcademicHierarchyContext
      setChapterStatus(resolvedChapId, willComplete ? 'completed' : 'pending');

      // 2. Synchronize all monthly & weekly targets referencing this chapter
      const { nextMonthly, nextWeekly } = syncChapterCompletionAcrossTargets({
        chapterId: resolvedChapId,
        isCompleted: willComplete,
        monthlyTargets: monthlyTargetsRef.current,
        weeklyTargets: weeklyTargetsRef.current,
        chapters,
        subjects,
      });

      setMonthlyTargets(nextMonthly);
      monthlyTargetsRef.current = nextMonthly;
      setWeeklyTargets(nextWeekly);
      weeklyTargetsRef.current = nextWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(nextMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(nextWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    // Check if multi-chapter target (e.g. Whole Subject or range)
    const multiChapIds = resolveTargetChapterIds(target, chapters, subjects);
    if (multiChapIds.length > 0) {
      const willComplete = !target.isCompleted;

      // Update non-skipped chapters atomically in a single batch
      const eligibleIds = multiChapIds.filter(cid => {
        const c = chapters.find(ch => ch.id === cid);
        return c && !c.isSkipped && c.status !== 'skipped';
      });

      if (eligibleIds.length > 0) {
        setChaptersStatus(eligibleIds, willComplete ? 'completed' : 'pending');
      }

      // Synchronize targets
      const updatedChapters = chapters.map(c =>
        eligibleIds.includes(c.id)
          ? { ...c, completed: willComplete, status: (willComplete ? 'completed' : 'pending') as Chapter['status'] }
          : c
      );

      const reconciled = reconcileTargetsWithChapters({
        monthlyTargets: monthlyTargetsRef.current,
        weeklyTargets: weeklyTargetsRef.current,
        chapters: updatedChapters,
        subjects,
      });

      setMonthlyTargets(reconciled.updatedMonthly);
      monthlyTargetsRef.current = reconciled.updatedMonthly;
      setWeeklyTargets(reconciled.updatedWeekly);
      weeklyTargetsRef.current = reconciled.updatedWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(reconciled.updatedMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(reconciled.updatedWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    // Standard non-academic target
    const willComplete = !target.isCompleted;
    setMonthlyTargets(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          isCompleted: willComplete,
          completedCount: willComplete ? t.targetCount : 0,
        };
      });
      monthlyTargetsRef.current = next;
      return next;
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, setChapterStatus, setChaptersStatus, scheduleCloudSync, user?.uid]);

  const updateMonthlyTargetProgress = useCallback((id: string, completedCount: number) => {
    const target = monthlyTargetsRef.current.find(t => t.id === id);
    if (!target) return;

    const safeCount = Math.max(0, Math.min(target.targetCount, completedCount));
    const isComplete = safeCount >= target.targetCount;
    const resolvedChapId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (chap && (chap.isSkipped || chap.status === 'skipped')) return;

      setChapterStatus(resolvedChapId, isComplete ? 'completed' : 'pending');

      const { nextMonthly, nextWeekly } = syncChapterCompletionAcrossTargets({
        chapterId: resolvedChapId,
        isCompleted: isComplete,
        monthlyTargets: monthlyTargetsRef.current.map(t => t.id === id ? { ...t, completedCount: safeCount, isCompleted: isComplete } : t),
        weeklyTargets: weeklyTargetsRef.current,
        chapters,
        subjects,
      });

      setMonthlyTargets(nextMonthly);
      monthlyTargetsRef.current = nextMonthly;
      setWeeklyTargets(nextWeekly);
      weeklyTargetsRef.current = nextWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(nextMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(nextWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    setMonthlyTargets(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          completedCount: safeCount,
          isCompleted: isComplete,
        };
      });
      monthlyTargetsRef.current = next;
      return next;
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, setChapterStatus, scheduleCloudSync, user?.uid]);

  // ── WEEK NAVIGATION & PACING ──
  const weekDetails = useMemo(() => getWeekRangeDetails(selectedWeekDate), [selectedWeekDate]);
  const selectedWeekKey = weekDetails.weekKey;
  const formattedWeekRange = weekDetails.formattedRange;
  const weekDaysInfo = weekDetails.days;

  const isCurrentWeek = useMemo(() => {
    const nowWeekKey = toWeekKey(new Date());
    return nowWeekKey === selectedWeekKey;
  }, [selectedWeekKey]);

  const goToPrevWeek = useCallback(() => {
    setSelectedWeekDate((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setSelectedWeekDate(new Date());
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedWeekDate((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  }, []);

  const monthWeeks = useMemo(() => getMonthWeeks(selectedDate), [selectedDate]);
  const [selectedMonthWeekId, setSelectedMonthWeekId] = useState<string | null>(null);

  const activeMonthWeek = useMemo(() => {
    if (selectedMonthWeekId) {
      const match = monthWeeks.find((w) => w.id === selectedMonthWeekId);
      if (match) return match;
    }
    return getMonthWeekForDate(selectedWeekDate);
  }, [selectedWeekDate, selectedMonthWeekId, monthWeeks]);

  const selectMonthWeekById = useCallback((weekId: string) => {
    setSelectedMonthWeekId(weekId);
    const targetOption = monthWeeks.find((w) => w.id === weekId);
    if (targetOption) {
      setSelectedWeekDate(targetOption.startDate);
    }
  }, [monthWeeks]);

  // Set of all matching week keys for the active 7-day sprint:
  // includes canonical weekKey (e.g. '2026-W39') plus any broken month-week slices (e.g. '2026-09-W5' [Sep 26 - Sep 30] & '2026-10-W1' [Oct 01 - Oct 02])
  const activeWeekKeysSet = useMemo(() => {
    return new Set(getMatchingWeekKeysForDate(selectedWeekDate));
  }, [selectedWeekDate]);

  // Filter Targets for the active week
  const currentWeekTargets = useMemo(() => {
    return weeklyTargets.filter((t) => {
      if (!t.weekKey) return false;

      // 1. Direct match with any week slice in the active 7-day sprint
      if (activeWeekKeysSet.has(t.weekKey)) return true;

      // 2. Canonical resolution (resolves '2026-09-W5' or '2026-10-W1' to '2026-W39')
      const canonical = resolveToCanonicalWeekKey(t.weekKey);
      if (canonical === selectedWeekKey) return true;

      // 3. Fallback: manual sub-selection if active
      if (selectedMonthWeekId && t.weekKey === selectedMonthWeekId) return true;
      if (activeMonthWeek && t.weekKey === activeMonthWeek.id) return true;

      return false;
    });
  }, [weeklyTargets, activeWeekKeysSet, selectedWeekKey, activeMonthWeek, selectedMonthWeekId]);

  // Calculate Live Pace Stats for selected week
  const weeklyPaceStats = useMemo<WeeklyPaceStats>(() => {
    const now = new Date();
    const nowWeekKey = toWeekKey(now);
    const isPast = selectedWeekKey < nowWeekKey;
    const isFuture = selectedWeekKey > nowWeekKey;

    let daysElapsed = 0;
    let daysRemaining = 0;

    if (isPast) {
      daysElapsed = 7;
      daysRemaining = 0;
    } else if (isFuture) {
      daysElapsed = 0;
      daysRemaining = 7;
    } else {
      // Current week: Saturday is day 1, Sunday is day 2, ..., Friday is day 7
      const day = now.getDay();
      const dayNum = day === 6 ? 1 : day + 2;
      daysElapsed = Math.max(1, dayNum);
      daysRemaining = Math.max(0, 7 - dayNum);
    }

    const totalTargets = currentWeekTargets.length;
    const completedTargets = currentWeekTargets.filter((t) => t.isCompleted).length;

    let totalUnitsTarget = 0;
    let totalUnitsCompleted = 0;

    currentWeekTargets.forEach((t) => {
      const targetCount = t.targetCount > 0 ? t.targetCount : 1;
      totalUnitsTarget += targetCount;
      if (t.isCompleted) {
        totalUnitsCompleted += targetCount;
      } else {
        totalUnitsCompleted += Math.min(targetCount, t.completedCount || 0);
      }
    });

    const remainingUnits = Math.max(0, totalUnitsTarget - totalUnitsCompleted);
    const effectiveDaysRemaining = Math.max(1, daysRemaining);
    const requiredPace = totalTargets === 0 ? 0 : Number((remainingUnits / effectiveDaysRemaining).toFixed(2));
    const effectiveDaysElapsed = Math.max(1, daysElapsed);
    const actualPace = totalTargets === 0 ? 0 : Number((totalUnitsCompleted / effectiveDaysElapsed).toFixed(2));

    let estFinish: WeeklyPaceStats['estFinish'] = 'Goal Met';
    if (totalTargets === 0 || remainingUnits === 0) {
      estFinish = 'Goal Met';
    } else if (isPast) {
      estFinish = 'Overdue';
    } else if (actualPace >= requiredPace) {
      estFinish = 'On Track';
    } else {
      estFinish = 'Behind Pace';
    }

    return {
      requiredPace,
      actualPace,
      estFinish,
      totalTargets,
      completedTargets,
      totalChaptersTarget: totalUnitsTarget,
      totalChaptersCompleted: totalUnitsCompleted,
      daysInWeek: 7,
      daysElapsed,
      daysRemaining,
    };
  }, [selectedWeekKey, currentWeekTargets]);

  const addWeeklyTarget = useCallback((targetData: Omit<WeeklyTarget, 'id' | 'createdAt' | 'isCompleted' | 'completedCount'> & { targetCount?: number; completedCount?: number }) => {
    let resolvedChapId = targetData.chapterId;
    if (!resolvedChapId) {
      resolvedChapId = resolveTargetChapterId(targetData as any, chapters, subjects);
    }

    let initialCount = Math.max(0, targetData.completedCount || 0);
    let initialCompleted = (targetData.completedCount || 0) >= (targetData.targetCount || 1);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (isChapterCanonicallyComplete(chap)) {
        initialCompleted = true;
        initialCount = Math.max(1, targetData.targetCount || 1);
      }
    } else {
      const multiChapIds = resolveTargetChapterIds(targetData as any, chapters, subjects);
      if (multiChapIds.length > 0) {
        const completedChaps = multiChapIds.filter(cid => {
          const c = chapters.find(ch => ch.id === cid);
          return isChapterCanonicallyComplete(c);
        });
        if (completedChaps.length === multiChapIds.length) {
          initialCompleted = true;
          initialCount = Math.max(multiChapIds.length, targetData.targetCount || multiChapIds.length);
        } else if (completedChaps.length > 0) {
          initialCount = Math.max(initialCount, completedChaps.length);
        }
      }
    }

    const newTarget: WeeklyTarget = {
      id: `wt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      weekKey: targetData.weekKey || selectedWeekKey,
      title: targetData.title.trim(),
      targetCount: Math.max(1, targetData.targetCount || 1),
      completedCount: initialCount,
      unitLabel: targetData.unitLabel || 'Chapters',
      track: targetData.track?.trim() || undefined,
      isCompleted: initialCompleted,
      createdAt: new Date().toISOString(),
      notes: targetData.notes?.trim() || undefined,
      monthlyTargetId: targetData.monthlyTargetId,
      chapterId: resolvedChapId || targetData.chapterId,
      size: targetData.size,
    };
    const effectiveUid = user?.uid || getActiveUserId();
    setWeeklyTargets((prev) => {
      const next = [newTarget, ...prev];
      weeklyTargetsRef.current = next;
      try {
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });
    updateGlobalAppState({ weeklyTargets: weeklyTargetsRef.current });
    scheduleCloudSync(true);
  }, [chapters, subjects, selectedWeekKey, scheduleCloudSync, user?.uid]);

  const bindChapterToWeek = useCallback((params: {
    chapterId: string;
    weekKey: string;
    title: string;
    track?: string;
    size?: string;
    notes?: string;
  }) => {
    const effectiveUid = user?.uid || getActiveUserId();
    const chap = chapters.find(c => c.id === params.chapterId);
    const isComplete = isChapterCanonicallyComplete(chap);

    setWeeklyTargets((prev) => {
      // Remove any existing binding for this chapter so switching weeks cleanly replaces it
      const withoutExisting = prev.filter(t => {
        if (t.chapterId === params.chapterId || resolveTargetChapterId(t, chapters, subjects) === params.chapterId) {
          recordDeletion(t.id, 'weeklyTarget', effectiveUid);
          return false;
        }
        return true;
      });
      const newTarget: WeeklyTarget = {
        id: `wt_ch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        weekKey: params.weekKey,
        title: params.title.trim(),
        targetCount: 1,
        completedCount: isComplete ? 1 : 0,
        unitLabel: 'Chapters',
        track: params.track?.trim() || undefined,
        size: params.size || 'M',
        chapterId: params.chapterId,
        isCompleted: isComplete,
        createdAt: new Date().toISOString(),
        notes: params.notes?.trim() || undefined,
      };
      const next = [newTarget, ...withoutExisting];
      weeklyTargetsRef.current = next;
      try {
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });
    updateGlobalAppState({ weeklyTargets: weeklyTargetsRef.current });
    scheduleCloudSync(true);
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  const unbindChapterFromWeek = useCallback((chapterId: string, weekKey?: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    setWeeklyTargets((prev) => {
      const next = prev.filter(t => {
        const matches = t.chapterId === chapterId || resolveTargetChapterId(t, chapters, subjects) === chapterId;
        if (!matches) return true;
        if (weekKey && t.weekKey !== weekKey) return true;
        recordDeletion(t.id, 'weeklyTarget', effectiveUid);
        return false;
      });
      weeklyTargetsRef.current = next;
      try {
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });
    updateGlobalAppState({ weeklyTargets: weeklyTargetsRef.current });
    scheduleCloudSync(true);
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  const updateWeeklyTarget = useCallback((id: string, updates: Partial<WeeklyTarget>) => {
    setWeeklyTargets((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        if (updated.completedCount >= updated.targetCount) {
          updated.isCompleted = true;
        }
        return updated;
      });
      weeklyTargetsRef.current = next;
      return next;
    });
    scheduleCloudSync();
  }, [scheduleCloudSync]);

  const deleteWeeklyTarget = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'weeklyTarget', effectiveUid);

    const targetToDelete = weeklyTargetsRef.current.find(t => t.id === id);

    // 1. Delete from Weekly Targets
    setWeeklyTargets((prev) => {
      const next = prev.filter((t) => t.id !== id);
      weeklyTargetsRef.current = next;
      try {
        localStorage.setItem(getWeeklyTargetsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_weekly_targets_data', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Also delete from Monthly Targets (two-way delete sync via areTargetsLinked)
    if (targetToDelete) {
      setMonthlyTargets((prev) => {
        const next = prev.filter((mt) => {
          if (areTargetsLinked(targetToDelete, mt, chapters, subjects)) {
            recordDeletion(mt.id, 'monthlyTarget', effectiveUid);
            return false;
          }
          return true;
        });
        monthlyTargetsRef.current = next;
        try {
          localStorage.setItem(getMonthlyTargetsStorageKey(effectiveUid), JSON.stringify(next));
          localStorage.setItem('x29_monthly_targets_data', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    updateGlobalAppState({
      monthlyTargets: monthlyTargetsRef.current,
      weeklyTargets: weeklyTargetsRef.current,
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, user?.uid, scheduleCloudSync]);

  const toggleWeeklyTargetComplete = useCallback((id: string) => {
    const target = weeklyTargetsRef.current.find(t => t.id === id);
    if (!target) return;

    // Resolve chapter ID
    const resolvedChapId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (chap && (chap.isSkipped || chap.status === 'skipped')) {
        // Skipped chapters cannot be completed
        return;
      }

      // Determine next status
      const currentlyComplete = isChapterCanonicallyComplete(chap);
      const willComplete = !currentlyComplete;

      // 1. Update canonical chapter in AcademicHierarchyContext
      setChapterStatus(resolvedChapId, willComplete ? 'completed' : 'pending');

      // 2. Synchronize all monthly & weekly targets referencing this chapter
      const { nextMonthly, nextWeekly } = syncChapterCompletionAcrossTargets({
        chapterId: resolvedChapId,
        isCompleted: willComplete,
        monthlyTargets: monthlyTargetsRef.current,
        weeklyTargets: weeklyTargetsRef.current,
        chapters,
        subjects,
      });

      setMonthlyTargets(nextMonthly);
      monthlyTargetsRef.current = nextMonthly;
      setWeeklyTargets(nextWeekly);
      weeklyTargetsRef.current = nextWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(nextMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(nextWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    // Check if multi-chapter target
    const multiChapIds = resolveTargetChapterIds(target, chapters, subjects);
    if (multiChapIds.length > 0) {
      const willComplete = !target.isCompleted;

      // Update non-skipped chapters atomically in a single batch
      const eligibleIds = multiChapIds.filter(cid => {
        const c = chapters.find(ch => ch.id === cid);
        return c && !c.isSkipped && c.status !== 'skipped';
      });

      if (eligibleIds.length > 0) {
        setChaptersStatus(eligibleIds, willComplete ? 'completed' : 'pending');
      }

      const updatedChapters = chapters.map(c =>
        eligibleIds.includes(c.id)
          ? { ...c, completed: willComplete, status: (willComplete ? 'completed' : 'pending') as Chapter['status'] }
          : c
      );

      const reconciled = reconcileTargetsWithChapters({
        monthlyTargets: monthlyTargetsRef.current,
        weeklyTargets: weeklyTargetsRef.current,
        chapters: updatedChapters,
        subjects,
      });

      setMonthlyTargets(reconciled.updatedMonthly);
      monthlyTargetsRef.current = reconciled.updatedMonthly;
      setWeeklyTargets(reconciled.updatedWeekly);
      weeklyTargetsRef.current = reconciled.updatedWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(reconciled.updatedMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(reconciled.updatedWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    // Standard non-academic target
    const willComplete = !target.isCompleted;
    setWeeklyTargets(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          isCompleted: willComplete,
          completedCount: willComplete ? t.targetCount : 0,
        };
      });
      weeklyTargetsRef.current = next;
      return next;
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, setChapterStatus, setChaptersStatus, scheduleCloudSync, user?.uid]);

  const updateWeeklyTargetProgress = useCallback((id: string, completedCount: number) => {
    const target = weeklyTargetsRef.current.find(t => t.id === id);
    if (!target) return;

    const safeCount = Math.max(0, Math.min(target.targetCount, completedCount));
    const isComplete = safeCount >= target.targetCount;
    const resolvedChapId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedChapId) {
      const chap = chapters.find(c => c.id === resolvedChapId);
      if (chap && (chap.isSkipped || chap.status === 'skipped')) return;

      setChapterStatus(resolvedChapId, isComplete ? 'completed' : 'pending');

      const { nextMonthly, nextWeekly } = syncChapterCompletionAcrossTargets({
        chapterId: resolvedChapId,
        isCompleted: isComplete,
        monthlyTargets: monthlyTargetsRef.current,
        weeklyTargets: weeklyTargetsRef.current.map(t => t.id === id ? { ...t, completedCount: safeCount, isCompleted: isComplete } : t),
        chapters,
        subjects,
      });

      setMonthlyTargets(nextMonthly);
      monthlyTargetsRef.current = nextMonthly;
      setWeeklyTargets(nextWeekly);
      weeklyTargetsRef.current = nextWeekly;

      try {
        localStorage.setItem(getMonthlyTargetsStorageKey(user?.uid), JSON.stringify(nextMonthly));
        localStorage.setItem(getWeeklyTargetsStorageKey(user?.uid), JSON.stringify(nextWeekly));
      } catch {}

      scheduleCloudSync(true);
      return;
    }

    setWeeklyTargets(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          completedCount: safeCount,
          isCompleted: isComplete,
        };
      });
      weeklyTargetsRef.current = next;
      return next;
    });

    scheduleCloudSync(true);
  }, [chapters, subjects, setChapterStatus, scheduleCloudSync, user?.uid]);

  const syncWeeklyFromMonthlyTargets = useCallback(() => {
    if (!currentMonthTargets.length) {
      const starters: WeeklyTarget[] = [
        {
          id: `wt_${Date.now()}_1`,
          weekKey: selectedWeekKey,
          title: 'High-Priority Chapter Study',
          targetCount: 4,
          completedCount: 1,
          unitLabel: 'Chapters',
          track: 'Core Program',
          isCompleted: false,
          createdAt: new Date().toISOString(),
          notes: 'Target 1 chapter every 2 days this week',
        },
        {
          id: `wt_${Date.now()}_2`,
          weekKey: selectedWeekKey,
          title: 'Weekly Practice & Problem Set',
          targetCount: 20,
          completedCount: 8,
          unitLabel: 'Problems',
          track: 'Practice Quota',
          isCompleted: false,
          createdAt: new Date().toISOString(),
          notes: 'Weekly problem set milestone',
        },
      ];
      setWeeklyTargets((prev) => {
        const next = [...starters, ...prev];
        weeklyTargetsRef.current = next;
        return next;
      });
      scheduleCloudSync(true);
      return;
    }

    const newSlices: WeeklyTarget[] = currentMonthTargets.map((mTarget, idx) => {
      const weekShare = Math.max(1, Math.round(mTarget.targetCount / 4));
      return {
        id: `wt_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        weekKey: selectedWeekKey,
        title: `${mTarget.title} (Week Milestone)`,
        targetCount: weekShare,
        completedCount: 0,
        unitLabel: mTarget.unitLabel || 'Chapters',
        track: mTarget.track,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        notes: `1/4th allocation of monthly goal (${mTarget.targetCount} ${mTarget.unitLabel || 'Chapters'})`,
        monthlyTargetId: mTarget.id,
      };
    });

    setWeeklyTargets((prev) => {
      const filteredPrev = prev.filter((t) => t.weekKey !== selectedWeekKey);
      const next = [...newSlices, ...filteredPrev];
      weeklyTargetsRef.current = next;
      return next;
    });
    scheduleCloudSync(true);
  }, [currentMonthTargets, selectedWeekKey, scheduleCloudSync]);

  // Daily Action Actions
  const addDailyAction = useCallback((actionData: {
    title: string;
    description?: string;
    startDate?: string;
    themeColor: DailyActionColor;
    icon: DailyActionIcon;
    track?: string;
    notes?: string;
  }) => {
    const id = `da_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const todayIso = toIsoDate(new Date());
    const newAction: DailyAction = {
      id,
      title: actionData.title.trim(),
      description: actionData.description?.trim() || undefined,
      startDate: actionData.startDate || todayIso,
      themeColor: actionData.themeColor || 'indigo',
      icon: actionData.icon || 'list',
      track: actionData.track && actionData.track !== '-- No Track (Optional) --' ? actionData.track.trim() : undefined,
      completedDates: [],
      streak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString(),
      notes: actionData.notes?.trim() || undefined,
    };

    setDailyActions((prev) => {
      const next = [newAction, ...prev];
      dailyActionsRef.current = next;
      return next;
    });
    scheduleCloudSync(true);
    return id;
  }, [scheduleCloudSync]);

  const updateDailyAction = useCallback((id: string, updates: Partial<DailyAction>) => {
    setDailyActions((prev) => {
      const next = prev.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, ...updates };
        if (updates.completedDates) {
          const { streak, bestStreak } = calculateStreak(updates.completedDates);
          updated.streak = streak;
          updated.bestStreak = Math.max(updated.bestStreak, bestStreak);
        }
        return updated;
      });
      dailyActionsRef.current = next;
      return next;
    });
    scheduleCloudSync();
  }, [scheduleCloudSync]);

  const deleteDailyAction = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'dailyAction', effectiveUid);

    setDailyActions((prev) => {
      const next = prev.filter((a) => a.id !== id);
      dailyActionsRef.current = next;
      try {
        localStorage.setItem(getDailyActionsStorageKey(effectiveUid), JSON.stringify(next));
        localStorage.setItem('x29_daily_actions_data', JSON.stringify(next));
      } catch {}
      return next;
    });
    scheduleCloudSync(true);
  }, [scheduleCloudSync, user?.uid]);

  const toggleDailyActionDate = useCallback((id: string, dateStr: string) => {
    setDailyActions((prev) => {
      const next = prev.map((a) => {
        if (a.id !== id) return a;
        const hasDate = a.completedDates.includes(dateStr);
        const newDates = hasDate
          ? a.completedDates.filter((d) => d !== dateStr)
          : [...a.completedDates, dateStr];

        const { streak, bestStreak } = calculateStreak(newDates);
        return {
          ...a,
          completedDates: newDates,
          streak,
          bestStreak: Math.max(a.bestStreak, bestStreak),
        };
      });
      dailyActionsRef.current = next;
      return next;
    });
    scheduleCloudSync(true);
  }, [scheduleCloudSync]);

  const toggleDailyActionToday = useCallback((id: string) => {
    toggleDailyActionDate(id, currentDayIso);
  }, [toggleDailyActionDate, currentDayIso]);

  const value = useMemo(
    () => ({
      selectedDate,
      selectedMonthKey,
      isCurrentMonth,
      goToPrevMonth,
      goToCurrentMonth,
      goToNextMonth,
      formattedMonthRange,
      formattedToday,
      monthlyTargets,
      currentMonthTargets,
      monthlyPaceStats,
      addMonthlyTarget,
      allocateMonthlyAndWeeklyBatch,
      updateMonthlyTarget,
      deleteMonthlyTarget,
      toggleMonthlyTargetComplete,
      updateMonthlyTargetProgress,
      selectedWeekDate,
      selectedWeekKey,
      isCurrentWeek,
      goToPrevWeek,
      goToCurrentWeek,
      goToNextWeek,
      formattedWeekRange,
      weekDaysInfo,
      monthWeeks,
      activeMonthWeek,
      selectedMonthWeekId,
      selectMonthWeekById,
      weeklyTargets,
      currentWeekTargets,
      weeklyPaceStats,
      addWeeklyTarget,
      bindChapterToWeek,
      unbindChapterFromWeek,
      updateWeeklyTarget,
      deleteWeeklyTarget,
      toggleWeeklyTargetComplete,
      updateWeeklyTargetProgress,
      syncWeeklyFromMonthlyTargets,
      dailyActions,
      currentDayIso,
      timeUntilMidnightStr,
      totalDailyActions,
      completedTodayCount,
      todayPercentage,
      addDailyAction,
      updateDailyAction,
      deleteDailyAction,
      toggleDailyActionToday,
      toggleDailyActionDate,
    }),
    [
      selectedDate,
      selectedMonthKey,
      isCurrentMonth,
      goToPrevMonth,
      goToCurrentMonth,
      goToNextMonth,
      formattedMonthRange,
      formattedToday,
      monthlyTargets,
      currentMonthTargets,
      monthlyPaceStats,
      addMonthlyTarget,
      allocateMonthlyAndWeeklyBatch,
      updateMonthlyTarget,
      deleteMonthlyTarget,
      toggleMonthlyTargetComplete,
      updateMonthlyTargetProgress,
      selectedWeekDate,
      selectedWeekKey,
      isCurrentWeek,
      goToPrevWeek,
      goToCurrentWeek,
      goToNextWeek,
      formattedWeekRange,
      weekDaysInfo,
      monthWeeks,
      activeMonthWeek,
      selectedMonthWeekId,
      selectMonthWeekById,
      weeklyTargets,
      currentWeekTargets,
      weeklyPaceStats,
      addWeeklyTarget,
      bindChapterToWeek,
      unbindChapterFromWeek,
      updateWeeklyTarget,
      deleteWeeklyTarget,
      toggleWeeklyTargetComplete,
      updateWeeklyTargetProgress,
      syncWeeklyFromMonthlyTargets,
      dailyActions,
      currentDayIso,
      timeUntilMidnightStr,
      totalDailyActions,
      completedTodayCount,
      todayPercentage,
      addDailyAction,
      updateDailyAction,
      deleteDailyAction,
      toggleDailyActionToday,
      toggleDailyActionDate,
    ]
  );

  return (
    <DailyActionsContext.Provider value={value}>
      {children}
    </DailyActionsContext.Provider>
  );
};

export function useDailyActions() {
  const context = useContext(DailyActionsContext);
  if (!context) {
    throw new Error('useDailyActions must be used within a DailyActionsProvider');
  }
  return context;
}
