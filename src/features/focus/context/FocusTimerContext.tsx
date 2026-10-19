/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../lib/firebase';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { 
  TimerMode, 
  TimerStatus, 
  TimerPreset, 
  ActiveTimerData, 
  FocusSession, 
  SubjectTarget,
  FocusTargetHistoryEntry
} from '../types';
import { playFocusCompletionChime } from '../utils/audioChime';
import { 
  sortTargetHistory, 
  setOrUpdateTargetEntry, 
  removeTargetEntry, 
  getCurrentTarget, 
  formatLocalDateString 
} from '../utils/targetHistoryUtils';
import { 
  getActiveUserId, 
  recordDeletion, 
  filterDeletedItems 
} from '../../../lib/tombstones';

interface FocusTimerContextType {
  // Timer State
  mode: TimerMode;
  status: TimerStatus;
  preset: TimerPreset;
  selectedSubject: string;
  targetDuration: number; // in seconds
  accumulatedTime: number; // in milliseconds
  startTime: number | null; // epoch ms
  alarmRangeStart: string; // "HH:mm"
  alarmRangeEnd: string; // "HH:mm"
  clockOffsetMs: number;

  // Real-time calculation values (updated locally via rAF)
  displayElapsedMs: number;
  displayRemainingMs: number;
  displayHours: string;
  displayMinutes: string;
  displaySeconds: string;
  displaySubSeconds: string;
  dialSecondsAngle: number;
  dialMinutesAngle: number;
  progressPercent: number;

  // Actions
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  setMode: (mode: TimerMode) => Promise<void>;
  setPreset: (preset: TimerPreset, customSeconds?: number) => Promise<void>;
  setSelectedSubject: (subject: string) => Promise<void>;
  setAlarmRange: (start: string, end: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;

  // Session History & Target Tracking
  sessions: FocusSession[];
  targets: SubjectTarget[];
  targetHistory: FocusTargetHistoryEntry[];
  dailyTargetHours: number | null;
  updateDailyTarget: (newTargetHours: number, effectiveDate?: string) => Promise<void>;
  deleteTargetHistoryEntry: (id: string) => Promise<void>;
  clearAllTargetHistory: () => Promise<void>;
  addManualSession: (session: Omit<FocusSession, 'id' | 'createdAt'>) => Promise<void>;
  editSession: (id: string, updatedData: Partial<Omit<FocusSession, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addTarget: (subject: string, targetMinutes: number, startDate?: string) => Promise<void>;
  editTarget: (id: string, updatedData: { subject: string; targetMinutes: number; startDate?: string }) => Promise<void>;
  toggleTarget: (id: string) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;
}

export const FocusTimerContext = createContext<FocusTimerContextType | undefined>(undefined);

const LOCAL_STORAGE_TIMER_KEY = 'x29_active_timer_state';
const LOCAL_STORAGE_SESSIONS_KEY = 'x29_focus_sessions';
const LOCAL_STORAGE_TARGETS_KEY = 'x29_subject_targets';
const LOCAL_STORAGE_TARGET_HISTORY_KEY = 'x29_focus_target_history';
const LOCAL_STORAGE_DAILY_TARGET_KEY = 'x29_focus_daily_target_hours';

function getCurrentTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDefaultFinishTimeString(): string {
  const d = new Date();
  const nextHour = (d.getHours() + 1) % 24;
  return `${String(nextHour).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_TIMER_STATE: ActiveTimerData = {
  mode: 'STOPWATCH',
  status: 'IDLE',
  startTime: null,
  accumulatedTime: 0,
  targetDuration: 0,
  selectedSubject: 'General Study',
  preset: 'FREE',
  alarmRangeStart: getCurrentTimeString(),
  alarmRangeEnd: getDefaultFinishTimeString(),
  updatedAt: 0,
  clientUpdatedAt: 0,
};

export function syncTargetsWithSessions(
  targetsList: SubjectTarget[],
  sessionsList: FocusSession[]
): SubjectTarget[] {
  return targetsList.map((target) => {
    const targetStartDate = target.startDate || (target.createdAt ? target.createdAt.split('T')[0] : '');

    const matchingSessions = sessionsList.filter((s) => {
      if (s.subject.trim().toLowerCase() !== target.subject.trim().toLowerCase()) {
        return false;
      }
      if (targetStartDate && s.date < targetStartDate) {
        return false;
      }
      return true;
    });

    const totalCompletedMinutes = matchingSessions.reduce(
      (acc, s) => acc + Math.round((s.durationSeconds || 0) / 60),
      0
    );

    return {
      ...target,
      completedMinutes: totalCompletedMinutes,
      isCompleted: totalCompletedMinutes >= target.targetMinutes,
    };
  });
}

/**
 * Compare focus sessions descending: newer date first, then newer time, then createdAt.
 */
export function compareSessionsDesc(a: FocusSession, b: FocusSession): number {
  const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
  const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }

  const timeA = a.time || (a.createdAt && a.createdAt.includes('T') ? a.createdAt.split('T')[1].slice(0, 5) : '');
  const timeB = b.time || (b.createdAt && b.createdAt.includes('T') ? b.createdAt.split('T')[1].slice(0, 5) : '');
  if (timeA !== timeB) {
    return timeB.localeCompare(timeA);
  }

  const createdA = a.createdAt || '';
  const createdB = b.createdAt || '';
  if (createdA !== createdB) {
    return createdB.localeCompare(createdA);
  }

  return (b.id || '').localeCompare(a.id || '');
}

export const FocusTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthSync();

  // Primary state backed by Firestore/LocalStorage
  const [timerState, setTimerState] = useState<ActiveTimerData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TIMER_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_TIMER_STATE;
  });

  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = filterDeletedItems(parsed, getActiveUserId()) as FocusSession[];
        return [...filtered].sort(compareSessionsDesc);
      }
    } catch {}
    return [];
  });

  const [targets, setTargets] = useState<SubjectTarget[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TARGETS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = filterDeletedItems(parsed, getActiveUserId()) as SubjectTarget[];
        return syncTargetsWithSessions(filtered, sessions);
      }
    } catch {}
    return [];
  });

  const isDemoTargetEntry = (entry: FocusTargetHistoryEntry): boolean => {
    if (!entry) return false;
    if (entry.id === 'target_hist_init') return true;
    if (
      (entry.effectiveDate?.endsWith('-08-01') && entry.targetHours === 8) ||
      (entry.effectiveDate?.endsWith('-09-01') && entry.targetHours === 6) ||
      (entry.effectiveDate?.endsWith('-10-01') && entry.targetHours === 4)
    ) {
      return true;
    }
    return false;
  };

  const [targetHistory, setTargetHistory] = useState<FocusTargetHistoryEntry[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TARGET_HISTORY_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonDemo = parsed.filter((e) => !isDemoTargetEntry(e));
          if (nonDemo.length !== parsed.length) {
            localStorage.setItem(LOCAL_STORAGE_TARGET_HISTORY_KEY, JSON.stringify(nonDemo));
          }
          if (nonDemo.length > 0) {
            return sortTargetHistory(nonDemo);
          }
        }
      }
      // Backward compatibility check for legacy single target (only if user explicitly configured non-default)
      const legacyTarget = localStorage.getItem(LOCAL_STORAGE_DAILY_TARGET_KEY);
      if (legacyTarget) {
        const parsedTarget = parseFloat(legacyTarget);
        if (!isNaN(parsedTarget) && parsedTarget > 0 && parsedTarget !== 4) {
          return [
            {
              id: 'target_hist_legacy',
              targetHours: parsedTarget,
              effectiveDate: formatLocalDateString(new Date()),
              createdAt: new Date().toISOString(),
              scope: 'DAILY_FOCUS',
            },
          ];
        }
      }
    } catch {}
    // Fully empty: No automatic target initialization
    return [];
  });

  const targetHistoryRef = useRef<FocusTargetHistoryEntry[]>(targetHistory);
  targetHistoryRef.current = targetHistory;

  const clockOffsetMs = 0;

  // High-performance client-side ticking values (Zero writes)
  const [tickerState, setTickerState] = useState({
    elapsedMs: 0,
    remainingMs: 0,
    hours: '00',
    minutes: '00',
    seconds: '00',
    subSeconds: '00',
    dialSecondsAngle: 0,
    dialMinutesAngle: 0,
    progressPercent: 0,
  });

  const timerStateRef = useRef<ActiveTimerData>(timerState);
  timerStateRef.current = timerState;

  const activeWritesCountRef = useRef<number>(0);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastLocalActionTimeRef = useRef<number>(timerState.clientUpdatedAt || timerState.updatedAt || 0);
  const lastProcessedStorageJsonRef = useRef<string>('');
  const chimePlayedRef = useRef<boolean>(false);

  // Strict sequential write queue for activeTimer Firestore doc to eliminate network race conditions
  const enqueueFirestoreWrite = useCallback((dataToSync: Record<string, any>) => {
    const currentDb = db;
    const currentUser = user;
    if (!currentUser || !currentDb || !isFirebaseConfigured) return;

    activeWritesCountRef.current++;
    writeQueueRef.current = writeQueueRef.current
      .catch(() => {})
      .then(async () => {
        try {
          const docRef = doc(currentDb, 'users', currentUser.uid, 'data', 'activeTimer');
          await setDoc(docRef, {
            ...dataToSync,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (err) {
          console.error('[FocusTimer] Firestore write failed:', err);
        } finally {
          activeWritesCountRef.current = Math.max(0, activeWritesCountRef.current - 1);
        }
      });
  }, [user]);

  const enqueueFirestoreWriteRef = useRef(enqueueFirestoreWrite);
  enqueueFirestoreWriteRef.current = enqueueFirestoreWrite;

  // Persist local cache for instant offline restore with cross-tab loop suppression
  useEffect(() => {
    try {
      const currentJson = JSON.stringify(timerState);
      if (currentJson === lastProcessedStorageJsonRef.current) {
        return;
      }

      const cached = localStorage.getItem(LOCAL_STORAGE_TIMER_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const currentTimestamp = timerState.clientUpdatedAt || timerState.updatedAt || 0;
          const cachedTimestamp = parsed.clientUpdatedAt || parsed.updatedAt || 0;
          if (cachedTimestamp > currentTimestamp) {
            return;
          }
        } catch {}
      }

      lastProcessedStorageJsonRef.current = currentJson;
      localStorage.setItem(LOCAL_STORAGE_TIMER_KEY, currentJson);
    } catch {}
  }, [timerState]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(targets));
    } catch {}
  }, [targets]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TARGET_HISTORY_KEY, JSON.stringify(targetHistory));
      const current = getCurrentTarget(targetHistory, null);
      if (current !== null) {
        localStorage.setItem(LOCAL_STORAGE_DAILY_TARGET_KEY, String(current));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_DAILY_TARGET_KEY);
      }
    } catch {}
  }, [targetHistory]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. REAL-TIME FIRESTORE LISTENER (SINGLE LISTENER, STRICT QUOTA CONSERVATION)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db || !isFirebaseConfigured) return;

    // Single doc for active timer state
    const timerDocRef = doc(db, 'users', user.uid, 'data', 'activeTimer');

    const unsubscribeTimer = onSnapshot(
      timerDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        // 1. If local client is actively writing this update, don't overwrite optimistic local state
        if (snapshot.metadata.hasPendingWrites && activeWritesCountRef.current > 0) {
          return;
        }

        // 2. Reject remote snapshots that are strictly older than our most recent local user action
        const remoteUpdatedAt = typeof data.clientUpdatedAt === 'number'
          ? data.clientUpdatedAt
          : (data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (typeof data.updatedAt === 'number' ? data.updatedAt : 0));

        if (remoteUpdatedAt && remoteUpdatedAt < lastLocalActionTimeRef.current) {
          return;
        }

        // Convert Firestore Timestamps or number to epoch ms
        let parsedStartTime: number | null = null;
        if (data.startTime instanceof Timestamp) {
          parsedStartTime = data.startTime.toMillis();
        } else if (typeof data.startTime === 'number') {
          parsedStartTime = data.startTime;
        }

        const current = timerStateRef.current;
        const resolvedStatus = (data.status as TimerStatus) || current.status;
        const resolvedStartTime = resolvedStatus === 'RUNNING'
          ? (parsedStartTime ?? current.startTime)
          : null;

        // Handle sound chime if timer completed on another device
        if (resolvedStatus === 'COMPLETED' && current.status === 'RUNNING' && !chimePlayedRef.current) {
          playFocusCompletionChime();
          chimePlayedRef.current = true;
        } else if (resolvedStatus === 'RUNNING') {
          chimePlayedRef.current = false;
        }

        const effectiveUpdatedAt = remoteUpdatedAt || Date.now();
        lastLocalActionTimeRef.current = Math.max(lastLocalActionTimeRef.current, effectiveUpdatedAt);

        const nextState: ActiveTimerData = {
          ...current,
          mode: data.mode || current.mode,
          status: resolvedStatus,
          startTime: resolvedStartTime,
          accumulatedTime: typeof data.accumulatedTime === 'number' ? data.accumulatedTime : current.accumulatedTime,
          targetDuration: typeof data.targetDuration === 'number' ? data.targetDuration : current.targetDuration,
          selectedSubject: data.selectedSubject || current.selectedSubject,
          preset: data.preset || current.preset,
          alarmRangeStart: data.alarmRangeStart || current.alarmRangeStart,
          alarmRangeEnd: data.alarmRangeEnd || current.alarmRangeEnd,
          updatedAt: effectiveUpdatedAt,
          clientUpdatedAt: effectiveUpdatedAt,
        };

        timerStateRef.current = nextState;
        setTimerState(nextState);
      },
      (error) => {
        console.warn('[FocusTimer] Snapshot subscription error:', error);
      }
    );

    // Single doc for focus deck (Sessions history & Subject targets)
    const deckDocRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
    const unsubscribeDeck = onSnapshot(
      deckDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        let loadedSessions: FocusSession[] = sessions;
        if (Array.isArray(data.sessions)) {
          loadedSessions = [...data.sessions].sort(compareSessionsDesc);
          setSessions(loadedSessions);
        }
        if (Array.isArray(data.targets)) {
          const synced = syncTargetsWithSessions(data.targets, loadedSessions);
          setTargets(synced);
        }
        if (Array.isArray(data.targetHistory)) {
          const nonDemo = data.targetHistory.filter((e: FocusTargetHistoryEntry) => !isDemoTargetEntry(e));
          setTargetHistory(sortTargetHistory(nonDemo));
        }
      },
      (error) => {
        console.warn('[FocusDeck] Deck subscription error:', error);
      }
    );

    // Unsubscribe listeners cleanly on unmount
    return () => {
      unsubscribeTimer();
      unsubscribeDeck();
    };
  }, [user]);

  // Instant re-sync when screen turns back on / tab gains visibility (especially crucial for mobile devices)
  useEffect(() => {
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible' && user && db && isFirebaseConfigured) {
        const timerDocRef = doc(db, 'users', user.uid, 'data', 'activeTimer');
        getDoc(timerDocRef).then((snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();

          const remoteUpdatedAt = typeof data.clientUpdatedAt === 'number'
            ? data.clientUpdatedAt
            : (data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (typeof data.updatedAt === 'number' ? data.updatedAt : 0));

          const currentLatest = Math.max(
            lastLocalActionTimeRef.current,
            timerStateRef.current.clientUpdatedAt || 0,
            timerStateRef.current.updatedAt || 0
          );
          if (remoteUpdatedAt && remoteUpdatedAt <= currentLatest) {
            return;
          }

          let parsedStartTime: number | null = null;
          if (data.startTime instanceof Timestamp) {
            parsedStartTime = data.startTime.toMillis();
          } else if (typeof data.startTime === 'number') {
            parsedStartTime = data.startTime;
          }

          const current = timerStateRef.current;
          const resolvedStatus = (data.status as TimerStatus) || current.status;
          const resolvedStartTime = resolvedStatus === 'RUNNING'
            ? (parsedStartTime ?? current.startTime)
            : null;

          const effectiveUpdatedAt = remoteUpdatedAt || Date.now();
          lastLocalActionTimeRef.current = Math.max(lastLocalActionTimeRef.current, effectiveUpdatedAt);

          const nextState: ActiveTimerData = {
            ...current,
            mode: data.mode || current.mode,
            status: resolvedStatus,
            startTime: resolvedStartTime,
            accumulatedTime: typeof data.accumulatedTime === 'number' ? data.accumulatedTime : current.accumulatedTime,
            targetDuration: typeof data.targetDuration === 'number' ? data.targetDuration : current.targetDuration,
            selectedSubject: data.selectedSubject || current.selectedSubject,
            preset: data.preset || current.preset,
            alarmRangeStart: data.alarmRangeStart || current.alarmRangeStart,
            alarmRangeEnd: data.alarmRangeEnd || current.alarmRangeEnd,
            updatedAt: effectiveUpdatedAt,
            clientUpdatedAt: effectiveUpdatedAt,
          };

          timerStateRef.current = nextState;
          setTimerState(nextState);
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('focus', handleVisibilitySync);

    // Cross-tab real-time sync on the same device with loop suppression
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_TIMER_KEY && e.newValue) {
        try {
          const parsed: ActiveTimerData = JSON.parse(e.newValue);
          const incomingUpdatedAt = typeof parsed.clientUpdatedAt === 'number'
            ? parsed.clientUpdatedAt
            : (typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0);

          const currentLatest = Math.max(
            lastLocalActionTimeRef.current,
            timerStateRef.current.clientUpdatedAt || 0,
            timerStateRef.current.updatedAt || 0
          );
          if (incomingUpdatedAt && incomingUpdatedAt <= currentLatest) {
            return;
          }

          lastProcessedStorageJsonRef.current = e.newValue;
          lastLocalActionTimeRef.current = incomingUpdatedAt;

          const current = timerStateRef.current;
          const resolvedStatus = parsed.status || current.status;
          const resolvedStartTime = resolvedStatus === 'RUNNING' ? parsed.startTime : null;

          const nextState: ActiveTimerData = {
            ...current,
            ...parsed,
            status: resolvedStatus,
            startTime: resolvedStartTime,
            updatedAt: incomingUpdatedAt,
            clientUpdatedAt: incomingUpdatedAt,
          };

          timerStateRef.current = nextState;
          setTimerState(nextState);
        } catch {}
      }
      if (e.key === LOCAL_STORAGE_TARGET_HISTORY_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setTargetHistory(sortTargetHistory(parsed));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('focus', handleVisibilitySync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CLIENT-SIDE TICKING ENGINE (ZERO-WRITE TICKING VIA requestAnimationFrame)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Helper to compute a single snapshot of the ticker state
    const computeCurrentTicker = () => {
      const current = timerStateRef.current;
      const now = Date.now();

      let elapsedMs = current.accumulatedTime;
      if (current.status === 'RUNNING' && current.startTime) {
        const additional = Math.max(0, now - current.startTime);
        elapsedMs += additional;
      }

      let remainingMs = 0;
      let progress = 0;

      if (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') {
        const totalMs = (current.targetDuration || 0) * 1000;
        remainingMs = Math.max(0, totalMs - elapsedMs);
        progress = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;
      } else if (current.mode === 'STOPWATCH') {
        remainingMs = elapsedMs;
        progress = 0;
      }

      const timeToFormat = (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') ? remainingMs : elapsedMs;
      const totalSeconds = Math.floor(Math.max(0, timeToFormat) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const centis = Math.floor((Math.max(0, timeToFormat) % 1000) / 10);

      let dialSecondsAngle = 0;
      let dialMinutesAngle = 0;

      if (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') {
        if (current.status !== 'IDLE') {
          const cycleElapsedSec = (elapsedMs % 60000) / 1000;
          dialSecondsAngle = (cycleElapsedSec / 60) * 360;
          const cycleElapsedMin = (elapsedMs % 1800000) / 60000;
          dialMinutesAngle = (cycleElapsedMin / 30) * 360;
        }
      } else if (current.mode === 'STOPWATCH') {
        const cycleElapsedSec = (elapsedMs % 60000) / 1000;
        dialSecondsAngle = (cycleElapsedSec / 60) * 360;
        const cycleElapsedMin = (elapsedMs % 1800000) / 60000;
        dialMinutesAngle = (cycleElapsedMin / 30) * 360;
      }

      return {
        elapsedMs,
        remainingMs,
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        subSeconds: String(centis).padStart(2, '0'),
        dialSecondsAngle,
        dialMinutesAngle,
        progressPercent: progress,
      };
    };

    // When timer is not actively running, calculate once and do NOT run RAF loop
    if (timerState.status !== 'RUNNING') {
      setTickerState(computeCurrentTicker());
      return;
    }

    let animationFrameId: number;
    let lastRenderTime = 0;
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const minFrameDelta = isMobileDevice ? 33 : 16;

    const renderTick = (currentTimestamp: number) => {
      // If document is in background/screen off, skip RAF state updates
      if (typeof document !== 'undefined' && document.hidden) {
        animationFrameId = requestAnimationFrame(renderTick);
        return;
      }

      // Throttle rendering: ~30fps on mobile for battery & CPU conservation, ~60fps on desktop
      if (currentTimestamp - lastRenderTime >= minFrameDelta) {
        lastRenderTime = currentTimestamp;

        const current = timerStateRef.current;
        const now = Date.now();

        let elapsedMs = current.accumulatedTime;
        if (current.status === 'RUNNING' && current.startTime) {
          const additional = Math.max(0, now - current.startTime);
          elapsedMs += additional;
        }

        let remainingMs = 0;
        let progress = 0;

        if (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') {
          const totalMs = (current.targetDuration || 0) * 1000;
          remainingMs = Math.max(0, totalMs - elapsedMs);
          progress = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 0;

          // Check for countdown completion
          if (current.status === 'RUNNING' && remainingMs <= 0 && current.targetDuration > 0) {
            if (!chimePlayedRef.current) {
              playFocusCompletionChime();
              chimePlayedRef.current = true;
            }
            const actionTimestamp = Math.max(Date.now(), (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
            lastLocalActionTimeRef.current = actionTimestamp;

            // Transition locally to COMPLETED
            const completedState: ActiveTimerData = {
              ...current,
              status: 'COMPLETED',
              accumulatedTime: current.targetDuration * 1000,
              startTime: null,
              updatedAt: actionTimestamp,
              clientUpdatedAt: actionTimestamp,
            };
            timerStateRef.current = completedState;
            setTimerState(completedState);

            // Persist single write completion to Firestore via queue
            enqueueFirestoreWriteRef.current({
              status: 'COMPLETED',
              accumulatedTime: current.targetDuration * 1000,
              startTime: null,
              clientUpdatedAt: actionTimestamp,
            });
            return;
          }
        } else if (current.mode === 'STOPWATCH') {
          remainingMs = elapsedMs;
          progress = 0;
        }

        // Time to display depends on mode
        const timeToFormat = (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') ? remainingMs : elapsedMs;
        const totalSeconds = Math.floor(Math.max(0, timeToFormat) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const centis = Math.floor((Math.max(0, timeToFormat) % 1000) / 10);

        // Analog Dial Angles: MUST ALWAYS RUN CLOCKWISE across all modes
        let dialSecondsAngle = 0;
        let dialMinutesAngle = 0;

        if (current.mode === 'TIMER' || current.mode === 'ALARM_RANGE') {
          if (current.status === 'IDLE') {
            dialSecondsAngle = 0;
            dialMinutesAngle = 0;
          } else {
            const cycleElapsedSec = (elapsedMs % 60000) / 1000;
            dialSecondsAngle = (cycleElapsedSec / 60) * 360;

            const cycleElapsedMin = (elapsedMs % 1800000) / 60000;
            dialMinutesAngle = (cycleElapsedMin / 30) * 360;
          }
        } else if (current.mode === 'STOPWATCH') {
          const cycleElapsedSec = (elapsedMs % 60000) / 1000;
          dialSecondsAngle = (cycleElapsedSec / 60) * 360;

          const cycleElapsedMin = (elapsedMs % 1800000) / 60000;
          dialMinutesAngle = (cycleElapsedMin / 30) * 360;
        }

        setTickerState({
          elapsedMs,
          remainingMs,
          hours: String(hours).padStart(2, '0'),
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0'),
          subSeconds: String(centis).padStart(2, '0'),
          dialSecondsAngle,
          dialMinutesAngle,
          progressPercent: progress,
        });
      }

      animationFrameId = requestAnimationFrame(renderTick);
    };

    animationFrameId = requestAnimationFrame(renderTick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [user, timerState.status, timerState.mode, timerState.accumulatedTime, timerState.targetDuration]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ZERO-WRITE DISPATCH ACTIONS (SINGLE WRITE PER USER INTERACTION ONLY)
  // ─────────────────────────────────────────────────────────────────────────────

  // START / RESUME: 1 single write
  const startTimer = useCallback(async () => {
    chimePlayedRef.current = false;
    const current = timerStateRef.current;
    if (current.status === 'RUNNING') return;

    const now = Date.now();
    const actionTimestamp = Math.max(now, (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    let alarmRangeStart = current.alarmRangeStart;
    let targetDuration = current.targetDuration;

    // In ALARM_RANGE mode, start time is always current time at start,
    // and timer duration is set from start time to finish time (alarmRangeEnd)
    if (current.mode === 'ALARM_RANGE' && current.status === 'IDLE') {
      const nowObj = new Date(actionTimestamp);
      alarmRangeStart = `${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;

      const [startH, startM] = alarmRangeStart.split(':').map(Number);
      const [endH, endM] = (current.alarmRangeEnd || getDefaultFinishTimeString()).split(':').map(Number);
      let startSec = (startH || 0) * 3600 + (startM || 0) * 60;
      let endSec = (endH || 0) * 3600 + (endM || 0) * 60;
      if (endSec <= startSec) {
        endSec += 86400; // overnight finish
      }
      targetDuration = Math.max(60, endSec - startSec);
    }

    const updatedState: ActiveTimerData = {
      ...current,
      status: 'RUNNING',
      startTime: actionTimestamp,
      accumulatedTime: current.accumulatedTime,
      alarmRangeStart,
      targetDuration,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      userId: user?.uid,
      mode: current.mode,
      status: 'RUNNING',
      startTime: actionTimestamp,
      accumulatedTime: current.accumulatedTime,
      targetDuration,
      selectedSubject: current.selectedSubject,
      preset: current.preset,
      alarmRangeStart,
      alarmRangeEnd: current.alarmRangeEnd,
      clientUpdatedAt: actionTimestamp,
    });
  }, [user, enqueueFirestoreWrite]);

  // PAUSE: 1 single write
  const pauseTimer = useCallback(async () => {
    const current = timerStateRef.current;
    if (current.status !== 'RUNNING') return;

    const now = Date.now();
    const actionTimestamp = Math.max(now, (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    const additional = current.startTime ? Math.max(0, actionTimestamp - current.startTime) : 0;
    const newAccumulated = current.accumulatedTime + additional;

    const updatedState: ActiveTimerData = {
      ...current,
      status: 'PAUSED',
      startTime: null,
      accumulatedTime: newAccumulated,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      status: 'PAUSED',
      startTime: null,
      accumulatedTime: newAccumulated,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // RESET: 1 single write
  const resetTimer = useCallback(async () => {
    chimePlayedRef.current = false;
    const current = timerStateRef.current;

    const now = Date.now();
    const actionTimestamp = Math.max(now, (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    let alarmRangeStart = current.alarmRangeStart;
    let alarmRangeEnd = current.alarmRangeEnd;
    let targetDuration = current.targetDuration;

    if (current.mode === 'ALARM_RANGE') {
      const nowObj = new Date(actionTimestamp);
      alarmRangeStart = `${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;
      const finishH = (nowObj.getHours() + 1) % 24;
      alarmRangeEnd = `${String(finishH).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;
      targetDuration = 3600;
    }

    const updatedState: ActiveTimerData = {
      ...current,
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      alarmRangeStart,
      alarmRangeEnd,
      targetDuration,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      alarmRangeStart,
      alarmRangeEnd,
      targetDuration,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // SET MODE: 1 single write
  const setMode = useCallback(async (newMode: TimerMode) => {
    const current = timerStateRef.current;
    if (current.mode === newMode) return;

    const actionTimestamp = Math.max(Date.now(), (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    let targetDuration = current.targetDuration;
    let preset = current.preset;
    let alarmRangeStart = current.alarmRangeStart;
    let alarmRangeEnd = current.alarmRangeEnd;

    if (newMode === 'TIMER' && targetDuration === 0) {
      targetDuration = 25 * 60;
      preset = '25';
    } else if (newMode === 'STOPWATCH') {
      targetDuration = 0;
      preset = 'FREE';
    } else if (newMode === 'ALARM_RANGE') {
      const nowObj = new Date(actionTimestamp);
      const currentH = nowObj.getHours();
      const currentM = nowObj.getMinutes();
      alarmRangeStart = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
      const finishH = (currentH + 1) % 24;
      alarmRangeEnd = `${String(finishH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
      targetDuration = 3600; // 1 hour
      preset = 'CUSTOM';
    }

    // Reset elapsed time when switching modes
    const updatedState: ActiveTimerData = {
      ...current,
      mode: newMode,
      preset,
      targetDuration,
      alarmRangeStart,
      alarmRangeEnd,
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      mode: newMode,
      preset,
      targetDuration,
      alarmRangeStart,
      alarmRangeEnd,
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // SET PRESET: 1 single write
  const setPreset = useCallback(async (preset: TimerPreset, customSeconds?: number) => {
    let targetDuration = 0;
    let mode: TimerMode = 'TIMER';

    if (preset === 'FREE') {
      mode = 'STOPWATCH';
      targetDuration = 0;
    } else if (preset === '15') {
      targetDuration = 15 * 60;
    } else if (preset === '25') {
      targetDuration = 25 * 60;
    } else if (preset === '45') {
      targetDuration = 45 * 60;
    } else if (preset === '60') {
      targetDuration = 60 * 60;
    } else if (preset === 'CUSTOM' && customSeconds !== undefined) {
      targetDuration = customSeconds;
    }

    const current = timerStateRef.current;
    const actionTimestamp = Math.max(Date.now(), (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    const updatedState: ActiveTimerData = {
      ...current,
      preset,
      mode,
      targetDuration,
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      preset,
      mode,
      targetDuration,
      status: 'IDLE',
      startTime: null,
      accumulatedTime: 0,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // SET SUBJECT: 1 single write
  const setSelectedSubject = useCallback(async (subject: string) => {
    const current = timerStateRef.current;
    if (current.selectedSubject === subject) return;

    const actionTimestamp = Math.max(Date.now(), (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    const updatedState: ActiveTimerData = {
      ...current,
      selectedSubject: subject,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      selectedSubject: subject,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // SET ALARM RANGE: 1 single write
  const setAlarmRange = useCallback(async (start: string, end: string) => {
    const [startH, startM] = (start || '00:00').split(':').map(Number);
    const [endH, endM] = (end || '00:00').split(':').map(Number);
    let startSec = (startH || 0) * 3600 + (startM || 0) * 60;
    let endSec = (endH || 0) * 3600 + (endM || 0) * 60;
    if (endSec <= startSec) {
      endSec += 86400; // crosses midnight
    }
    const targetDuration = Math.max(60, endSec - startSec);

    const current = timerStateRef.current;
    const actionTimestamp = Math.max(Date.now(), (current.clientUpdatedAt || current.updatedAt || 0) + 1, lastLocalActionTimeRef.current + 1);
    lastLocalActionTimeRef.current = actionTimestamp;

    const updatedState: ActiveTimerData = {
      ...current,
      alarmRangeStart: start,
      alarmRangeEnd: end,
      targetDuration,
      status: current.status === 'RUNNING' ? current.status : 'IDLE',
      startTime: current.status === 'RUNNING' ? current.startTime : null,
      accumulatedTime: current.status === 'RUNNING' ? current.accumulatedTime : 0,
      updatedAt: actionTimestamp,
      clientUpdatedAt: actionTimestamp,
    };

    timerStateRef.current = updatedState;
    setTimerState(updatedState);

    enqueueFirestoreWrite({
      alarmRangeStart: start,
      alarmRangeEnd: end,
      targetDuration,
      clientUpdatedAt: actionTimestamp,
    });
  }, [enqueueFirestoreWrite]);

  // SAVE CURRENT SESSION: 1 single write
  const saveCurrentSession = useCallback(async () => {
    const current = timerStateRef.current;
    const now = Date.now();

    let finalElapsedMs = current.accumulatedTime;
    if (current.status === 'RUNNING' && current.startTime) {
      finalElapsedMs += Math.max(0, now - current.startTime);
    }

    const durationSeconds = Math.max(1, Math.round(finalElapsedMs / 1000));
    const nowObj = new Date(now);
    const dateStr = nowObj.toISOString().split('T')[0];
    const timeStr = nowObj.toTimeString().slice(0, 5);

    const newSession: FocusSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: nowObj.toISOString(),
      date: dateStr,
      time: timeStr,
      subject: current.selectedSubject || 'General Study',
      durationSeconds,
      mode: current.mode,
    };

    const updatedSessions = [newSession, ...sessions].sort(compareSessionsDesc);
    setSessions(updatedSessions);

    // Synchronize all targets with updated session list
    const updatedTargets = syncTargetsWithSessions(targets, updatedSessions);
    setTargets(updatedTargets);

    // Reset current active timer
    await resetTimer();

    // Persist to focusDeck in 1 single write
    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          sessions: updatedSessions,
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to persist session history:', err);
      }
    }
  }, [sessions, targets, resetTimer, user]);

  // ADD MANUAL SESSION: 1 single write
  const addManualSession = useCallback(async (sessionData: Omit<FocusSession, 'id' | 'createdAt'>) => {
    const newSession: FocusSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...sessionData,
    };

    const updatedSessions = [newSession, ...sessions].sort(compareSessionsDesc);
    setSessions(updatedSessions);

    // Synchronize targets with newly added session
    const updatedTargets = syncTargetsWithSessions(targets, updatedSessions);
    setTargets(updatedTargets);

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          sessions: updatedSessions,
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to add manual session:', err);
      }
    }
  }, [sessions, targets, user]);

  // EDIT SESSION: 1 single write
  const editSession = useCallback(async (id: string, updatedData: Partial<Omit<FocusSession, 'id' | 'createdAt'>>) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, ...updatedData } : s)).sort(compareSessionsDesc);
    setSessions(updated);

    // Synchronize targets after session edit
    const updatedTargets = syncTargetsWithSessions(targets, updated);
    setTargets(updatedTargets);

    try {
      localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(updated));
      localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updatedTargets));
    } catch {}

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          sessions: updated,
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to edit session:', err);
      }
    }
  }, [sessions, targets, user]);

  // DELETE SESSION: 1 single write
  const deleteSession = useCallback(async (id: string) => {
    recordDeletion(id, 'focusSession', user?.uid || getActiveUserId());
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);

    // Synchronize targets after session deletion
    const updatedTargets = syncTargetsWithSessions(targets, updated);
    setTargets(updatedTargets);

    try {
      localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(updated));
      localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updatedTargets));
    } catch {}

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          sessions: updated,
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to delete session:', err);
      }
    }
  }, [sessions, targets, user]);

  // ADD TARGET: 1 single write
  const addTarget = useCallback(async (subject: string, targetMinutes: number, startDate?: string) => {
    const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];
    const newTarget: SubjectTarget = {
      id: `target_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      subject,
      targetMinutes,
      completedMinutes: 0,
      isCompleted: false,
      startDate: effectiveStartDate,
      createdAt: new Date().toISOString(),
    };

    // Calculate completed minutes from existing sessions that match startDate
    const updatedTargets = syncTargetsWithSessions([...targets, newTarget], sessions);
    setTargets(updatedTargets);

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to add target:', err);
      }
    }
  }, [targets, sessions, user]);

  // EDIT TARGET: 1 single write
  const editTarget = useCallback(async (id: string, updatedData: { subject: string; targetMinutes: number; startDate?: string }) => {
    const rawUpdatedTargets = targets.map((t) =>
      t.id === id
        ? {
            ...t,
            subject: updatedData.subject,
            targetMinutes: updatedData.targetMinutes,
            startDate: updatedData.startDate !== undefined ? updatedData.startDate : t.startDate,
          }
        : t
    );

    const updatedTargets = syncTargetsWithSessions(rawUpdatedTargets, sessions);
    setTargets(updatedTargets);

    try {
      localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updatedTargets));
    } catch {}

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to edit target:', err);
      }
    }
  }, [targets, sessions, user]);

  // TOGGLE TARGET: 1 single write
  const toggleTarget = useCallback(async (id: string) => {
    const updatedTargets = targets.map((t) => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );
    setTargets(updatedTargets);

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to toggle target:', err);
      }
    }
  }, [targets, user]);

  // DELETE TARGET: 1 single write
  const deleteTarget = useCallback(async (id: string) => {
    recordDeletion(id, 'focusTarget', user?.uid || getActiveUserId());
    const updatedTargets = targets.filter((t) => t.id !== id);
    setTargets(updatedTargets);
    try {
      localStorage.setItem(LOCAL_STORAGE_TARGETS_KEY, JSON.stringify(updatedTargets));
    } catch {}

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targets: updatedTargets,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to delete target:', err);
      }
    }
  }, [targets, user]);

  // UPDATE DAILY TARGET: 1 single write, prevents duplicates
  const updateDailyTarget = useCallback(async (newTargetHours: number, effectiveDate?: string) => {
    const res = setOrUpdateTargetEntry(targetHistoryRef.current, newTargetHours, effectiveDate);
    if (!res.changed) return;

    setTargetHistory(res.updatedHistory);

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targetHistory: res.updatedHistory,
          dailyTargetHours: getCurrentTarget(res.updatedHistory, null),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to persist target history:', err);
      }
    }
  }, [user]);

  // DELETE HISTORICAL TARGET: 1 single write
  const deleteTargetHistoryEntry = useCallback(async (id: string) => {
    const res = removeTargetEntry(targetHistoryRef.current, id);
    if (!res.changed) return;

    setTargetHistory(res.updatedHistory);
    const newDailyTarget = getCurrentTarget(res.updatedHistory, null);
    if (res.updatedHistory.length === 0) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_DAILY_TARGET_KEY);
      } catch {}
    }

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targetHistory: res.updatedHistory,
          dailyTargetHours: newDailyTarget,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to delete target history entry:', err);
      }
    }
  }, [user]);

  // CLEAR ALL TARGETS: 1 single write
  const clearAllTargetHistory = useCallback(async () => {
    setTargetHistory([]);
    try {
      localStorage.setItem(LOCAL_STORAGE_TARGET_HISTORY_KEY, JSON.stringify([]));
      localStorage.removeItem(LOCAL_STORAGE_DAILY_TARGET_KEY);
    } catch {}

    if (user && db && isFirebaseConfigured) {
      try {
        const deckRef = doc(db, 'users', user.uid, 'data', 'focusDeck');
        await setDoc(deckRef, {
          targetHistory: [],
          dailyTargetHours: null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('[FocusTimer] Failed to clear target history:', err);
      }
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    mode: timerState.mode,
    status: timerState.status,
    preset: timerState.preset,
    selectedSubject: timerState.selectedSubject,
    targetDuration: timerState.targetDuration,
    accumulatedTime: timerState.accumulatedTime,
    startTime: timerState.startTime,
    alarmRangeStart: timerState.alarmRangeStart || getCurrentTimeString(),
    alarmRangeEnd: timerState.alarmRangeEnd || getDefaultFinishTimeString(),
    clockOffsetMs,

    displayElapsedMs: tickerState.elapsedMs,
    displayRemainingMs: tickerState.remainingMs,
    displayHours: tickerState.hours,
    displayMinutes: tickerState.minutes,
    displaySeconds: tickerState.seconds,
    displaySubSeconds: tickerState.subSeconds,
    dialSecondsAngle: tickerState.dialSecondsAngle,
    dialMinutesAngle: tickerState.dialMinutesAngle,
    progressPercent: tickerState.progressPercent,

    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setPreset,
    setSelectedSubject,
    setAlarmRange,
    saveCurrentSession,

    sessions,
    targets,
    targetHistory,
    dailyTargetHours: getCurrentTarget(targetHistory, null),
    updateDailyTarget,
    deleteTargetHistoryEntry,
    clearAllTargetHistory,
    addManualSession,
    editSession,
    deleteSession,
    addTarget,
    editTarget,
    toggleTarget,
    deleteTarget,
  }), [
    timerState,
    clockOffsetMs,
    tickerState,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    setPreset,
    setSelectedSubject,
    setAlarmRange,
    saveCurrentSession,
    sessions,
    targets,
    targetHistory,
    updateDailyTarget,
    deleteTargetHistoryEntry,
    clearAllTargetHistory,
    addManualSession,
    editSession,
    deleteSession,
    addTarget,
    editTarget,
    toggleTarget,
    deleteTarget,
  ]);

  return (
    <FocusTimerContext.Provider value={contextValue}>
      {children}
    </FocusTimerContext.Provider>
  );
};

export function useFocusTimer() {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
}
