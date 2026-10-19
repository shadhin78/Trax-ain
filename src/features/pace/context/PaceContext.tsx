/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { 
  PaceGoal, 
  GlobalBaseline, 
  PaceStats,
  StoredPaceState
} from '../types';
import { 
  calculatePaceGoalStats, 
  calculateOverallUserVelocity,
  toIsoDateString 
} from '../utils/paceCalculations';

import { updateGlobalAppState } from '../../../context/AcademicHierarchyContext';
import { 
  getActiveUserId, 
  recordDeletion, 
  filterDeletedItems 
} from '../../../lib/tombstones';

export function getPaceStorageKey(userId?: string | null): string {
  return userId ? `x29_pace_management_${userId}` : 'x29_pace_management_data';
}

interface PaceContextType {
  globalBaseline: GlobalBaseline;
  goals: PaceGoal[];
  hasGlobalGoal: boolean;
  activeGoalId: string | null;
  activeGoal: PaceGoal | null;
  activeStats: PaceStats;
  globalGoal: PaceGoal | null;
  globalStats: PaceStats;
  globalBaselineStats: PaceStats;
  subjectTimeRanges: Record<string, { startDate: string; deadline: string }>;
  getSubjectGoal: (subjectId: string, subjectName?: string) => PaceGoal | null;
  setSubjectTimeRange: (subjectId: string, startDate: string, deadline: string) => void;
  clearSubjectTimeRange: (subjectId: string) => void;
  addGoal: (goalData: Omit<PaceGoal, 'id' | 'createdAt'>) => string;
  updateGoal: (id: string, updates: Partial<PaceGoal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoalId: (id: string | null) => void;
  updateGlobalBaseline: (startDate: string, endDate: string) => void;
  calculateStatsForGoal: (goal: PaceGoal) => PaceStats;
}

const PaceContext = createContext<PaceContextType | null>(null);

function createDefaultSeed(): StoredPaceState {
  return {
    globalBaseline: {
      startDate: '',
      endDate: '',
    },
    goals: [],
    activeGoalId: null,
    subjectTimeRanges: {},
  };
}

function loadInitialPaceState(userId?: string | null): StoredPaceState {
  const effectiveUid = userId !== undefined ? userId : getActiveUserId();
  try {
    const key = getPaceStorageKey(effectiveUid);
    let raw = localStorage.getItem(key);
    if (!raw && effectiveUid) {
      raw = localStorage.getItem('x29_pace_management_data');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.goals)) {
        let baseline: GlobalBaseline = parsed.globalBaseline || { 
          startDate: '', 
          endDate: '' 
        };

        const syncedGoals: PaceGoal[] = parsed.goals.map((g: PaceGoal) => {
          if (g.type === 'global') {
            const start = g.startDate || baseline.startDate || '';
            const end = g.deadline || baseline.endDate || '';

            return {
              ...g,
              target: '', // Global pace does not have title
              startDate: start, // Strictly linked with Global Baseline range
              deadline: end,
            };
          }
          return g;
        });

        // Ensure global baseline always equals global pace goal timeline range if global goal exists
        const foundGlobal = syncedGoals.find((g: PaceGoal) => g.type === 'global');
        if (foundGlobal) {
          baseline.startDate = foundGlobal.startDate;
          baseline.endDate = foundGlobal.deadline;
        } else {
          // If no global pace goal exists, baseline should not retain unassociated dates
          baseline = {
            startDate: '',
            endDate: '',
          };
        }

        const initialSubjectRanges: Record<string, { startDate: string; deadline: string }> = parsed.subjectTimeRanges || {};

        // Migrate and clean out any single-subject card goals so they never pollute Pace Management Active Timelines
        const cleanedGoals: PaceGoal[] = [];
        syncedGoals.forEach((g: PaceGoal) => {
          if (g.id.startsWith('goal_subject_') || g.id.startsWith('subject_pace_')) {
            const subId = g.subjects?.[0] || g.id.replace('goal_subject_', '').replace('subject_pace_', '');
            if (subId && !initialSubjectRanges[subId]) {
              initialSubjectRanges[subId] = {
                startDate: g.startDate,
                deadline: g.deadline,
              };
            }
          } else {
            cleanedGoals.push(g);
          }
        });

        const finalGoals = filterDeletedItems(cleanedGoals, effectiveUid);
        const validActiveGoalId = parsed.activeGoalId && finalGoals.some((g: PaceGoal) => g.id === parsed.activeGoalId)
          ? parsed.activeGoalId
          : null;
        return {
          globalBaseline: baseline,
          goals: finalGoals,
          activeGoalId: validActiveGoalId,
          subjectTimeRanges: initialSubjectRanges,
        };
      }
    }
  } catch {
    // Ignore storage parse error
  }
  const defaultSeed = createDefaultSeed();
  return {
    ...defaultSeed,
    goals: filterDeletedItems(defaultSeed.goals, effectiveUid),
  };
}

export const PaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subjects, programs, chapters, completionRecords } = useAcademicHierarchy();
  const { user, appData, updateAppData, isCloudLoaded } = useAuthSync();

  const [state, setState] = useState<StoredPaceState>(() => loadInitialPaceState(user?.uid || getActiveUserId()));
  const lastPushedPaceJsonRef = useRef<string>('');

  // Sync to localStorage and cloud on change
  const persistState = useCallback((nextState: StoredPaceState, immediate: boolean = false) => {
    const effectiveUid = user?.uid || getActiveUserId();
    setState(nextState);
    updateGlobalAppState({ paceManagement: nextState });

    try {
      const key = getPaceStorageKey(effectiveUid);
      localStorage.setItem(key, JSON.stringify(nextState));
      localStorage.setItem('x29_pace_management_data', JSON.stringify(nextState));
    } catch {
      // Ignore quota error
    }

    if (user) {
      const nextJson = JSON.stringify(nextState);
      if (nextJson !== lastPushedPaceJsonRef.current) {
        lastPushedPaceJsonRef.current = nextJson;
        updateAppData({
          customData: {
            paceManagement: nextState,
          },
        }, { immediate, section: 'paceManagement' });
      }
    }
  }, [user, updateAppData]);

  // Ensure window.AppState is set on mount / state change
  useEffect(() => {
    updateGlobalAppState({ paceManagement: state });
  }, [state]);

  // On user change/auth resolution: hydrate from user-scoped storage
  useEffect(() => {
    const userState = loadInitialPaceState(user?.uid);
    setState(userState);
  }, [user?.uid]);

  // Sync incoming cloud data from Firestore
  useEffect(() => {
    if (!isCloudLoaded) return;
    const effectiveUid = user?.uid || getActiveUserId();
    const remotePace = appData.customData?.paceManagement as StoredPaceState | undefined;
    if (remotePace && Array.isArray(remotePace.goals)) {
      const sanitizedGoals = filterDeletedItems(remotePace.goals, effectiveUid);
      const validActiveGoalId = remotePace.activeGoalId && sanitizedGoals.some((g: PaceGoal) => g.id === remotePace.activeGoalId)
        ? remotePace.activeGoalId
        : null;
      const sanitizedState: StoredPaceState = {
        ...remotePace,
        goals: sanitizedGoals,
        activeGoalId: validActiveGoalId,
      };
      const remoteJson = JSON.stringify(sanitizedState);
      if (remoteJson === lastPushedPaceJsonRef.current) {
        return; // Ignore local echo
      }
      lastPushedPaceJsonRef.current = remoteJson;
      setState(sanitizedState);
      updateGlobalAppState({ paceManagement: sanitizedState });
      try {
        const key = getPaceStorageKey(effectiveUid);
        localStorage.setItem(key, remoteJson);
        localStorage.setItem('x29_pace_management_data', remoteJson);
      } catch {
        // Ignore
      }
    }
  }, [appData?.customData?.paceManagement, user?.uid, isCloudLoaded]);


  // Calculation function
  const calculateStatsForGoal = useCallback(
    (goal: PaceGoal): PaceStats => {
      return calculatePaceGoalStats(
        goal,
        subjects,
        programs,
        chapters,
        completionRecords,
        state.goals
      );
    },
    [subjects, programs, chapters, completionRecords, state.goals]
  );

  // Global Baseline Virtual Goal
  const globalBaselineGoal = useMemo<PaceGoal>(() => {
    return {
      id: 'virtual_global_baseline',
      type: 'global',
      target: 'Global Baseline',
      startDate: state.globalBaseline.startDate,
      deadline: state.globalBaseline.endDate,
    };
  }, [state.globalBaseline]);

  const globalBaselineStats = useMemo(() => {
    return calculateStatsForGoal(globalBaselineGoal);
  }, [calculateStatsForGoal, globalBaselineGoal]);

  // Global Goal resolution (linked with Global Baseline range only)
  const globalGoal = useMemo<PaceGoal | null>(() => {
    const existing = state.goals.find((g) => g.type === 'global');
    if (existing) return existing;
    return null;
  }, [state.goals]);

  const hasGlobalGoal = useMemo(() => {
    return Boolean(globalGoal);
  }, [globalGoal]);

  // Overall curriculum study velocity (chapters / day)
  const overallUserVelocity = useMemo(() => {
    return calculateOverallUserVelocity(completionRecords, chapters);
  }, [completionRecords, chapters]);

  const globalStats = useMemo<PaceStats>(() => {
    if (globalGoal) {
      const stats = calculateStatsForGoal(globalGoal);
      // If global pace has no subjects or 0 curPace, fall back to user's overall velocity
      const effectiveVelocity = stats.curPace > 0 ? stats.curPace : overallUserVelocity;
      return {
        ...stats,
        curPace: effectiveVelocity,
      };
    }
    // When global pace does not exist, all target-dependent metrics are 0; actual pace velocity remains intact
    return {
      total: 0,
      completed: 0,
      remaining: 0,
      percentage: 0,
      totalDays: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      diffDaysTarget: 0,
      reqPace: 0,
      curPace: overallUserVelocity,
      daysNeeded: 0,
      projectedDate: null,
      projectedFinishStr: '--',
      countdownText: '--',
      timeElapsedText: '--',
      isBehind: false,
      status: 'on-track',
      targetedSubjectIds: new Set(),
      subjectDetails: [],
    };
  }, [globalGoal, calculateStatsForGoal, overallUserVelocity]);

  // Active goal resolution
  const activeGoal = useMemo(() => {
    if (!state.activeGoalId) return null;
    return state.goals.find((g) => g.id === state.activeGoalId) || null;
  }, [state.activeGoalId, state.goals]);

  const activeStats = useMemo(() => {
    if (!activeGoal) return globalStats;
    return calculateStatsForGoal(activeGoal);
  }, [calculateStatsForGoal, activeGoal, globalStats]);

  // CRUD actions
  const addGoal = useCallback(
    (goalData: Omit<PaceGoal, 'id' | 'createdAt'>): string => {
      // 1. If Global Goal, link timeline range directly with Global Baseline and ensure no title
      if (goalData.type === 'global') {
        const existingGlobalIdx = state.goals.findIndex((g) => g.type === 'global');
        if (existingGlobalIdx >= 0) {
          const existingId = state.goals[existingGlobalIdx].id;
          const nextGoals = state.goals.map((g, idx) => {
            if (idx !== existingGlobalIdx) return g;
            return {
              ...g,
              ...goalData,
              target: '', // Global pace does not have title
              startDate: goalData.startDate,
              deadline: goalData.deadline,
            };
          });

          persistState({
            ...state,
            globalBaseline: {
              startDate: goalData.startDate,
              endDate: goalData.deadline,
            },
            goals: nextGoals,
            activeGoalId: state.activeGoalId,
          });
          return existingId;
        } else {
          const newId = 'pace_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          const newGoal: PaceGoal = {
            ...goalData,
            id: newId,
            target: '', // Global pace does not have title
            subjects: goalData.subjects || [],
            programs: goalData.programs || [],
            secondaryPaces: goalData.secondaryPaces || [],
            createdAt: new Date().toISOString(),
          };

          persistState({
            ...state,
            globalBaseline: {
              startDate: goalData.startDate,
              endDate: goalData.deadline,
            },
            goals: [newGoal, ...state.goals],
            activeGoalId: state.activeGoalId,
          });
          return newId;
        }
      }

      // 2. Normal bundle or program goal
      const newId = 'pace_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const newGoal: PaceGoal = {
        ...goalData,
        id: newId,
        subjects: goalData.subjects || [],
        programs: goalData.programs || [],
        secondaryPaces: goalData.secondaryPaces || [],
        createdAt: new Date().toISOString(),
      };

      const nextGoals = [newGoal, ...state.goals];
      persistState({
        ...state,
        goals: nextGoals,
        activeGoalId: state.activeGoalId, // Preserves user's chosen X bar pace
      });
      return newId;
    },
    [state, persistState]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<PaceGoal>) => {
      let updatedBaseline = state.globalBaseline;
      const exists = state.goals.some((g) => g.id === id);

      let nextGoals: PaceGoal[];
      if (!exists) {
        const newGoal: PaceGoal = {
          id,
          type: updates.type || 'subjects',
          target: updates.target || 'Pace Target',
          startDate: updates.startDate || state.globalBaseline.startDate,
          deadline: updates.deadline || state.globalBaseline.endDate,
          subjects: updates.subjects || [],
          programs: updates.programs || [],
          secondaryPaces: updates.secondaryPaces || [],
          ...updates,
          createdAt: new Date().toISOString(),
        };
        nextGoals = [newGoal, ...state.goals];
      } else {
        nextGoals = state.goals.map((g) => {
          if (g.id !== id) return g;
          const updatedGoal = { ...g, ...updates };

          // If Global Goal is updated, keep Global Baseline timeline range synchronized
          if (updatedGoal.type === 'global') {
            updatedGoal.target = ''; // Global pace does not have title
            const nextStart = updates.startDate ?? updatedGoal.startDate;
            const nextDeadline = updates.deadline ?? updatedGoal.deadline;
            updatedBaseline = {
              startDate: nextStart,
              endDate: nextDeadline,
            };
          }

          return updatedGoal;
        });
      }

      persistState({
        ...state,
        globalBaseline: updatedBaseline,
        goals: nextGoals,
      });
    },
    [state, persistState]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const effectiveUid = user?.uid || getActiveUserId();
      recordDeletion(id, 'paceGoal', effectiveUid);

      const target = state.goals.find((g) => g.id === id);
      const isGlobal = target?.type === 'global' || id === 'goal_global_curriculum' || id === 'global_curriculum_baseline';
      const nextGoals = state.goals.filter((g) => {
        if (g.id === id) return false;
        if (isGlobal && g.type === 'global') return false;
        return true;
      });
      const isSelectedPaceDeleted = state.activeGoalId === id || (isGlobal && state.goals.find(g => g.id === state.activeGoalId)?.type === 'global');
      const nextActiveId = isSelectedPaceDeleted ? null : (nextGoals.some(g => g.id === state.activeGoalId) ? state.activeGoalId : null);

      persistState({
        ...state,
        globalBaseline: isGlobal ? { startDate: '', endDate: '' } : state.globalBaseline,
        goals: nextGoals,
        activeGoalId: nextActiveId,
      }, true);
    },
    [state, persistState, user?.uid]
  );

  const setActiveGoalId = useCallback(
    (id: string | null) => {
      persistState({
        ...state,
        activeGoalId: id,
      });
    },
    [state, persistState]
  );

  const updateGlobalBaseline = useCallback(
    (startDate: string, endDate: string) => {
      const nextGoals = state.goals.map((g) => {
        if (g.type === 'global') {
          return {
            ...g,
            target: '', // Global pace does not have title
            startDate, // Linked with Global Baseline range
            deadline: endDate,
          };
        }
        return g;
      });

      persistState({
        ...state,
        globalBaseline: {
          startDate,
          endDate,
        },
        goals: nextGoals,
      });
    },
    [state, persistState]
  );

  const getSubjectGoal = useCallback(
    (subjectId: string, subjectName?: string): PaceGoal | null => {
      const range = state.subjectTimeRanges?.[subjectId];
      if (!range) return null;

      const sub = subjects.find((s) => s.id === subjectId);
      const name = subjectName || sub?.name || 'Subject Target';

      return {
        id: `subject_pace_${subjectId}`,
        type: 'subjects',
        target: name,
        startDate: range.startDate,
        deadline: range.deadline,
        subjects: [subjectId],
      };
    },
    [state.subjectTimeRanges, subjects]
  );

  const setSubjectTimeRange = useCallback(
    (subjectId: string, startDate: string, deadline: string) => {
      const nextRanges = {
        ...(state.subjectTimeRanges || {}),
        [subjectId]: { startDate, deadline },
      };

      // Ensure subject card pace is stripped from state.goals so it NEVER appears on Active Timelines page
      const nextGoals = state.goals.filter(
        (g) => g.id !== `goal_subject_${subjectId}` && g.id !== `subject_pace_${subjectId}`
      );

      persistState({
        ...state,
        goals: nextGoals,
        subjectTimeRanges: nextRanges,
      });
    },
    [state, persistState]
  );

  const clearSubjectTimeRange = useCallback(
    (subjectId: string) => {
      const nextRanges = { ...(state.subjectTimeRanges || {}) };
      delete nextRanges[subjectId];

      const nextGoals = state.goals.filter(
        (g) => g.id !== `goal_subject_${subjectId}` && g.id !== `subject_pace_${subjectId}`
      );

      persistState({
        ...state,
        goals: nextGoals,
        subjectTimeRanges: nextRanges,
      });
    },
    [state, persistState]
  );

  const contextValue = useMemo(() => ({
    globalBaseline: state.globalBaseline,
    goals: state.goals,
    hasGlobalGoal,
    activeGoalId: state.activeGoalId,
    activeGoal,
    activeStats,
    globalGoal,
    globalStats,
    globalBaselineStats,
    subjectTimeRanges: state.subjectTimeRanges || {},
    getSubjectGoal,
    setSubjectTimeRange,
    clearSubjectTimeRange,
    addGoal,
    updateGoal,
    deleteGoal,
    setActiveGoalId,
    updateGlobalBaseline,
    calculateStatsForGoal,
  }), [
    state.globalBaseline,
    state.goals,
    hasGlobalGoal,
    state.activeGoalId,
    activeGoal,
    activeStats,
    globalGoal,
    globalStats,
    globalBaselineStats,
    state.subjectTimeRanges,
    getSubjectGoal,
    setSubjectTimeRange,
    clearSubjectTimeRange,
    addGoal,
    updateGoal,
    deleteGoal,
    setActiveGoalId,
    updateGlobalBaseline,
    calculateStatsForGoal,
  ]);

  return (
    <PaceContext.Provider value={contextValue}>
      {children}
    </PaceContext.Provider>
  );
};

export const usePace = (): PaceContextType => {
  const context = useContext(PaceContext);
  if (!context) {
    throw new Error('usePace must be used within a PaceProvider');
  }
  return context;
};
