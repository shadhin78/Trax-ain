/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../lib/firebase';
import { useAuthSync } from '../../../context/AuthSyncContext';
import { RoutineBlock, RoutineCategory, RoutineCategoryItem, RoutineGroup, RoutineProfile } from '../types';
import { getActiveUserId, recordDeletion, filterDeletedItems } from '../../../lib/tombstones';
import { doTimeSpansOverlap, parseTimeToMinutes } from '../utils';

interface DailyScheduleContextType {
  routines: RoutineProfile[];
  activeRoutine: RoutineProfile;
  activeRoutineId: string;
  groups: RoutineGroup[];
  categories: RoutineCategory[];
  currentHour: number;
  currentActiveBlock: RoutineBlock | null;
  secondsRemainingInHour: number;
  hourProgressPercent: number;
  formattedCountdown: string;

  // Actions
  setActiveRoutineId: (id: string) => Promise<void>;
  nextRoutine: () => Promise<void>;
  prevRoutine: () => Promise<void>;
  addRoutine: (name: string) => Promise<void>;
  addBlock: (block: Omit<RoutineBlock, 'id' | 'createdAt'> | Omit<RoutineBlock, 'id' | 'createdAt'>[]) => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<RoutineBlock>) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  updateSession: (sessionId: string, newBlocksData: Omit<RoutineBlock, 'id' | 'createdAt'>[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addGroup: (
    name: string,
    color: string,
    targetHours?: number,
    categories?: string[],
    categoryDetails?: RoutineCategoryItem[]
  ) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addCategory: (category: Omit<RoutineCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<RoutineCategory>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const DailyScheduleContext = createContext<DailyScheduleContextType | undefined>(undefined);

export const DEFAULT_ROUTINE_CATEGORIES: RoutineCategory[] = [
  { id: 'cat_study', name: 'Study', icon: '📚', color: '#3B82F6' },
  { id: 'cat_work', name: 'Work', icon: '💼', color: '#8B5CF6' },
  { id: 'cat_travel', name: 'Travel', icon: '🚗', color: '#F59E0B' },
  { id: 'cat_health', name: 'Health / Fitness', icon: '🏋️', color: '#10B981' },
  { id: 'cat_sleep', name: 'Sleep / Rest', icon: '😴', color: '#6366F1' },
  { id: 'cat_meal', name: 'Meal / Nutrition', icon: '🍽️', color: '#F97316' },
  { id: 'cat_personal', name: 'Personal', icon: '👤', color: '#EC4899' },
  { id: 'cat_mindfulness', name: 'Mindfulness / Prayer', icon: '🧘', color: '#06B6D4' },
  { id: 'cat_general', name: 'General Routine', icon: '📋', color: '#64748B' },
];

const LOCAL_STORAGE_SCHEDULE_KEY = 'x29_daily_schedule_data';

const DEFAULT_ROUTINES: RoutineProfile[] = [
  {
    id: 'routine_1',
    name: 'ROUTINE 1',
    blocks: [],
  },
  {
    id: 'routine_2',
    name: 'ROUTINE 2',
    blocks: [],
  },
];

function ensureTwoRoutines(list: RoutineProfile[]): RoutineProfile[] {
  const hasRoutine1 = list.some((r) => r.id === 'routine_1');
  const hasRoutine2 = list.some((r) => r.id === 'routine_2');
  const result = [...list];
  if (!hasRoutine1) {
    result.push({ id: 'routine_1', name: 'ROUTINE 1', blocks: [] });
  }
  if (!hasRoutine2) {
    result.push({ id: 'routine_2', name: 'ROUTINE 2', blocks: [] });
  }
  result.sort((a, b) => {
    if (a.id === 'routine_1') return -1;
    if (b.id === 'routine_1') return 1;
    if (a.id === 'routine_2') return -1;
    if (b.id === 'routine_2') return 1;
    return 0;
  });
  return result;
}

function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return data;
}

export const DailyScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthSync();

  const [routines, setRoutines] = useState<RoutineProfile[]>(() => {
    try {
      const uid = getActiveUserId();
      const cached =
        (uid ? localStorage.getItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`) : null) ||
        localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.routines) && parsed.routines.length > 0) {
          const filtered = parsed.routines.map((r: RoutineProfile) => ({
            ...r,
            blocks: filterDeletedItems(r.blocks || [], uid),
          }));
          return ensureTwoRoutines(filtered);
        }
      }
    } catch {}
    return DEFAULT_ROUTINES;
  });

  const [activeRoutineId, setActiveRoutineIdState] = useState<string>(() => {
    try {
      const uid = getActiveUserId();
      const cached =
        (uid ? localStorage.getItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`) : null) ||
        localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.activeRoutineId) return parsed.activeRoutineId;
      }
    } catch {}
    return 'routine_1';
  });

  const [groups, setGroups] = useState<RoutineGroup[]>(() => {
    try {
      const uid = getActiveUserId();
      const cached =
        (uid ? localStorage.getItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`) : null) ||
        localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) {
          return filterDeletedItems(parsed.groups, uid);
        }
      }
    } catch {}
    return [];
  });

  const [categories, setCategories] = useState<RoutineCategory[]>(() => {
    try {
      const uid = getActiveUserId();
      const cached =
        (uid ? localStorage.getItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`) : null) ||
        localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          return filterDeletedItems(parsed.categories, uid);
        }
      }
    } catch {}
    return DEFAULT_ROUTINE_CATEGORIES;
  });

  // Client-side ticking state for Active Now countdown (Zero-Write Ticking)
  const [nowTime, setNowTime] = useState<Date>(() => new Date());

  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const activeRoutineIdRef = useRef(activeRoutineId);
  activeRoutineIdRef.current = activeRoutineId;
  const isWritingRef = useRef(false);

  // 1-second interval for local time calculation (Zero Firestore writes)
  // Pauses ticking when tab/browser is in background to preserve mobile battery
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (!interval) {
        setNowTime(new Date());
        interval = setInterval(() => {
          setNowTime(new Date());
        }, 1000);
      }
    };

    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
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

  // Save to localStorage
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        routines,
        activeRoutineId,
        groups,
        categories,
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_STORAGE_SCHEDULE_KEY, payload);
      const uid = user?.uid || getActiveUserId();
      if (uid) {
        localStorage.setItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`, payload);
      }
    } catch {}
  }, [routines, activeRoutineId, groups, categories, user]);

  // Helper to persist to Firestore
  const persistSchedule = useCallback(
    async (
      newRoutines: RoutineProfile[],
      newActiveId: string,
      newGroups: RoutineGroup[],
      newCategories?: RoutineCategory[]
    ) => {
      const catsToPersist = newCategories ?? categoriesRef.current;
      // 1. Immediately cache locally so no action is lost
      try {
        const payload = JSON.stringify({
          routines: newRoutines,
          activeRoutineId: newActiveId,
          groups: newGroups,
          categories: catsToPersist,
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem(LOCAL_STORAGE_SCHEDULE_KEY, payload);
        const uid = user?.uid || getActiveUserId();
        if (uid) {
          localStorage.setItem(`${LOCAL_STORAGE_SCHEDULE_KEY}_${uid}`, payload);
        }
      } catch {}

      if (!user || !db || !isFirebaseConfigured) return;

      isWritingRef.current = true;
      try {
        const scheduleDocRef = doc(db, 'users', user.uid, 'data', 'dailySchedule');
        const cleanRoutines = sanitizeForFirestore(newRoutines);
        const cleanGroups = sanitizeForFirestore(newGroups);
        const cleanCategories = sanitizeForFirestore(catsToPersist);

        await setDoc(
          scheduleDocRef,
          {
            routines: cleanRoutines,
            activeRoutineId: newActiveId,
            groups: cleanGroups,
            categories: cleanCategories,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('[DailySchedule] Failed to persist schedule:', err);
      } finally {
        isWritingRef.current = false;
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SINGLE REAL-TIME FIRESTORE LISTENER (STRICT QUOTA EFFICIENCY)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db || !isFirebaseConfigured) return;

    const scheduleDocRef = doc(db, 'users', user.uid, 'data', 'dailySchedule');

    const unsubscribe = onSnapshot(
      scheduleDocRef,
      (snapshot) => {
        const uid = user.uid || getActiveUserId();

        if (!snapshot.exists()) {
          // Document does not exist in Firestore yet: persist local data if any exists
          if (routinesRef.current.some((r) => r.blocks.length > 0) || groupsRef.current.length > 0) {
            persistSchedule(routinesRef.current, activeRoutineIdRef.current, groupsRef.current);
          }
          return;
        }

        // Ignore local pending writes and avoid overwriting state during active local saves
        if (snapshot.metadata.hasPendingWrites || isWritingRef.current) return;

        const data = snapshot.data();

        if (Array.isArray(data.routines)) {
          const filtered = data.routines.map((r: RoutineProfile) => ({
            ...r,
            blocks: filterDeletedItems(r.blocks || [], uid),
          }));
          setRoutines(ensureTwoRoutines(filtered));
        }

        if (data.activeRoutineId) {
          setActiveRoutineIdState(data.activeRoutineId);
          activeRoutineIdRef.current = data.activeRoutineId;
        }

        if (Array.isArray(data.groups)) {
          const filteredGroups = filterDeletedItems(data.groups, uid);
          setGroups(filteredGroups);
        }

        if (Array.isArray(data.categories)) {
          const filteredCategories = filterDeletedItems(data.categories, uid);
          setCategories(filteredCategories);
        }
      },
      (error) => {
        console.warn('[DailySchedule] Snapshot listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, persistSchedule]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DISPATCH ACTIONS (SINGLE WRITE PER USER ACTION)
  // ─────────────────────────────────────────────────────────────────────────────

  const setActiveRoutineId = useCallback(
    async (id: string) => {
      setActiveRoutineIdState(id);
      activeRoutineIdRef.current = id;
      await persistSchedule(routinesRef.current, id, groupsRef.current);
    },
    [persistSchedule]
  );

  const nextRoutine = useCallback(async () => {
    const list = ensureTwoRoutines(routinesRef.current);
    const currentIndex = list.findIndex((r) => r.id === activeRoutineIdRef.current);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextId = list[nextIndex].id;
    setActiveRoutineIdState(nextId);
    activeRoutineIdRef.current = nextId;
    await persistSchedule(list, nextId, groupsRef.current);
  }, [persistSchedule]);

  const prevRoutine = useCallback(async () => {
    const list = ensureTwoRoutines(routinesRef.current);
    const currentIndex = list.findIndex((r) => r.id === activeRoutineIdRef.current);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    const prevId = list[prevIndex].id;
    setActiveRoutineIdState(prevId);
    activeRoutineIdRef.current = prevId;
    await persistSchedule(list, prevId, groupsRef.current);
  }, [persistSchedule]);

  const addRoutine = useCallback(
    async (name: string) => {
      const newRoutine: RoutineProfile = {
        id: `routine_${Date.now()}`,
        name: name.trim() || `ROUTINE ${routinesRef.current.length + 1}`,
        blocks: [],
      };
      const updatedRoutines = [...routinesRef.current, newRoutine];
      setRoutines(updatedRoutines);
      setActiveRoutineIdState(newRoutine.id);
      activeRoutineIdRef.current = newRoutine.id;
      await persistSchedule(updatedRoutines, newRoutine.id, groupsRef.current);
    },
    [persistSchedule]
  );

  const addBlock = useCallback(
    async (blockData: Omit<RoutineBlock, 'id' | 'createdAt'> | Omit<RoutineBlock, 'id' | 'createdAt'>[]) => {
      const items = Array.isArray(blockData) ? blockData : [blockData];
      const newBlocks: RoutineBlock[] = items.map((data, idx) => ({
        id: `block_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...data,
      }));

      // Time overlap check: Ensure no newly added block overlaps with existing blocks (excluding sibling blocks from same session)
      const currentRoutine = routinesRef.current.find((r) => r.id === activeRoutineIdRef.current);
      if (currentRoutine) {
        const newSessionIds = new Set(newBlocks.map((b) => b.sessionId).filter(Boolean));
        const otherBlocks = currentRoutine.blocks.filter((b) => !b.sessionId || !newSessionIds.has(b.sessionId));
        const conflicting = newBlocks.filter((newB) =>
          otherBlocks.some((otherB) => doTimeSpansOverlap(newB, otherB))
        );
        if (conflicting.length > 0) {
          console.warn('[DailySchedule] Block creation rejected: time slot overlaps with existing block', conflicting);
          return;
        }
      }

      const hasDayStart = newBlocks.some((b) => b.isDayStart);

      const updatedRoutines = routinesRef.current.map((routine) => {
        if (routine.id === activeRoutineIdRef.current) {
          let remainingBlocks = routine.blocks;
          if (hasDayStart) {
            remainingBlocks = remainingBlocks.map((b) => ({ ...b, isDayStart: false }));
          }
          return {
            ...routine,
            blocks: [...remainingBlocks, ...newBlocks].sort((a, b) => {
              if (a.hour !== b.hour) return a.hour - b.hour;
              const startA = parseTimeToMinutes(a.startTime, a.hour);
              const startB = parseTimeToMinutes(b.startTime, b.hour);
              return startA - startB;
            }),
          };
        }
        return routine;
      });

      setRoutines(updatedRoutines);
      await persistSchedule(updatedRoutines, activeRoutineIdRef.current, groupsRef.current);
    },
    [persistSchedule]
  );

  const updateBlock = useCallback(
    async (blockId: string, updates: Partial<RoutineBlock>) => {
      const currentRoutine = routinesRef.current.find((r) => r.id === activeRoutineIdRef.current);
      if (currentRoutine) {
        const existing = currentRoutine.blocks.find((b) => b.id === blockId);
        if (existing) {
          const merged = { ...existing, ...updates };
          const otherBlocks = currentRoutine.blocks.filter((b) => b.id !== blockId);
          const hasCollision = otherBlocks.some((otherB) => doTimeSpansOverlap(merged, otherB));
          if (hasCollision) {
            console.warn('[DailySchedule] Block update rejected: target time slot overlaps with another block');
            return;
          }
        }
      }

      const updatedRoutines = routinesRef.current.map((routine) => {
        if (routine.id === activeRoutineIdRef.current) {
          return {
            ...routine,
            blocks: routine.blocks
              .map((b) => {
                if (b.id === blockId) {
                  return { ...b, ...updates };
                }
                if (updates.isDayStart) {
                  return { ...b, isDayStart: false };
                }
                return b;
              })
              .sort((a, b) => {
                if (a.hour !== b.hour) return a.hour - b.hour;
                const startA = parseTimeToMinutes(a.startTime, a.hour);
                const startB = parseTimeToMinutes(b.startTime, b.hour);
                return startA - startB;
              }),
          };
        }
        return routine;
      });

      setRoutines(updatedRoutines);
      await persistSchedule(updatedRoutines, activeRoutineIdRef.current, groupsRef.current);
    },
    [persistSchedule]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      recordDeletion(blockId, 'routineBlock', user?.uid || getActiveUserId());
      const updatedRoutines = routinesRef.current.map((routine) => {
        if (routine.id === activeRoutineIdRef.current) {
          return {
            ...routine,
            blocks: routine.blocks.filter((b) => b.id !== blockId),
          };
        }
        return routine;
      });

      setRoutines(updatedRoutines);
      await persistSchedule(updatedRoutines, activeRoutineIdRef.current, groupsRef.current);
    },
    [persistSchedule, user]
  );

  const updateSession = useCallback(
    async (sessionId: string, newBlocksData: Omit<RoutineBlock, 'id' | 'createdAt'>[]) => {
      const newBlocks: RoutineBlock[] = newBlocksData.map((data, idx) => ({
        id: `block_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...data,
      }));

      // Time overlap check: Ensure updated session blocks do not overlap with other blocks
      const currentRoutine = routinesRef.current.find((r) => r.id === activeRoutineIdRef.current);
      if (currentRoutine) {
        const otherBlocks = currentRoutine.blocks.filter((b) => b.sessionId !== sessionId);
        const conflicting = newBlocks.filter((newB) =>
          otherBlocks.some((otherB) => doTimeSpansOverlap(newB, otherB))
        );
        if (conflicting.length > 0) {
          console.warn('[DailySchedule] Session update rejected: time slot overlaps with existing block', conflicting);
          return;
        }
      }

      const hasDayStart = newBlocks.some((b) => b.isDayStart);

      const updatedRoutines = routinesRef.current.map((routine) => {
        if (routine.id === activeRoutineIdRef.current) {
          let remaining = routine.blocks.filter((b) => b.sessionId !== sessionId);
          if (hasDayStart) {
            remaining = remaining.map((b) => ({ ...b, isDayStart: false }));
          }
          return {
            ...routine,
            blocks: [...remaining, ...newBlocks].sort((a, b) => {
              if (a.hour !== b.hour) return a.hour - b.hour;
              const startA = parseTimeToMinutes(a.startTime, a.hour);
              const startB = parseTimeToMinutes(b.startTime, b.hour);
              return startA - startB;
            }),
          };
        }
        return routine;
      });

      setRoutines(updatedRoutines);
      await persistSchedule(updatedRoutines, activeRoutineIdRef.current, groupsRef.current);
    },
    [persistSchedule]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const currentRoutine = routinesRef.current.find((r) => r.id === activeRoutineIdRef.current);
      if (currentRoutine) {
        const blocksToDelete = currentRoutine.blocks.filter((b) => b.sessionId === sessionId);
        blocksToDelete.forEach((b) => {
          recordDeletion(b.id, 'routineBlock', user?.uid || getActiveUserId());
        });
      }

      const updatedRoutines = routinesRef.current.map((routine) => {
        if (routine.id === activeRoutineIdRef.current) {
          return {
            ...routine,
            blocks: routine.blocks.filter((b) => b.sessionId !== sessionId),
          };
        }
        return routine;
      });

      setRoutines(updatedRoutines);
      await persistSchedule(updatedRoutines, activeRoutineIdRef.current, groupsRef.current);
    },
    [persistSchedule, user]
  );

  const addGroup = useCallback(
    async (
      name: string,
      color: string,
      targetHours?: number,
      categoriesList?: string[],
      categoryDetails?: RoutineCategoryItem[]
    ) => {
      const newGroup: RoutineGroup = {
        id: `group_${Date.now()}`,
        name: name.trim().toUpperCase(),
        color,
        targetHours: targetHours ?? 0,
        categories: categoriesList ?? [],
        categoryDetails: categoryDetails ?? [],
        createdAt: new Date().toISOString(),
      };
      const updatedGroups = [...groupsRef.current, newGroup];
      setGroups(updatedGroups);
      await persistSchedule(routinesRef.current, activeRoutineIdRef.current, updatedGroups);
    },
    [persistSchedule]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      recordDeletion(groupId, 'routineGroup', user?.uid || getActiveUserId());
      const updatedGroups = groupsRef.current.filter((g) => g.id !== groupId);
      setGroups(updatedGroups);
      await persistSchedule(routinesRef.current, activeRoutineIdRef.current, updatedGroups);
    },
    [persistSchedule, user]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CATEGORY MANAGEMENT ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const addCategory = useCallback(
    async (categoryData: Omit<RoutineCategory, 'id' | 'createdAt'>) => {
      const newCategory: RoutineCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...categoryData,
      };
      const updatedCategories = [...categoriesRef.current, newCategory];
      setCategories(updatedCategories);
      await persistSchedule(
        routinesRef.current,
        activeRoutineIdRef.current,
        groupsRef.current,
        updatedCategories
      );
    },
    [persistSchedule]
  );

  const updateCategory = useCallback(
    async (categoryId: string, updates: Partial<RoutineCategory>) => {
      const oldCategory = categoriesRef.current.find((c) => c.id === categoryId);
      const updatedCategories = categoriesRef.current.map((c) =>
        c.id === categoryId ? { ...c, ...updates } : c
      );
      setCategories(updatedCategories);

      // If category name changed, synchronize existing routine blocks with old name
      let updatedRoutines = routinesRef.current;
      if (oldCategory && updates.name && updates.name.toLowerCase() !== oldCategory.name.toLowerCase()) {
        const oldName = oldCategory.name.toLowerCase();
        const newName = updates.name.trim();
        updatedRoutines = routinesRef.current.map((r) => ({
          ...r,
          blocks: r.blocks.map((b) =>
            b.category && b.category.toLowerCase() === oldName
              ? { ...b, category: newName }
              : b
          ),
        }));
        setRoutines(updatedRoutines);
      }

      await persistSchedule(
        updatedRoutines,
        activeRoutineIdRef.current,
        groupsRef.current,
        updatedCategories
      );
    },
    [persistSchedule]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      recordDeletion(categoryId, 'routineCategory', user?.uid || getActiveUserId());
      const updatedCategories = categoriesRef.current.filter((c) => c.id !== categoryId);
      setCategories(updatedCategories);
      await persistSchedule(
        routinesRef.current,
        activeRoutineIdRef.current,
        groupsRef.current,
        updatedCategories
      );
    },
    [persistSchedule, user]
  );

  // Active routine object
  const activeRoutine = useMemo(() => {
    return routines.find((r) => r.id === activeRoutineId) || routines[0] || DEFAULT_ROUTINES[0];
  }, [routines, activeRoutineId]);

  // Calculate current hour & countdown for "ACTIVE NOW"
  const currentHour = nowTime.getHours();
  const currentMinute = nowTime.getMinutes();
  const currentSecond = nowTime.getSeconds();

  // Active block matching current hour and minute
  const currentActiveBlock = useMemo(() => {
    if (!activeRoutine || !Array.isArray(activeRoutine.blocks)) return null;
    const matching = activeRoutine.blocks.filter((b) => b.hour === currentHour);
    if (matching.length === 0) return null;
    if (matching.length === 1) return matching[0];

    const nowMinutes = currentHour * 60 + currentMinute;
    const exact = matching.find((b) => {
      const startM = parseTimeToMinutes(b.startTime, b.hour);
      let duration = b.durationMinutes;
      if (duration === undefined) {
        if (b.endTime) {
          let endM = parseTimeToMinutes(b.endTime, (b.hour + 1) % 24);
          if (endM <= startM) endM += 1440;
          duration = endM - startM;
        } else {
          duration = 60;
        }
      }
      return nowMinutes >= startM && nowMinutes < startM + duration;
    });

    return exact || matching[0];
  }, [activeRoutine, currentHour, currentMinute]);

  // Seconds remaining until the end of the active block (or hour fallback)
  const secondsRemainingInHour = useMemo(() => {
    if (!currentActiveBlock) {
      return (59 - currentMinute) * 60 + (60 - currentSecond);
    }
    const startM = parseTimeToMinutes(currentActiveBlock.startTime, currentActiveBlock.hour);
    let duration = currentActiveBlock.durationMinutes;
    if (duration === undefined) {
      if (currentActiveBlock.endTime) {
        let endM = parseTimeToMinutes(currentActiveBlock.endTime, (currentActiveBlock.hour + 1) % 24);
        if (endM <= startM) endM += 1440;
        duration = endM - startM;
      } else {
        duration = 60;
      }
    }
    const endM = startM + duration;
    const nowM = currentHour * 60 + currentMinute;
    let diffM = endM - nowM;
    if (diffM < 0) diffM += 1440;
    return Math.max(0, (diffM - 1) * 60 + (60 - currentSecond));
  }, [currentActiveBlock, currentHour, currentMinute, currentSecond]);

  const hourProgressPercent = useMemo(() => {
    if (!currentActiveBlock) {
      return Math.min(100, Math.max(0, ((currentMinute * 60 + currentSecond) / 3600) * 100));
    }
    const startM = parseTimeToMinutes(currentActiveBlock.startTime, currentActiveBlock.hour);
    let duration = currentActiveBlock.durationMinutes;
    if (duration === undefined) {
      if (currentActiveBlock.endTime) {
        let endM = parseTimeToMinutes(currentActiveBlock.endTime, (currentActiveBlock.hour + 1) % 24);
        if (endM <= startM) endM += 1440;
        duration = endM - startM;
      } else {
        duration = 60;
      }
    }
    const totalSecs = Math.max(60, duration * 60);
    const elapsedSecs = Math.max(0, totalSecs - secondsRemainingInHour);
    return Math.min(100, Math.max(0, (elapsedSecs / totalSecs) * 100));
  }, [currentActiveBlock, currentMinute, currentSecond, secondsRemainingInHour]);

  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(secondsRemainingInHour / 60);
    const secs = secondsRemainingInHour % 60;
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsRemainingInHour]);

  const contextValue = useMemo(() => ({
    routines,
    activeRoutine,
    activeRoutineId,
    groups,
    categories,
    currentHour,
    currentActiveBlock,
    secondsRemainingInHour,
    hourProgressPercent,
    formattedCountdown,
    setActiveRoutineId,
    nextRoutine,
    prevRoutine,
    addRoutine,
    addBlock,
    updateBlock,
    deleteBlock,
    updateSession,
    deleteSession,
    addGroup,
    deleteGroup,
    addCategory,
    updateCategory,
    deleteCategory,
  }), [
    routines,
    activeRoutine,
    activeRoutineId,
    groups,
    categories,
    currentHour,
    currentActiveBlock,
    secondsRemainingInHour,
    hourProgressPercent,
    formattedCountdown,
    setActiveRoutineId,
    nextRoutine,
    prevRoutine,
    addRoutine,
    addBlock,
    updateBlock,
    deleteBlock,
    updateSession,
    deleteSession,
    addGroup,
    deleteGroup,
    addCategory,
    updateCategory,
    deleteCategory,
  ]);

  return (
    <DailyScheduleContext.Provider value={contextValue}>
      {children}
    </DailyScheduleContext.Provider>
  );
};

export function useDailySchedule() {
  const context = useContext(DailyScheduleContext);
  if (!context) {
    throw new Error('useDailySchedule must be used within a DailyScheduleProvider');
  }
  return context;
}
