/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../lib/firebase';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { 
  ProgramResult, 
  FreezeConfiguration, 
  CelebrationCriteria, 
  ProgramTargetConfig,
  EvaluationOption,
  OutcomeSortOption 
} from '../types';
import { getActiveUserId, recordDeletion, filterDeletedItems } from '../../../lib/tombstones';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { 
  cgpaToGrade, 
  getProgramMainTarget, 
  reconcileProgramSubjectFreeze,
  calculateSubjectWiseEstimate,
  evaluatePassFail,
  ProgramMainTargetResult 
} from '../utils/outcomeHelpers';

interface OutcomeContextType {
  results: ProgramResult[];
  freezeConfig: FreezeConfiguration;
  celebrationCriteria: CelebrationCriteria;
  programTargets: Record<string, ProgramTargetConfig>;
  selectedProgramFilter: string; // 'ALL' or programId
  sortBy: OutcomeSortOption;

  // Computed metrics
  totalLoggedCount: number;
  filteredResults: ProgramResult[];
  sortedResults: ProgramResult[];
  programAverages: { programId: string; programName: string; avgCgpa: number; grade: string }[];
  trackAverages: { trackId: string; trackName: string; avgCgpa: number; grade: string }[];
  overallPassedCount: number;
  totalCoreCoursesCount: number;
  coreCoursesPassedPercent: number;
  isMilestoneAchieved: boolean;
  showCelebrationModal: boolean;

  // Actions
  setShowCelebrationModal: (show: boolean) => void;
  triggerMilestoneCelebration: () => void;
  setSelectedProgramFilter: (filter: string) => void;
  setSortBy: (sort: OutcomeSortOption) => void;
  addResult: (result: Omit<ProgramResult, 'id' | 'createdAt'>) => Promise<void>;
  updateResult: (id: string, updates: Partial<ProgramResult>) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  setProgramTarget: (
    programId: string, 
    target: { targetCgpa?: number; targetGrade?: string; isNone?: boolean; evaluationOption?: EvaluationOption }
  ) => Promise<void>;
  clearProgramTarget: (programId: string) => Promise<void>;
  getProgramTarget: (programId: string, evalType?: EvaluationOption) => ProgramMainTargetResult;
  toggleProgramFreeze: (programId: string) => Promise<void>;
  toggleSubjectFreeze: (subjectId: string) => Promise<void>;
  syncPassFreeze: () => Promise<void>;
  updateCelebrationCriteria: (criteria: Partial<CelebrationCriteria>) => Promise<void>;
  resetCelebrationCriteria: () => Promise<void>;
}

const OutcomeContext = createContext<OutcomeContextType | undefined>(undefined);

const LOCAL_STORAGE_OUTCOME_KEY = 'x29_outcome_data';
const LOCAL_STORAGE_SORT_KEY = 'x29_outcome_sort_by';

export const OutcomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthSync();
  const { tracks, programs, subjects, freezeSubjectsBatch, unfreezeSubjectsBatch } = useAcademicHierarchy();

  // Results state
  const [results, setResults] = useState<ProgramResult[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_OUTCOME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.results)) {
          const uid = user?.uid || getActiveUserId();
          return filterDeletedItems(parsed.results, uid);
        }
      }
    } catch {}
    return [];
  });

  const [freezeConfig, setFreezeConfig] = useState<FreezeConfiguration>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_OUTCOME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.freezeConfig) {
          return {
            frozenProgramIds: Array.isArray(parsed.freezeConfig.frozenProgramIds)
              ? parsed.freezeConfig.frozenProgramIds
              : [],
            frozenSubjectIds: Array.isArray(parsed.freezeConfig.frozenSubjectIds)
              ? parsed.freezeConfig.frozenSubjectIds
              : [],
            manualFrozenProgramIds: Array.isArray(parsed.freezeConfig.manualFrozenProgramIds)
              ? parsed.freezeConfig.manualFrozenProgramIds
              : [],
            manualFrozenSubjectIds: Array.isArray(parsed.freezeConfig.manualFrozenSubjectIds)
              ? parsed.freezeConfig.manualFrozenSubjectIds
              : [],
            preProgramFrozenSubjectIds: parsed.freezeConfig.preProgramFrozenSubjectIds && typeof parsed.freezeConfig.preProgramFrozenSubjectIds === 'object'
              ? parsed.freezeConfig.preProgramFrozenSubjectIds
              : {},
            autoCompletedChapterIdsBySubject: parsed.freezeConfig.autoCompletedChapterIdsBySubject && typeof parsed.freezeConfig.autoCompletedChapterIdsBySubject === 'object'
              ? parsed.freezeConfig.autoCompletedChapterIdsBySubject
              : {},
          };
        }
      }
    } catch {}
    return { 
      frozenProgramIds: [], 
      frozenSubjectIds: [], 
      manualFrozenProgramIds: [], 
      manualFrozenSubjectIds: [],
      preProgramFrozenSubjectIds: {},
      autoCompletedChapterIdsBySubject: {},
    };
  });

  const [celebrationCriteria, setCelebrationCriteria] = useState<CelebrationCriteria>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_OUTCOME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.celebrationCriteria) {
          return {
            requiredProgramIds: Array.isArray(parsed.celebrationCriteria.requiredProgramIds)
              ? parsed.celebrationCriteria.requiredProgramIds
              : [],
            requiredSubjectIds: Array.isArray(parsed.celebrationCriteria.requiredSubjectIds)
              ? parsed.celebrationCriteria.requiredSubjectIds
              : [],
            isCustomized: Boolean(parsed.celebrationCriteria.isCustomized),
          };
        }
      }
    } catch {}
    return { requiredProgramIds: [], requiredSubjectIds: [], isCustomized: false };
  });

  const [programTargets, setProgramTargets] = useState<Record<string, ProgramTargetConfig>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_OUTCOME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.programTargets && typeof parsed.programTargets === 'object') {
          return parsed.programTargets;
        }
      }
    } catch {}
    return {};
  });

  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
  const [sortBy, setSortByState] = useState<OutcomeSortOption>(() => {
    try {
      const direct = localStorage.getItem(LOCAL_STORAGE_SORT_KEY);
      if (direct && ['NEWEST', 'OLDEST', 'CGPA_HIGH', 'CGPA_LOW'].includes(direct)) {
        return direct as OutcomeSortOption;
      }
      const cached = localStorage.getItem(LOCAL_STORAGE_OUTCOME_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.sortBy && ['NEWEST', 'OLDEST', 'CGPA_HIGH', 'CGPA_LOW'].includes(parsed.sortBy)) {
          return parsed.sortBy as OutcomeSortOption;
        }
      }
    } catch {}
    return 'NEWEST';
  });

  const resultsRef = useRef(results);
  resultsRef.current = results;
  const freezeConfigRef = useRef(freezeConfig);
  freezeConfigRef.current = freezeConfig;
  const celebrationCriteriaRef = useRef(celebrationCriteria);
  celebrationCriteriaRef.current = celebrationCriteria;
  const programTargetsRef = useRef(programTargets);
  programTargetsRef.current = programTargets;
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;
  const isWritingRef = useRef(false);

  // Cache to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SORT_KEY, sortBy);
      localStorage.setItem(
        LOCAL_STORAGE_OUTCOME_KEY,
        JSON.stringify({
          results,
          freezeConfig,
          celebrationCriteria,
          programTargets,
          sortBy,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {}
  }, [results, freezeConfig, celebrationCriteria, programTargets, sortBy]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SINGLE REAL-TIME FIRESTORE LISTENER (DATABASE FRIENDLY)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db || !isFirebaseConfigured) return;

    const outcomeDocRef = doc(db, 'users', user.uid, 'data', 'outcomeData');

    const unsubscribe = onSnapshot(
      outcomeDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        if (snapshot.metadata.hasPendingWrites && isWritingRef.current) return;

        const data = snapshot.data();
        const uid = user.uid || getActiveUserId();

        if (Array.isArray(data.results)) {
          setResults(filterDeletedItems(data.results, uid));
        }

        if (data.freezeConfig && typeof data.freezeConfig === 'object') {
          setFreezeConfig({
            frozenProgramIds: Array.isArray(data.freezeConfig.frozenProgramIds)
              ? data.freezeConfig.frozenProgramIds
              : [],
            frozenSubjectIds: Array.isArray(data.freezeConfig.frozenSubjectIds)
              ? data.freezeConfig.frozenSubjectIds
              : [],
            manualFrozenProgramIds: Array.isArray(data.freezeConfig.manualFrozenProgramIds)
              ? data.freezeConfig.manualFrozenProgramIds
              : [],
            manualFrozenSubjectIds: Array.isArray(data.freezeConfig.manualFrozenSubjectIds)
              ? data.freezeConfig.manualFrozenSubjectIds
              : [],
            preProgramFrozenSubjectIds: data.freezeConfig.preProgramFrozenSubjectIds && typeof data.freezeConfig.preProgramFrozenSubjectIds === 'object'
              ? data.freezeConfig.preProgramFrozenSubjectIds
              : {},
            autoCompletedChapterIdsBySubject: data.freezeConfig.autoCompletedChapterIdsBySubject && typeof data.freezeConfig.autoCompletedChapterIdsBySubject === 'object'
              ? data.freezeConfig.autoCompletedChapterIdsBySubject
              : {},
          });
        }

        if (data.celebrationCriteria && typeof data.celebrationCriteria === 'object') {
          setCelebrationCriteria({
            requiredProgramIds: Array.isArray(data.celebrationCriteria.requiredProgramIds)
              ? data.celebrationCriteria.requiredProgramIds
              : [],
            requiredSubjectIds: Array.isArray(data.celebrationCriteria.requiredSubjectIds)
              ? data.celebrationCriteria.requiredSubjectIds
              : [],
            isCustomized: Boolean(data.celebrationCriteria.isCustomized),
          });
        }

        if (data.programTargets && typeof data.programTargets === 'object') {
          setProgramTargets(data.programTargets);
        }

        if (data.sortBy && ['NEWEST', 'OLDEST', 'CGPA_HIGH', 'CGPA_LOW'].includes(data.sortBy)) {
          setSortByState(data.sortBy as OutcomeSortOption);
          try {
            localStorage.setItem(LOCAL_STORAGE_SORT_KEY, data.sortBy);
          } catch {}
        }
      },
      (error) => {
        console.warn('[Outcome] Snapshot listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Persist helper
  const persistOutcome = useCallback(
    async (
      newResults: ProgramResult[],
      newFreeze: FreezeConfiguration,
      newCriteria: CelebrationCriteria,
      newTargets: Record<string, ProgramTargetConfig> = programTargetsRef.current
    ) => {
      if (!user || !db || !isFirebaseConfigured) return;

      isWritingRef.current = true;
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'outcomeData');
        await setDoc(
          docRef,
          {
            results: newResults,
            freezeConfig: newFreeze,
            celebrationCriteria: newCriteria,
            programTargets: newTargets,
            sortBy: sortByRef.current,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('[Outcome] Failed to persist data:', err);
      } finally {
        isWritingRef.current = false;
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1.1 RECONCILE FREEZE CONFIG TO ENFORCE BIDIRECTIONAL PROGRAM-SUBJECT RULES
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!programs.length || !subjects.length) return;

    setFreezeConfig((prev) => {
      const reconciled = reconcileProgramSubjectFreeze({
        programIds: prev.frozenProgramIds,
        subjectIds: prev.frozenSubjectIds,
        manualProgramIds: prev.manualFrozenProgramIds || [],
        manualSubjectIds: prev.manualFrozenSubjectIds || [],
        preProgramFrozenSubjectIds: prev.preProgramFrozenSubjectIds || {},
        programs,
        subjects,
      });

      const hasProgramsChanged =
        reconciled.frozenProgramIds.length !== prev.frozenProgramIds.length ||
        reconciled.frozenProgramIds.some((p) => !prev.frozenProgramIds.includes(p));
      const hasSubjectsChanged =
        reconciled.frozenSubjectIds.length !== prev.frozenSubjectIds.length ||
        reconciled.frozenSubjectIds.some((s) => !prev.frozenSubjectIds.includes(s));

      if (!hasProgramsChanged && !hasSubjectsChanged) {
        return prev;
      }

      const updated: FreezeConfiguration = {
        frozenProgramIds: reconciled.frozenProgramIds,
        frozenSubjectIds: reconciled.frozenSubjectIds,
        manualFrozenProgramIds: reconciled.manualFrozenProgramIds,
        manualFrozenSubjectIds: reconciled.manualFrozenSubjectIds,
        preProgramFrozenSubjectIds: reconciled.preProgramFrozenSubjectIds,
        autoCompletedChapterIdsBySubject: prev.autoCompletedChapterIdsBySubject || {},
      };

      persistOutcome(
        resultsRef.current,
        updated,
        celebrationCriteriaRef.current,
        programTargetsRef.current
      );

      return updated;
    });
  }, [programs, subjects, persistOutcome]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. COMPUTED METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  // Normalized Results (ensuring overall program subject average applies to estimated cards)
  const normalizedResults = useMemo(() => {
    return results.map((r) => {
      if (!r.isEstimated || r.resultType !== 'Program CGPA') return r;
      const progSubs = subjects.filter((s) => s.programId === r.programId);
      const totalCount = progSubs.length > 0 ? progSubs.length : (r.subjectGrades?.length || 1);
      const est = calculateSubjectWiseEstimate(r.subjectGrades || [], r.evaluationOption, totalCount);
      if (!est.hasAnyAttempted) {
        return {
          ...r,
          actualCgpa: 0,
          estimatedCgpa: 0,
          actualGrade: '—',
          estimatedGrade: '—',
          isPassed: false,
        };
      }
      const isPass = evaluatePassFail(est.estimatedCgpa, r.evaluationOption);
      return {
        ...r,
        actualCgpa: est.estimatedCgpa,
        estimatedCgpa: est.estimatedCgpa,
        actualGrade: est.estimatedGrade,
        estimatedGrade: est.estimatedGrade,
        isPassed: isPass,
      };
    });
  }, [results, subjects]);

  // Sorted results for Logged Results cards (NOT filtered by selectedProgramFilter)
  const sortedResults = useMemo(() => {
    let list = [...normalizedResults];

    list.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
      if (sortBy === 'OLDEST') return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
      if (sortBy === 'CGPA_HIGH') return (b.actualCgpa || 0) - (a.actualCgpa || 0);
      if (sortBy === 'CGPA_LOW') return (a.actualCgpa || 0) - (b.actualCgpa || 0);
      return 0;
    });

    return list;
  }, [normalizedResults, sortBy]);

  // Filtered & Sorted Results (for the Trend Chart)
  const filteredResults = useMemo(() => {
    let list = [...normalizedResults];

    if (selectedProgramFilter !== 'ALL') {
      list = list.filter((r) => r.programId === selectedProgramFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
      if (sortBy === 'OLDEST') return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
      if (sortBy === 'CGPA_HIGH') return (b.actualCgpa || 0) - (a.actualCgpa || 0);
      if (sortBy === 'CGPA_LOW') return (a.actualCgpa || 0) - (b.actualCgpa || 0);
      return 0;
    });

    return list;
  }, [normalizedResults, selectedProgramFilter, sortBy]);

  // Program / Track Averages
  const programAverages = useMemo(() => {
    const map: Record<string, { programName: string; totalCgpa: number; count: number }> = {};
    normalizedResults.forEach((r) => {
      if (r.resultType !== 'Program CGPA' || !r.programId) return;
      if (!map[r.programId]) {
        map[r.programId] = { programName: r.programName, totalCgpa: 0, count: 0 };
      }
      map[r.programId].totalCgpa += r.actualCgpa || 0;
      map[r.programId].count += 1;
    });

    return Object.entries(map).map(([programId, val]) => {
      const avg = val.count > 0 ? Number((val.totalCgpa / val.count).toFixed(2)) : 0;
      const grade = cgpaToGrade(avg);
      return {
        programId,
        programName: val.programName,
        avgCgpa: avg,
        grade,
      };
    });
  }, [normalizedResults]);

  // Track Averages
  const trackAverages = useMemo(() => {
    return tracks.map((track) => {
      const progsInTrack = programs.filter((p) => p.trackId === track.id).map((p) => p.id);
      const resultsInTrack = normalizedResults.filter((r) => r.resultType === 'Program CGPA' && progsInTrack.includes(r.programId));
      if (resultsInTrack.length === 0) {
        return {
          trackId: track.id,
          trackName: track.name,
          avgCgpa: 0,
          grade: 'F',
        };
      }
      const totalCgpa = resultsInTrack.reduce((sum, r) => sum + (r.actualCgpa || 0), 0);
      const avg = Number((totalCgpa / resultsInTrack.length).toFixed(2));
      const grade = cgpaToGrade(avg);
      return {
        trackId: track.id,
        trackName: track.name,
        avgCgpa: avg,
        grade,
      };
    });
  }, [tracks, programs, normalizedResults]);

  // Core Courses Calculation
  const totalCoreCoursesCount = useMemo(() => {
    if (celebrationCriteria?.isCustomized) {
      const reqSubs = new Set<string>(celebrationCriteria.requiredSubjectIds || []);
      (celebrationCriteria.requiredProgramIds || []).forEach((pid) => {
        subjects.filter((s) => s.programId === pid).forEach((s) => reqSubs.add(s.id));
      });
      if (reqSubs.size > 0) return reqSubs.size;
    }
    return (subjects?.length ?? 0) > 0 ? subjects.length : 1;
  }, [celebrationCriteria, subjects]);

  const overallPassedCount = useMemo(() => {
    const frozenSet = new Set(freezeConfig?.frozenSubjectIds || []);
    (freezeConfig?.frozenProgramIds || []).forEach((pid) => {
      (subjects || []).filter((s) => s.programId === pid).forEach((s) => frozenSet.add(s.id));
    });

    if (celebrationCriteria?.isCustomized) {
      const reqSubs = new Set<string>(celebrationCriteria.requiredSubjectIds || []);
      (celebrationCriteria.requiredProgramIds || []).forEach((pid) => {
        subjects.filter((s) => s.programId === pid).forEach((s) => reqSubs.add(s.id));
      });
      if (reqSubs.size > 0) {
        let count = 0;
        reqSubs.forEach((sid) => {
          if (frozenSet.has(sid)) count++;
        });
        return count;
      }
    }

    return Math.min(totalCoreCoursesCount, frozenSet.size);
  }, [freezeConfig, subjects, totalCoreCoursesCount, celebrationCriteria]);

  const coreCoursesPassedPercent = useMemo(() => {
    if (totalCoreCoursesCount === 0) return 0;
    return Math.min(100, Math.round((overallPassedCount / totalCoreCoursesCount) * 100));
  }, [overallPassedCount, totalCoreCoursesCount]);

  const isMilestoneAchieved = useMemo(() => {
    if (totalCoreCoursesCount === 0) return false;
    return overallPassedCount >= totalCoreCoursesCount;
  }, [overallPassedCount, totalCoreCoursesCount]);

  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const isInitialMountRef = useRef(true);
  const prevAchievedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevAchievedRef.current = isMilestoneAchieved;
      return;
    }
    if (isMilestoneAchieved && !prevAchievedRef.current) {
      setShowCelebrationModal(true);
    }
    prevAchievedRef.current = isMilestoneAchieved;
  }, [isMilestoneAchieved]);

  const triggerMilestoneCelebration = useCallback(() => {
    setShowCelebrationModal(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TARGET RESOLUTION HELPER
  // ─────────────────────────────────────────────────────────────────────────────
  const getProgramTarget = useCallback(
    (programId: string, evalType: EvaluationOption = 'CGPA-based'): ProgramMainTargetResult => {
      return getProgramMainTarget(programId, {
        programTargets: programTargetsRef.current,
        programs,
        results: resultsRef.current,
        evalType,
      });
    },
    [programs]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DISPATCH ACTIONS (WITH AUTOMATIC PASS/FREEZE SYNCHRONIZATION)
  // ─────────────────────────────────────────────────────────────────────────────

  const syncChaptersForFreezeDelta = useCallback((
    prevFrozenSubjectIds: string[],
    nextFrozenSubjectIds: string[],
    prevAutoCompletedMap: Record<string, string[]> = {}
  ): Record<string, string[]> => {
    const nextAutoCompletedMap = { ...prevAutoCompletedMap };
    const newlyFrozen = nextFrozenSubjectIds.filter(id => !prevFrozenSubjectIds.includes(id));
    const newlyUnfrozen = prevFrozenSubjectIds.filter(id => !nextFrozenSubjectIds.includes(id));

    if (newlyFrozen.length > 0) {
      const addedBatch = freezeSubjectsBatch(newlyFrozen);
      Object.assign(nextAutoCompletedMap, addedBatch);
    }

    if (newlyUnfrozen.length > 0) {
      const revertMap: Record<string, string[]> = {};
      newlyUnfrozen.forEach(sid => {
        revertMap[sid] = prevAutoCompletedMap[sid] || [];
        delete nextAutoCompletedMap[sid];
      });
      unfreezeSubjectsBatch(revertMap);
    }

    return nextAutoCompletedMap;
  }, [freezeSubjectsBatch, unfreezeSubjectsBatch]);

  const addResult = useCallback(
    async (resultData: Omit<ProgramResult, 'id' | 'createdAt'>) => {
      const newResult: ProgramResult = {
        id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...resultData,
      };

      const updatedResults = [newResult, ...resultsRef.current];
      setResults(updatedResults);

      await persistOutcome(
        updatedResults, 
        freezeConfigRef.current, 
        celebrationCriteriaRef.current, 
        programTargetsRef.current
      );
    },
    [persistOutcome]
  );

  const updateResult = useCallback(
    async (id: string, updates: Partial<ProgramResult>) => {
      const updatedResults = resultsRef.current.map((r) => (r.id === id ? { ...r, ...updates } : r));
      setResults(updatedResults);

      await persistOutcome(
        updatedResults, 
        freezeConfigRef.current, 
        celebrationCriteriaRef.current, 
        programTargetsRef.current
      );
    },
    [persistOutcome]
  );

  const deleteResult = useCallback(
    async (id: string) => {
      recordDeletion(id, 'programResult', user?.uid || getActiveUserId());
      const updatedResults = resultsRef.current.filter((r) => r.id !== id);
      setResults(updatedResults);

      await persistOutcome(
        updatedResults, 
        freezeConfigRef.current, 
        celebrationCriteriaRef.current, 
        programTargetsRef.current
      );
    },
    [persistOutcome, user]
  );

  const setProgramTarget = useCallback(
    async (
      programId: string,
      target: { targetCgpa?: number; targetGrade?: string; isNone?: boolean; evaluationOption?: EvaluationOption }
    ) => {
      const isNone = Boolean(target.isNone || target.targetCgpa === 0 || target.targetGrade?.toLowerCase() === 'none');
      const updatedTargets: Record<string, ProgramTargetConfig> = {
        ...programTargetsRef.current,
        [programId]: {
          programId,
          targetCgpa: isNone ? 0 : (target.targetCgpa ?? 0),
          targetGrade: isNone ? 'None' : (target.targetGrade || (target.targetCgpa ? cgpaToGrade(target.targetCgpa) : 'None')),
          isNone,
          evaluationOption: target.evaluationOption || 'CGPA-based',
          updatedAt: new Date().toISOString(),
        },
      };


      setProgramTargets(updatedTargets);
      await persistOutcome(
        resultsRef.current, 
        freezeConfigRef.current, 
        celebrationCriteriaRef.current, 
        updatedTargets
      );
    },
    [persistOutcome]
  );

  const clearProgramTarget = useCallback(
    async (programId: string) => {
      const updatedTargets: Record<string, ProgramTargetConfig> = {
        ...programTargetsRef.current,
        [programId]: {
          programId,
          targetCgpa: 0,
          targetGrade: 'None',
          isNone: true,
          updatedAt: new Date().toISOString(),
        },
      };

      setProgramTargets(updatedTargets);
      await persistOutcome(
        resultsRef.current, 
        freezeConfigRef.current, 
        celebrationCriteriaRef.current, 
        updatedTargets
      );
    },
    [persistOutcome]
  );

  const setSortBy = useCallback(
    (newSort: OutcomeSortOption) => {
      setSortByState(newSort);
      try {
        localStorage.setItem(LOCAL_STORAGE_SORT_KEY, newSort);
      } catch {}
      if (user && db && isFirebaseConfigured) {
        const docRef = doc(db, 'users', user.uid, 'data', 'outcomeData');
        setDoc(docRef, { sortBy: newSort, updatedAt: serverTimestamp() }, { merge: true }).catch((err) => {
          console.warn('[Outcome] Failed to persist sortBy to firestore:', err);
        });
      }
    },
    [user]
  );

  const syncPassFreeze = useCallback(async () => {
    // Pass/Freeze is fully manual and independent of logged results.
  }, []);

  const toggleProgramFreeze = useCallback(
    async (programId: string) => {
      const current = freezeConfigRef.current;
      const isCurrentlyFrozen = current.frozenProgramIds.includes(programId);
      const isNowPassed = !isCurrentlyFrozen;

      const reconciled = reconcileProgramSubjectFreeze({
        programIds: current.frozenProgramIds,
        subjectIds: current.frozenSubjectIds,
        manualProgramIds: current.manualFrozenProgramIds || [],
        manualSubjectIds: current.manualFrozenSubjectIds || [],
        preProgramFrozenSubjectIds: current.preProgramFrozenSubjectIds || {},
        programs,
        subjects,
        prioritizedAction: {
          type: 'TOGGLE_PROGRAM',
          programId,
          isNowPassed,
        },
      });

      const nextAutoCompleted = syncChaptersForFreezeDelta(
        current.frozenSubjectIds,
        reconciled.frozenSubjectIds,
        current.autoCompletedChapterIdsBySubject || {}
      );

      const newFreeze: FreezeConfiguration = {
        frozenProgramIds: reconciled.frozenProgramIds,
        frozenSubjectIds: reconciled.frozenSubjectIds,
        manualFrozenProgramIds: reconciled.manualFrozenProgramIds,
        manualFrozenSubjectIds: reconciled.manualFrozenSubjectIds,
        preProgramFrozenSubjectIds: reconciled.preProgramFrozenSubjectIds,
        autoCompletedChapterIdsBySubject: nextAutoCompleted,
      };

      setFreezeConfig(newFreeze);
      await persistOutcome(
        resultsRef.current, 
        newFreeze, 
        celebrationCriteriaRef.current, 
        programTargetsRef.current
      );
    },
    [persistOutcome, programs, subjects, syncChaptersForFreezeDelta]
  );

  const toggleSubjectFreeze = useCallback(
    async (subjectId: string) => {
      const current = freezeConfigRef.current;
      const isCurrentlyFrozen = current.frozenSubjectIds.includes(subjectId);
      const isNowPassed = !isCurrentlyFrozen;

      const reconciled = reconcileProgramSubjectFreeze({
        programIds: current.frozenProgramIds,
        subjectIds: current.frozenSubjectIds,
        manualProgramIds: current.manualFrozenProgramIds || [],
        manualSubjectIds: current.manualFrozenSubjectIds || [],
        preProgramFrozenSubjectIds: current.preProgramFrozenSubjectIds || {},
        programs,
        subjects,
        prioritizedAction: {
          type: 'TOGGLE_SUBJECT',
          subjectId,
          isNowPassed,
        },
      });

      const nextAutoCompleted = syncChaptersForFreezeDelta(
        current.frozenSubjectIds,
        reconciled.frozenSubjectIds,
        current.autoCompletedChapterIdsBySubject || {}
      );

      const newFreeze: FreezeConfiguration = {
        frozenProgramIds: reconciled.frozenProgramIds,
        frozenSubjectIds: reconciled.frozenSubjectIds,
        manualFrozenProgramIds: reconciled.manualFrozenProgramIds,
        manualFrozenSubjectIds: reconciled.manualFrozenSubjectIds,
        preProgramFrozenSubjectIds: reconciled.preProgramFrozenSubjectIds,
        autoCompletedChapterIdsBySubject: nextAutoCompleted,
      };

      setFreezeConfig(newFreeze);
      await persistOutcome(
        resultsRef.current, 
        newFreeze, 
        celebrationCriteriaRef.current, 
        programTargetsRef.current
      );
    },
    [persistOutcome, programs, subjects, syncChaptersForFreezeDelta]
  );

  const updateCelebrationCriteria = useCallback(
    async (criteria: Partial<CelebrationCriteria>) => {
      const updated: CelebrationCriteria = {
        ...celebrationCriteriaRef.current,
        ...criteria,
        isCustomized: true,
      };
      setCelebrationCriteria(updated);
      await persistOutcome(
        resultsRef.current, 
        freezeConfigRef.current, 
        updated, 
        programTargetsRef.current
      );
    },
    [persistOutcome]
  );

  const resetCelebrationCriteria = useCallback(async () => {
    const defaultCriteria: CelebrationCriteria = {
      requiredProgramIds: programs.map((p) => p.id),
      requiredSubjectIds: subjects.map((s) => s.id),
      isCustomized: false,
    };
    setCelebrationCriteria(defaultCriteria);
    await persistOutcome(
      resultsRef.current, 
      freezeConfigRef.current, 
      defaultCriteria, 
      programTargetsRef.current
    );
  }, [persistOutcome, programs, subjects]);

  const contextValue = useMemo(() => ({
    results,
    freezeConfig,
    celebrationCriteria,
    programTargets,
    selectedProgramFilter,
    sortBy,
    totalLoggedCount: results.length,
    filteredResults,
    sortedResults,
    programAverages,
    trackAverages,
    overallPassedCount,
    totalCoreCoursesCount,
    coreCoursesPassedPercent,
    isMilestoneAchieved,
    showCelebrationModal,
    setShowCelebrationModal,
    triggerMilestoneCelebration,
    setSelectedProgramFilter,
    setSortBy,
    addResult,
    updateResult,
    deleteResult,
    setProgramTarget,
    clearProgramTarget,
    getProgramTarget,
    toggleProgramFreeze,
    toggleSubjectFreeze,
    syncPassFreeze,
    updateCelebrationCriteria,
    resetCelebrationCriteria,
  }), [
    results,
    freezeConfig,
    celebrationCriteria,
    programTargets,
    selectedProgramFilter,
    sortBy,
    filteredResults,
    sortedResults,
    programAverages,
    trackAverages,
    overallPassedCount,
    totalCoreCoursesCount,
    coreCoursesPassedPercent,
    isMilestoneAchieved,
    showCelebrationModal,
    setShowCelebrationModal,
    triggerMilestoneCelebration,
    setSelectedProgramFilter,
    setSortBy,
    addResult,
    updateResult,
    deleteResult,
    setProgramTarget,
    clearProgramTarget,
    getProgramTarget,
    toggleProgramFreeze,
    toggleSubjectFreeze,
    syncPassFreeze,
    updateCelebrationCriteria,
    resetCelebrationCriteria,
  ]);

  return (
    <OutcomeContext.Provider value={contextValue}>
      {children}
    </OutcomeContext.Provider>
  );
};

export function useOutcome(): OutcomeContextType {
  const context = useContext(OutcomeContext);
  if (!context) {
    return {
      results: [],
      freezeConfig: { frozenProgramIds: [], frozenSubjectIds: [] },
      celebrationCriteria: { requiredProgramIds: [], requiredSubjectIds: [], isCustomized: false },
      programTargets: {},
      selectedProgramFilter: 'ALL',
      sortBy: 'NEWEST',
      totalLoggedCount: 0,
      filteredResults: [],
      sortedResults: [],
      programAverages: [],
      trackAverages: [],
      overallPassedCount: 0,
      totalCoreCoursesCount: 0,
      coreCoursesPassedPercent: 0,
      isMilestoneAchieved: false,
      showCelebrationModal: false,
      setShowCelebrationModal: () => {},
      triggerMilestoneCelebration: () => {},
      setSelectedProgramFilter: () => {},
      setSortBy: () => {},
      addResult: async () => {},
      updateResult: async () => {},
      deleteResult: async () => {},
      setProgramTarget: async () => {},
      clearProgramTarget: async () => {},
      getProgramTarget: () => ({
        targetCgpa: 0,
        targetGrade: 'None',
        isNone: true,
        display: 'Target: None',
        source: 'default' as const,
      }),
      toggleProgramFreeze: async () => {},
      toggleSubjectFreeze: async () => {},
      syncPassFreeze: async () => {},
      updateCelebrationCriteria: async () => {},
      resetCelebrationCriteria: async () => {},
    };
  }
  return context;
}
