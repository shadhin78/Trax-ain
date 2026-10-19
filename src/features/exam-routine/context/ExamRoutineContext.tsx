/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../lib/firebase';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { ExamSession, ExamSubject, ExamRoutineData, TimeRemainingBreakdown } from '../types';
import { getActiveUserId, recordDeletion, filterDeletedItems } from '../../../lib/tombstones';
import {
  calculateExamTimeRemaining,
  getExamTimestamp,
  isEligibleUpcomingExam,
  sortExamSubjects,
  THIRTY_MINUTES_MS,
} from '../utils/examTimeUtils';

interface ExamRoutineContextType {
  sessions: ExamSession[];
  pinnedSubjectId: string; // 'AUTO' or specific subject ID
  searchQuery: string;
  statusFilter: 'ALL' | 'UPCOMING' | 'COMPLETED';

  // Computed & Active
  activeExamBanner: {
    subject: ExamSubject;
    session: ExamSession;
    timeRemaining: TimeRemainingBreakdown;
  } | null;
  nearestUpcomingExamId: string | null;
  filteredSessions: ExamSession[];
  allExamSubjects: { subject: ExamSubject; session: ExamSession }[];
  totalExamsCount: number;
  upcomingExamsCount: number;
  completedExamsCount: number;

  // Actions
  setPinnedSubjectId: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (filter: 'ALL' | 'UPCOMING' | 'COMPLETED') => void;
  addSession: (session: Omit<ExamSession, 'id' | 'createdAt' | 'subjects'>) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<ExamSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addExamSubject: (sessionId: string, subject: Omit<ExamSubject, 'id' | 'sessionId' | 'createdAt'>) => Promise<void>;
  updateExamSubject: (sessionId: string, subjectId: string, updates: Partial<ExamSubject>) => Promise<void>;
  deleteExamSubject: (sessionId: string, subjectId: string) => Promise<void>;
  toggleExamCompleted: (sessionId: string, subjectId: string) => Promise<void>;
}

export type { ExamRoutineContextType };
export const ExamRoutineContext = createContext<ExamRoutineContextType | undefined>(undefined);

const LOCAL_STORAGE_EXAM_ROUTINE_KEY = 'x29_exam_routine_data';

export const ExamRoutineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthSync();

  // Sessions state (starts empty without fake demo data)
  const [sessions, setSessions] = useState<ExamSession[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_EXAM_ROUTINE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.sessions)) {
          const uid = user?.uid || getActiveUserId();
          const cleanSessions = filterDeletedItems<ExamSession>(parsed.sessions, uid);
          return cleanSessions.map((s) => ({
            ...s,
            subjects: filterDeletedItems<ExamSubject>(s.subjects || [], uid),
          }));
        }
      }
    } catch {}
    return [];
  });

  const [pinnedSubjectId, setPinnedSubjectIdState] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_EXAM_ROUTINE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.pinnedSubjectId || 'AUTO';
      }
    } catch {}
    return 'AUTO';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('UPCOMING');

  // Client-side ticking counter (re-evaluates countdowns each second without writing to Firestore)
  const [tick, setTick] = useState(0);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const pinnedRef = useRef(pinnedSubjectId);
  pinnedRef.current = pinnedSubjectId;
  const isWritingRef = useRef(false);

  // Live timer tick for countdown displays (Pure client calculation - ZERO FIRESTORE WRITES)
  // Pauses ticking when tab/browser is in background to preserve mobile battery
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (!timer) {
        setTick((t) => (t + 1) % 1000000);
        timer = setInterval(() => {
          setTick((t) => (t + 1) % 1000000);
        }, 1000);
      }
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cache to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_EXAM_ROUTINE_KEY,
        JSON.stringify({
          sessions,
          pinnedSubjectId,
          updatedAt: new Date().toISOString(),
        })
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('x29_exam_routine_updated'));
      }
    } catch {}
  }, [sessions, pinnedSubjectId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SINGLE REAL-TIME FIRESTORE LISTENER (DATABASE FRIENDLY)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db || !isFirebaseConfigured) return;

    const examDocRef = doc(db, 'users', user.uid, 'data', 'examRoutineData');

    const unsubscribe = onSnapshot(
      examDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        if (snapshot.metadata.hasPendingWrites && isWritingRef.current) return;

        const data = snapshot.data();
        const uid = user.uid || getActiveUserId();

        if (Array.isArray(data.sessions)) {
          const validSessions = filterDeletedItems<ExamSession>(data.sessions, uid);
          const cleanSessions = validSessions.map((s) => ({
            ...s,
            subjects: filterDeletedItems<ExamSubject>(s.subjects || [], uid),
          }));
          setSessions(cleanSessions);
        }

        if (data.pinnedSubjectId) {
          setPinnedSubjectIdState(data.pinnedSubjectId);
        }
      },
      (error) => {
        console.warn('[ExamRoutine] Snapshot listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Persist helper (Single write per user action)
  const persistExamRoutine = useCallback(
    async (newSessions: ExamSession[], newPinned: string) => {
      if (!user || !db || !isFirebaseConfigured) return;

      isWritingRef.current = true;
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'examRoutineData');
        await setDoc(
          docRef,
          {
            sessions: newSessions,
            pinnedSubjectId: newPinned,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('[ExamRoutine] Failed to persist data:', err);
      } finally {
        isWritingRef.current = false;
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-COMPLETE LIVE EXAMS AFTER 30 MINUTES
  // (Zero Firestore writes while ticking; exactly ONE write on status transition)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const currentSessions = sessionsRef.current;
    if (!currentSessions || currentSessions.length === 0) return;

    const now = Date.now();
    let hasAutoCompleted = false;

    const updatedSessions = currentSessions.map((session) => {
      let sessionModified = false;
      const updatedSubjects = (session.subjects || []).map((subject) => {
        if (!subject.isCompleted && subject.examDate) {
          const ts = getExamTimestamp(subject.examDate, subject.examTime);
          // If scheduled exam timestamp has passed and 30 minutes have elapsed:
          if (ts > 0 && now >= ts + THIRTY_MINUTES_MS) {
            sessionModified = true;
            hasAutoCompleted = true;
            return {
              ...subject,
              isCompleted: true,
              completedAt: new Date().toISOString(),
            };
          }
        }
        return subject;
      });

      if (sessionModified) {
        return {
          ...session,
          subjects: updatedSubjects,
        };
      }
      return session;
    });

    if (hasAutoCompleted) {
      setSessions(updatedSessions);
      let nextPinned = pinnedRef.current;
      if (nextPinned !== 'AUTO') {
        const stillUncompleted = updatedSessions.some((s) =>
          (s.subjects || []).some((sub) => sub.id === nextPinned && !sub.isCompleted)
        );
        if (!stillUncompleted) {
          nextPinned = 'AUTO';
          setPinnedSubjectIdState('AUTO');
        }
      }
      persistExamRoutine(updatedSessions, nextPinned);
    }
  }, [tick, persistExamRoutine]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. COMPUTED STATE & NEAREST EXAM
  // ─────────────────────────────────────────────────────────────────────────────

  // Flatten all subjects with their session reference, ordered by scheduled countdown
  const allExamSubjects = useMemo(() => {
    const list: { subject: ExamSubject; session: ExamSession }[] = [];
    sessions.forEach((session) => {
      (session.subjects || []).forEach((subject) => {
        list.push({ subject, session });
      });
    });
    const now = Date.now();
    return list.sort((a, b) => {
      const aEligible = isEligibleUpcomingExam(a.subject, now);
      const bEligible = isEligibleUpcomingExam(b.subject, now);
      if (aEligible && !bEligible) return -1;
      if (!aEligible && bEligible) return 1;

      const aTs = getExamTimestamp(a.subject.examDate, a.subject.examTime);
      const bTs = getExamTimestamp(b.subject.examDate, b.subject.examTime);
      if (aTs !== bTs) return aTs - bTs;

      const nameComp = (a.subject.subjectName || '').localeCompare(b.subject.subjectName || '');
      if (nameComp !== 0) return nameComp;
      return a.subject.id.localeCompare(b.subject.id);
    });
  }, [sessions, tick]);

  // The nearest eligible upcoming exam across all sessions (determines the single active neon glow card)
  const nearestUpcomingExamId = useMemo(() => {
    const now = Date.now();
    const eligible = allExamSubjects
      .filter((item) => isEligibleUpcomingExam(item.subject, now))
      .map((item) => ({
        id: item.subject.id,
        name: item.subject.subjectName,
        timestamp: getExamTimestamp(item.subject.examDate, item.subject.examTime),
      }))
      .sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        const nameComp = (a.name || '').localeCompare(b.name || '');
        if (nameComp !== 0) return nameComp;
        return a.id.localeCompare(b.id);
      });

    return eligible.length > 0 ? eligible[0].id : null;
  }, [allExamSubjects, tick]);

  // Active exam banner (nearest upcoming or pinned) following Target Exam Selection Rules
  const activeExamBanner = useMemo(() => {
    if (allExamSubjects.length === 0) return null;

    const now = Date.now();

    // 1. Manual Selection: If a specific exam is chosen from dropdown, lock onto that exam (if not completed)
    if (pinnedSubjectId !== 'AUTO') {
      const found = allExamSubjects.find((item) => item.subject.id === pinnedSubjectId);
      if (found && !found.subject.isCompleted) {
        return {
          subject: found.subject,
          session: found.session,
          timeRemaining: calculateExamTimeRemaining(found.subject.examDate, found.subject.examTime, now),
        };
      }
    }

    // 2. Auto Mode: The system automatically tracks the nearest upcoming exam.
    // Candidate Filtering:
    // - Every exam entry with a valid subject and date is checked.
    // - Active Status Window: Remains active until 30 minutes after scheduled start time.
    // - Completed exams or exams older than 30 minutes are excluded from the upcoming pool.
    const activeCandidates = allExamSubjects
      .filter((item) => isEligibleUpcomingExam(item.subject, now))
      .map((item) => ({
        ...item,
        timestamp: getExamTimestamp(item.subject.examDate, item.subject.examTime),
      }))
      .sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        const nameComp = (a.subject.subjectName || '').localeCompare(b.subject.subjectName || '');
        if (nameComp !== 0) return nameComp;
        return a.subject.id.localeCompare(b.subject.id);
      });

    if (activeCandidates.length > 0) {
      const nearest = activeCandidates[0];
      return {
        subject: nearest.subject,
        session: nearest.session,
        timeRemaining: calculateExamTimeRemaining(nearest.subject.examDate, nearest.subject.examTime, now),
      };
    }

    // If there are no upcoming exams, the countdown enters the empty state ("No Exam Scheduled")
    return null;
  }, [allExamSubjects, pinnedSubjectId, tick]);

  // Filtered sessions based on search query & status filter (with actual countdown sorting)
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    const list = sessions
      .map((session) => {
        let matchingSubjects = session.subjects || [];

        // Status filter
        if (statusFilter === 'UPCOMING') {
          matchingSubjects = matchingSubjects.filter((s) => !s.isCompleted);
        } else if (statusFilter === 'COMPLETED') {
          matchingSubjects = matchingSubjects.filter((s) => s.isCompleted);
        }

        // Search query filter
        if (q) {
          matchingSubjects = matchingSubjects.filter(
            (s) =>
              s.subjectName.toLowerCase().includes(q) ||
              (s.programName && s.programName.toLowerCase().includes(q)) ||
              (s.venue && s.venue.toLowerCase().includes(q)) ||
              session.title.toLowerCase().includes(q)
          );
        }

        // Sort subjects strictly by actual countdown (least time remaining first)
        matchingSubjects = sortExamSubjects(matchingSubjects, now);

        return {
          ...session,
          subjects: matchingSubjects,
        };
      })
      .filter((session) => {
        if (!q && statusFilter === 'ALL') return true;
        // Keep session if session matches query or has matching subjects
        if (q && session.title.toLowerCase().includes(q)) return true;
        return session.subjects.length > 0;
      });

    // Sort sessions so the session containing the nearest eligible upcoming exam appears first
    return list.sort((a, b) => {
      const aUpcoming = (a.subjects || []).filter((s) => isEligibleUpcomingExam(s, now));
      const bUpcoming = (b.subjects || []).filter((s) => isEligibleUpcomingExam(s, now));

      const aHasUpcoming = aUpcoming.length > 0;
      const bHasUpcoming = bUpcoming.length > 0;

      if (aHasUpcoming && !bHasUpcoming) return -1;
      if (!aHasUpcoming && bHasUpcoming) return 1;

      if (aHasUpcoming && bHasUpcoming) {
        const aEarliest = getExamTimestamp(aUpcoming[0].examDate, aUpcoming[0].examTime);
        const bEarliest = getExamTimestamp(bUpcoming[0].examDate, bUpcoming[0].examTime);
        if (aEarliest !== bEarliest) return aEarliest - bEarliest;
      }

      // Tie-breaker or fallback to session dates/titles
      const aStart = getExamTimestamp(a.startDate);
      const bStart = getExamTimestamp(b.startDate);
      if (aStart > 0 && bStart > 0 && aStart !== bStart) return aStart - bStart;

      const titleComp = (a.title || '').localeCompare(b.title || '');
      if (titleComp !== 0) return titleComp;
      return a.id.localeCompare(b.id);
    });
  }, [sessions, searchQuery, statusFilter, tick]);

  // Overall counts
  const totalExamsCount = useMemo(() => allExamSubjects.length, [allExamSubjects]);
  const completedExamsCount = useMemo(
    () => allExamSubjects.filter((i) => i.subject.isCompleted).length,
    [allExamSubjects]
  );
  const upcomingExamsCount = useMemo(
    () => allExamSubjects.filter((i) => !i.subject.isCompleted).length,
    [allExamSubjects]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ACTIONS (SINGLE ATOMIC WRITE PER USER MUTATION)
  // ─────────────────────────────────────────────────────────────────────────────

  const setPinnedSubjectId = useCallback(
    async (id: string) => {
      setPinnedSubjectIdState(id);
      await persistExamRoutine(sessionsRef.current, id);
    },
    [persistExamRoutine]
  );

  const addSession = useCallback(
    async (sessionData: Omit<ExamSession, 'id' | 'createdAt' | 'subjects'>) => {
      const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newSession: ExamSession = {
        id: newSessionId,
        createdAt: new Date().toISOString(),
        subjects: [],
        ...sessionData,
      };

      const updated = [newSession, ...sessionsRef.current];
      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
      return newSessionId;
    },
    [persistExamRoutine]
  );

  const updateSession = useCallback(
    async (sessionId: string, updates: Partial<ExamSession>) => {
      const updated = sessionsRef.current.map((s) => (s.id === sessionId ? { ...s, ...updates } : s));
      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      recordDeletion(sessionId, 'examSession', user?.uid || getActiveUserId());
      const sessionToDelete = sessionsRef.current.find((s) => s.id === sessionId);
      if (sessionToDelete) {
        sessionToDelete.subjects.forEach((sub) => {
          recordDeletion(sub.id, 'examSubject', user?.uid || getActiveUserId());
        });
      }

      const updated = sessionsRef.current.filter((s) => s.id !== sessionId);
      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine, user]
  );

  const addExamSubject = useCallback(
    async (sessionId: string, subjectData: Omit<ExamSubject, 'id' | 'sessionId' | 'createdAt'>) => {
      const newSubject: ExamSubject = {
        id: `exsub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId,
        createdAt: new Date().toISOString(),
        ...subjectData,
      };

      const updated = sessionsRef.current.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            subjects: [...(s.subjects || []), newSubject],
          };
        }
        return s;
      });

      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine]
  );

  const updateExamSubject = useCallback(
    async (sessionId: string, subjectId: string, updates: Partial<ExamSubject>) => {
      const now = Date.now();

      const updated = sessionsRef.current.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            subjects: (s.subjects || []).map((sub) => {
              if (sub.id !== subjectId) return sub;

              const nextExamDate = updates.examDate !== undefined ? updates.examDate : sub.examDate;
              const nextExamTime = updates.examTime !== undefined ? updates.examTime : sub.examTime;

              let nextIsCompleted = updates.isCompleted !== undefined ? updates.isCompleted : sub.isCompleted;
              let nextCompletedAt = updates.completedAt !== undefined ? updates.completedAt : sub.completedAt;

              // Rule 1: For an exam marked as completed:
              // If its scheduled date/time is edited to a future date/time,
              // automatically clear the completion state and change its status to Upcoming.
              if (sub.isCompleted && nextExamDate) {
                const targetTs = getExamTimestamp(nextExamDate, nextExamTime);
                if (targetTs > now) {
                  // Only clear if caller didn't explicitly force isCompleted: true
                  if (updates.isCompleted === undefined || updates.isCompleted === false) {
                    nextIsCompleted = false;
                    nextCompletedAt = undefined;
                  }
                }
              }

              const merged: ExamSubject = {
                ...sub,
                ...updates,
                isCompleted: nextIsCompleted,
                completedAt: nextCompletedAt,
              };

              if (!nextIsCompleted) {
                delete merged.completedAt;
              }

              return merged;
            }),
          };
        }
        return s;
      });

      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine]
  );

  const deleteExamSubject = useCallback(
    async (sessionId: string, subjectId: string) => {
      recordDeletion(subjectId, 'examSubject', user?.uid || getActiveUserId());

      const updated = sessionsRef.current.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            subjects: (s.subjects || []).filter((sub) => sub.id !== subjectId),
          };
        }
        return s;
      });

      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine, user]
  );

  const toggleExamCompleted = useCallback(
    async (sessionId: string, subjectId: string) => {
      const updated = sessionsRef.current.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            subjects: (s.subjects || []).map((sub) => {
              if (sub.id === subjectId) {
                const isNowCompleted = !sub.isCompleted;
                return {
                  ...sub,
                  isCompleted: isNowCompleted,
                  completedAt: isNowCompleted ? new Date().toISOString() : undefined,
                };
              }
              return sub;
            }),
          };
        }
        return s;
      });

      setSessions(updated);
      await persistExamRoutine(updated, pinnedRef.current);
    },
    [persistExamRoutine]
  );

  const contextValue = useMemo(() => ({
    sessions,
    pinnedSubjectId,
    searchQuery,
    statusFilter,
    activeExamBanner,
    nearestUpcomingExamId,
    filteredSessions,
    allExamSubjects,
    totalExamsCount,
    upcomingExamsCount,
    completedExamsCount,
    setPinnedSubjectId,
    setSearchQuery,
    setStatusFilter,
    addSession,
    updateSession,
    deleteSession,
    addExamSubject,
    updateExamSubject,
    deleteExamSubject,
    toggleExamCompleted,
  }), [
    sessions,
    pinnedSubjectId,
    searchQuery,
    statusFilter,
    activeExamBanner,
    nearestUpcomingExamId,
    filteredSessions,
    allExamSubjects,
    totalExamsCount,
    upcomingExamsCount,
    completedExamsCount,
    setPinnedSubjectId,
    setSearchQuery,
    setStatusFilter,
    addSession,
    updateSession,
    deleteSession,
    addExamSubject,
    updateExamSubject,
    deleteExamSubject,
    toggleExamCompleted,
  ]);

  return (
    <ExamRoutineContext.Provider value={contextValue}>
      {children}
    </ExamRoutineContext.Provider>
  );
};

export function useExamRoutine() {
  const context = useContext(ExamRoutineContext);
  if (!context) {
    throw new Error('useExamRoutine must be used within an ExamRoutineProvider');
  }
  return context;
}

export function useOptionalExamRoutine() {
  return useContext(ExamRoutineContext);
}

