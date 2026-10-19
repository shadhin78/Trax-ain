/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  getDoc 
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  isFirebaseConfigured,
  handleFirestoreError, 
  isQuotaExceededError, 
  onQuotaExceeded, 
  disableFirestoreNetwork,
  enableFirestoreNetwork,
  OperationType 
} from '../lib/firebase';
import { syncLogger } from '../lib/syncLogger';
import { 
  getActiveUserId, 
  setActiveUserId, 
  getLocalTombstones, 
  mergeRemoteTombstones, 
  filterDeletedItems,
  clearUnscopedSessionData
} from '../lib/tombstones';

export type SyncStatus = 'syncing' | 'saved' | 'offline' | 'error' | 'quota-exceeded';

export interface UserCustomData {
  paceManagement?: any;
  dailyActionsData?: any;
  tableHeaders?: any;
  tombstones?: Record<string, number>;
  [key: string]: any;
}

export interface UserAppData {
  notes?: string;
  content?: string;
  updatedAt?: string;
  version?: number;
  userId?: string;
  academicHierarchy?: any;
  customData?: UserCustomData;
  [key: string]: any;
}

export interface UpdateAppDataOptions {
  immediate?: boolean;
  section?: string;
}

interface AuthSyncContextType {
  user: User | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  appData: UserAppData;
  isCloudLoaded: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAppData: (data: Partial<UserAppData>, options?: UpdateAppDataOptions) => Promise<void>;
  flushPendingUpdates: () => Promise<void>;
  forceRefreshFromCloud: () => Promise<void>;
}

const AuthSyncContext = createContext<AuthSyncContextType | undefined>(undefined);

/**
 * Remove undefined values and functions to prevent Firestore serialization exceptions
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== 'function') {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as unknown as T;
  }
  return obj;
}

/**
 * Canonical JSON representation of content payload to skip redundant writes
 */
function getSemanticPayloadKey(data: UserAppData): string {
  try {
    const subset = {
      notes: data.notes || '',
      content: data.content || '',
      academicHierarchy: data.academicHierarchy || null,
      customData: data.customData || null,
    };
    return JSON.stringify(subset);
  } catch {
    return '';
  }
}

const isInitiallyQuotaExceeded = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('x29_quota_exceeded');
    if (stored) {
      const time = parseInt(stored, 10);
      if (Date.now() - time < 1000 * 60 * 60 * 12) {
        return true;
      }
    }
  } catch {
    // Ignore storage check errors
  }
  return false;
};

export const AuthSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isFirebaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isFirebaseConfigured && isInitiallyQuotaExceeded() ? 'quota-exceeded' : 'saved');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(!isFirebaseConfigured);
  const [appData, setAppData] = useState<UserAppData>({ notes: '', content: '' });

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const appDataRef = useRef<UserAppData>(appData);
  appDataRef.current = appData;

  const pendingUpdatesRef = useRef<Partial<UserAppData>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionCounterRef = useRef<number>(Date.now());
  const lastAppliedServerUpdatedAtRef = useRef<string>('');
  const lastPersistedSemanticKeyRef = useRef<string>('');
  const isWritingRef = useRef<boolean>(false);
  const writePromiseResolveRef = useRef<(() => void) | null>(null);
  const hasInitialSnapshotArrivedRef = useRef<boolean>(false);

  // Quota & Throttling safeguards
  const isQuotaExceededRef = useRef<boolean>(isFirebaseConfigured && isInitiallyQuotaExceeded());
  const quotaExceededUntilRef = useRef<number>(isFirebaseConfigured && isInitiallyQuotaExceeded() ? Date.now() + 1000 * 60 * 60 * 12 : 0);

  // Clear quota flag if Firebase is disconnected/removed
  useEffect(() => {
    if (!isFirebaseConfigured) {
      try {
        localStorage.removeItem('x29_quota_exceeded');
      } catch {}
      isQuotaExceededRef.current = false;
    }
  }, []);

  // Ensure network is active unless quota limit is currently in cooldown
  useEffect(() => {
    if (isFirebaseConfigured) {
      if (isQuotaExceededRef.current) {
        disableFirestoreNetwork().catch(() => {});
      } else {
        enableFirestoreNetwork().catch(() => {});
      }
    }
  }, []);

  // Listen to global quota exceeded events from anywhere in the app
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribeQuota = onQuotaExceeded((msg) => {
      isQuotaExceededRef.current = true;
      quotaExceededUntilRef.current = Date.now() + 1000 * 60 * 60 * 12;
      setSyncStatus('quota-exceeded');
      syncLogger.quotaExceeded(userRef.current?.uid || null, 'globalQuota', msg);
    });
    return () => unsubscribeQuota();
  }, []);

  // Monitor network online / offline state and auto-reconnect
  useEffect(() => {
    const handleOnline = () => {
      syncLogger.hydrationOrder('NETWORK_ONLINE', { userId: userRef.current?.uid || null });
      if (isQuotaExceededRef.current) {
        setSyncStatus('quota-exceeded');
      } else {
        enableFirestoreNetwork().catch(() => {});
        setSyncStatus((prev) => (prev === 'offline' ? 'saved' : prev));
      }
      if (Object.keys(pendingUpdatesRef.current).length > 0 && !isQuotaExceededRef.current && isFirebaseConfigured) {
        flushPendingUpdates();
      }
    };
    const handleOffline = () => {
      syncLogger.hydrationOrder('NETWORK_OFFLINE', { userId: userRef.current?.uid || null });
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Authentication State Subscription
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      setIsCloudLoaded(true);
      setSyncStatus('saved');
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      userRef.current = currentUser;
      setAuthLoading(false);
      setIsCloudLoaded(false);
      hasInitialSnapshotArrivedRef.current = false;

      syncLogger.authChanged(currentUser?.uid || null, currentUser?.email || null);

      if (currentUser) {
        setActiveUserId(currentUser.uid);
        // Hydrate immediately from user-scoped localStorage for zero-latency initial UI
        try {
          const cached = localStorage.getItem(`x29_user_cache_${currentUser.uid}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setAppData(parsed);
            lastPersistedSemanticKeyRef.current = getSemanticPayloadKey(parsed);
          }
        } catch {
          // Ignore cache parse failures
        }
      } else {
        setActiveUserId(null);
        clearUnscopedSessionData();
        // User logged out: clear state and set cloud loaded
        setAppData({ notes: '', content: '' });
        setSyncStatus('saved');
        setIsCloudLoaded(true);
        lastAppliedServerUpdatedAtRef.current = '';
        lastPersistedSemanticKeyRef.current = '';
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Flush any pending updates immediately to Firestore
  const flushPendingUpdates = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser || !db || !isFirebaseConfigured) {
      setSyncStatus('saved');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Check if quota limit was reached
    if (isQuotaExceededRef.current) {
      if (Date.now() < quotaExceededUntilRef.current) {
        setSyncStatus('quota-exceeded');
        return;
      } else {
        // Cooldown passed, allow one trial write
        isQuotaExceededRef.current = false;
        try {
          localStorage.removeItem('x29_quota_exceeded');
        } catch {}
      }
    }

    const updatesToSave = { ...pendingUpdatesRef.current };
    if (Object.keys(updatesToSave).length === 0) return;

    // Semantic equality check: If the pending changes don't change actual values, skip write!
    const candidateFullState: UserAppData = {
      ...appDataRef.current,
      ...updatesToSave,
      customData: {
        ...(appDataRef.current.customData || {}),
        ...(updatesToSave.customData || {}),
      },
    };
    const currentSemanticKey = getSemanticPayloadKey(candidateFullState);
    if (currentSemanticKey === lastPersistedSemanticKeyRef.current) {
      pendingUpdatesRef.current = {};
      setSyncStatus(isQuotaExceededRef.current ? 'quota-exceeded' : 'saved');
      return;
    }

    // Clear pending updates ref so subsequent actions can queue
    pendingUpdatesRef.current = {};

    const docPath = `users/${currentUser.uid}/data/appState`;
    const docRef = doc(db, 'users', currentUser.uid, 'data', 'appState');

    // Safety check: ensure we don't overwrite an existing cloud doc before its initial snapshot arrives
    if (!hasInitialSnapshotArrivedRef.current && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const initialSnap = await getDoc(docRef);
        hasInitialSnapshotArrivedRef.current = true;
        if (initialSnap.exists()) {
          const existingCloud = initialSnap.data() as UserAppData;
          mergeRemoteTombstones(existingCloud.customData?.tombstones, currentUser.uid);
          const currentTombstones = getLocalTombstones(currentUser.uid);

          // Sanitize existingCloud so it never resurrects deleted records
          if (existingCloud.academicHierarchy) {
            existingCloud.academicHierarchy.chapters = filterDeletedItems(existingCloud.academicHierarchy.chapters, currentUser.uid);
            existingCloud.academicHierarchy.subjects = filterDeletedItems(existingCloud.academicHierarchy.subjects, currentUser.uid);
            existingCloud.academicHierarchy.programs = filterDeletedItems(existingCloud.academicHierarchy.programs, currentUser.uid);
            existingCloud.academicHierarchy.tracks = filterDeletedItems(existingCloud.academicHierarchy.tracks, currentUser.uid);
            existingCloud.academicHierarchy.tasks = filterDeletedItems(existingCloud.academicHierarchy.tasks, currentUser.uid);
            existingCloud.academicHierarchy.completionRecords = filterDeletedItems(existingCloud.academicHierarchy.completionRecords, currentUser.uid);
          }
          if (existingCloud.customData?.dailyActionsData) {
            const da = existingCloud.customData.dailyActionsData;
            da.monthlyTargets = filterDeletedItems(da.monthlyTargets, currentUser.uid);
            da.weeklyTargets = filterDeletedItems(da.weeklyTargets, currentUser.uid);
            da.dailyActions = filterDeletedItems(da.dailyActions, currentUser.uid);
          }
          if (existingCloud.customData?.paceManagement?.goals) {
            existingCloud.customData.paceManagement.goals = filterDeletedItems(existingCloud.customData.paceManagement.goals, currentUser.uid);
          }

          const mergedCustom: UserCustomData = {
            ...(existingCloud.customData || {}),
            ...(updatesToSave.customData || {}),
            tombstones: {
              ...(existingCloud.customData?.tombstones || {}),
              ...(updatesToSave.customData?.tombstones || {}),
              ...currentTombstones,
            },
          };
          Object.assign(updatesToSave, {
            ...existingCloud,
            ...updatesToSave,
            customData: mergedCustom,
          });
        }
      } catch {
        // Proceed with normal write if getDoc fails
      }
    }

    versionCounterRef.current += 1;
    const currentVersion = versionCounterRef.current;
    const nowIso = new Date().toISOString();

    const payload = sanitizeForFirestore({
      ...updatesToSave,
      updatedAt: nowIso,
      version: currentVersion,
      userId: currentUser.uid,
    });

    const startTime = Date.now();
    isWritingRef.current = true;
    setSyncStatus('syncing');
    syncLogger.saveStart(currentUser.uid, 'batchFlush', docPath, currentVersion);

    try {
      // 12s timeout guard against hanging writes on high latency
      const writePromise = setDoc(docRef, payload, { merge: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Write timeout')), 12000)
      );

      await Promise.race([writePromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      syncLogger.saveSuccess(currentUser.uid, 'batchFlush', docPath, duration, currentVersion);
      setLastSyncedAt(new Date());
      setSyncStatus('saved');
      lastAppliedServerUpdatedAtRef.current = nowIso;
      lastPersistedSemanticKeyRef.current = currentSemanticKey;
      isQuotaExceededRef.current = false;
    } catch (err: unknown) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isQuotaExceededError(err)) {
        isQuotaExceededRef.current = true;
        quotaExceededUntilRef.current = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
        try {
          localStorage.setItem('x29_quota_exceeded', Date.now().toString());
        } catch {}
        setSyncStatus('quota-exceeded');
        syncLogger.quotaExceeded(
          currentUser.uid,
          docPath,
          err instanceof Error ? err.message : String(err)
        );
        disableFirestoreNetwork().catch(() => {});
        return;
      }

      syncLogger.saveFailure(currentUser.uid, 'batchFlush', docPath, err, isOffline);

      if (isOffline) {
        setSyncStatus('offline');
        // Re-queue failed updates so they are retried on reconnect
        pendingUpdatesRef.current = {
          ...updatesToSave,
          ...pendingUpdatesRef.current,
        };
      } else {
        handleFirestoreError(err, OperationType.WRITE, docPath);
        setSyncStatus('error');
        pendingUpdatesRef.current = {
          ...updatesToSave,
          ...pendingUpdatesRef.current,
        };
      }
    } finally {
      isWritingRef.current = false;
      if (writePromiseResolveRef.current) {
        writePromiseResolveRef.current();
        writePromiseResolveRef.current = null;
      }
      // If new mutations queued while this write was in-flight, flush them promptly
      if (Object.keys(pendingUpdatesRef.current).length > 0 && !isQuotaExceededRef.current) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          flushPendingUpdates();
        }, 100);
      }
    }
  }, []);

  // Real-time Firestore synchronization for the authenticated user
  useEffect(() => {
    if (!user || !db || !isFirebaseConfigured) {
      setSyncStatus('saved');
      setIsCloudLoaded(true);
      return;
    }

    const docPath = `users/${user.uid}/data/appState`;
    const docRef = doc(db, 'users', user.uid, 'data', 'appState');

    setSyncStatus(isQuotaExceededRef.current ? 'quota-exceeded' : 'syncing');
    syncLogger.hydrationOrder('ATTACH_REALTIME_LISTENER', { userId: user.uid, docPath });

    // Safety fallback timeout: mark cloud as loaded after 7s on slow/unreachable networks
    const initialTimeout = setTimeout(() => {
      setIsCloudLoaded(true);
      setSyncStatus((prev) => (prev === 'syncing' ? (isQuotaExceededRef.current ? 'quota-exceeded' : 'saved') : prev));
    }, 7000);

    // If quota is already exceeded, don't attach network listener to avoid backoff delays
    if (isQuotaExceededRef.current) {
      setIsCloudLoaded(true);
      clearTimeout(initialTimeout);
      return;
    }

    // Subscribe to real-time changes across devices
    const unsubscribeSnapshot = onSnapshot(
      docRef,
      (snapshot) => {
        clearTimeout(initialTimeout);
        hasInitialSnapshotArrivedRef.current = true;
        setIsCloudLoaded(true);
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        if (snapshot.exists()) {
          const serverData = snapshot.data() as UserAppData;
          syncLogger.incomingSnapshot(
            user.uid,
            docPath,
            hasPendingWrites,
            serverData.updatedAt,
            serverData.version
          );

          // If this is a local echo of our own unconfirmed in-progress write,
          // don't clobber the user's active in-memory mutations
          if (hasPendingWrites && isWritingRef.current) {
            return;
          }

          // Merge incoming remote tombstones and sanitize server data
          mergeRemoteTombstones(serverData.customData?.tombstones, user.uid);
          const activeTombstones = getLocalTombstones(user.uid);

          if (serverData.academicHierarchy) {
            serverData.academicHierarchy.chapters = filterDeletedItems(serverData.academicHierarchy.chapters, user.uid);
            serverData.academicHierarchy.subjects = filterDeletedItems(serverData.academicHierarchy.subjects, user.uid);
            serverData.academicHierarchy.programs = filterDeletedItems(serverData.academicHierarchy.programs, user.uid);
            serverData.academicHierarchy.tracks = filterDeletedItems(serverData.academicHierarchy.tracks, user.uid);
            serverData.academicHierarchy.tasks = filterDeletedItems(serverData.academicHierarchy.tasks, user.uid);
            serverData.academicHierarchy.completionRecords = filterDeletedItems(serverData.academicHierarchy.completionRecords, user.uid);
          }
          if (serverData.customData?.dailyActionsData) {
            const da = serverData.customData.dailyActionsData;
            da.monthlyTargets = filterDeletedItems(da.monthlyTargets, user.uid);
            da.weeklyTargets = filterDeletedItems(da.weeklyTargets, user.uid);
            da.dailyActions = filterDeletedItems(da.dailyActions, user.uid);
          }
          if (serverData.customData?.paceManagement?.goals) {
            serverData.customData.paceManagement.goals = filterDeletedItems(serverData.customData.paceManagement.goals, user.uid);
          }

          // Check if server data is valid and should be applied
          setAppData((prev) => {
            // Guard against stale snapshots if local has newer un-flushed writes or newer state
            if (
              !hasPendingWrites &&
              serverData.updatedAt &&
              prev.updatedAt &&
              serverData.updatedAt < prev.updatedAt
            ) {
              syncLogger.conflictRejected('STALE_SNAPSHOT_OVERWRITE_PREVENTED', {
                serverUpdatedAt: serverData.updatedAt,
                localUpdatedAt: prev.updatedAt,
              });
              return prev;
            }

            // Deep merge customData so sibling features (pace, daily actions, headers) never delete each other
            const mergedCustom: UserCustomData = {
              ...(prev.customData || {}),
              ...(serverData.customData || {}),
              tombstones: {
                ...(prev.customData?.tombstones || {}),
                ...(serverData.customData?.tombstones || {}),
                ...activeTombstones,
              },
            };

            const merged: UserAppData = {
              ...prev,
              ...serverData,
              customData: mergedCustom,
            };

            try {
              localStorage.setItem(`x29_user_cache_${user.uid}`, JSON.stringify(merged));
              // Also keep scoped storage keys synchronized
              if (merged.academicHierarchy) {
                localStorage.setItem(`x29_academic_hierarchy_${user.uid}`, JSON.stringify(merged.academicHierarchy));
              }
              if (merged.customData?.dailyActionsData) {
                const da = merged.customData.dailyActionsData;
                if (da.dailyActions) localStorage.setItem(`x29_daily_actions_${user.uid}`, JSON.stringify(da.dailyActions));
                if (da.monthlyTargets) localStorage.setItem(`x29_monthly_targets_${user.uid}`, JSON.stringify(da.monthlyTargets));
                if (da.weeklyTargets) localStorage.setItem(`x29_weekly_targets_${user.uid}`, JSON.stringify(da.weeklyTargets));
              }
              if (merged.customData?.paceManagement) {
                localStorage.setItem(`x29_pace_management_${user.uid}`, JSON.stringify(merged.customData.paceManagement));
              }
            } catch {
              // Ignore local quota limit
            }

            lastAppliedServerUpdatedAtRef.current = serverData.updatedAt || new Date().toISOString();
            lastPersistedSemanticKeyRef.current = getSemanticPayloadKey(merged);
            return merged;
          });

          setLastSyncedAt(new Date());
          if (!isQuotaExceededRef.current) {
            setSyncStatus('saved');
          }
        } else {
          // Document does not exist yet on cloud (fresh account or not yet saved)
          syncLogger.hydrationOrder('CLOUD_DOC_NOT_FOUND', { userId: user.uid, docPath });
          setSyncStatus(isQuotaExceededRef.current ? 'quota-exceeded' : 'saved');

          // Fresh account: if local data exists, automatically seed it to cloud so user work is preserved
          if (
            (appDataRef.current.academicHierarchy ||
             appDataRef.current.customData?.dailyActionsData ||
             appDataRef.current.customData?.paceManagement) &&
            !isWritingRef.current
          ) {
            pendingUpdatesRef.current = {
              ...appDataRef.current,
              ...pendingUpdatesRef.current,
            };
            setTimeout(() => {
              flushPendingUpdates();
            }, 300);
          }
        }
      },
      (error) => {
        clearTimeout(initialTimeout);
        setIsCloudLoaded(true);

        if (isQuotaExceededError(error)) {
          isQuotaExceededRef.current = true;
          quotaExceededUntilRef.current = Date.now() + 1000 * 60 * 60 * 12;
          try {
            localStorage.setItem('x29_quota_exceeded', Date.now().toString());
          } catch {}
          setSyncStatus('quota-exceeded');
          syncLogger.quotaExceeded(user.uid, docPath, error.message);
          disableFirestoreNetwork().catch(() => {});
          return;
        }

        syncLogger.saveFailure(user.uid, 'onSnapshot', docPath, error, false);
        handleFirestoreError(error, OperationType.GET, docPath);
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setSyncStatus('offline');
        } else {
          setSyncStatus('error');
        }
      }
    );

    return () => {
      clearTimeout(initialTimeout);
      unsubscribeSnapshot();
    };
  }, [user]);

  // Flush on page unload or visibility change to prevent dropped writes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(pendingUpdatesRef.current).length > 0 && !isQuotaExceededRef.current && isFirebaseConfigured) {
        flushPendingUpdates();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'hidden' &&
        Object.keys(pendingUpdatesRef.current).length > 0 &&
        !isQuotaExceededRef.current &&
        isFirebaseConfigured
      ) {
        flushPendingUpdates();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingUpdates]);

  /**
   * Universal state update function with 1,000ms debounce
   */
  const updateAppData = useCallback(
    async (newData: Partial<UserAppData>, options?: UpdateAppDataOptions) => {
      const currentUser = userRef.current;
      const isImmediate = options?.immediate ?? false;

      // 1. Immediately apply to local state for zero-latency UI update (Optimistic)
      setAppData((prev) => {
        const activeUid = currentUser?.uid || getActiveUserId();
        const activeTombstones = getLocalTombstones(activeUid);

        let mergedCustom = prev.customData;
        if (newData.customData || Object.keys(activeTombstones).length > 0) {
          mergedCustom = {
            ...(prev.customData || {}),
            ...(newData.customData || {}),
            tombstones: {
              ...(prev.customData?.tombstones || {}),
              ...(newData.customData?.tombstones || {}),
              ...activeTombstones,
            },
          };
        }

        const nextState: UserAppData = {
          ...prev,
          ...newData,
          ...(mergedCustom ? { customData: mergedCustom } : {}),
          updatedAt: new Date().toISOString(),
        };

        try {
          const cacheKey = activeUid ? `x29_user_cache_${activeUid}` : 'x29_user_cache_local';
          localStorage.setItem(cacheKey, JSON.stringify(nextState));
          localStorage.setItem('x29_local_app_data', JSON.stringify(nextState));
        } catch {
          // LocalStorage quota safety
        }
        return nextState;
      });

      if (!currentUser || !db || !isFirebaseConfigured) {
        setSyncStatus('saved');
        return;
      }

      // If quota is already marked as exceeded, do not attempt Firestore network write
      if (isQuotaExceededRef.current) {
        setSyncStatus('quota-exceeded');
        return;
      }

      // Check if network is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        pendingUpdatesRef.current = {
          ...pendingUpdatesRef.current,
          ...newData,
          ...(newData.customData
            ? {
                customData: {
                  ...(pendingUpdatesRef.current.customData || {}),
                  ...newData.customData,
                },
              }
            : {}),
        };
        return;
      }

      // 2. Queue updates for cloud synchronization
      setSyncStatus('syncing');
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...newData,
        ...(newData.customData
          ? {
              customData: {
                ...(pendingUpdatesRef.current.customData || {}),
                ...newData.customData,
              },
            }
          : {}),
      };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (isImmediate) {
        await flushPendingUpdates();
      } else {
        // Fast 250ms debounce for lightning-quick syncing without redundant writes
        saveTimeoutRef.current = setTimeout(() => {
          flushPendingUpdates();
        }, 250);
      }
    },
    [flushPendingUpdates]
  );

  // Manual pull-to-refresh
  const forceRefreshFromCloud = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser || !db || !isFirebaseConfigured) {
      setSyncStatus('saved');
      return;
    }

    if (isQuotaExceededRef.current) {
      setSyncStatus('quota-exceeded');
      return;
    }

    const docPath = `users/${currentUser.uid}/data/appState`;
    const docRef = doc(db, 'users', currentUser.uid, 'data', 'appState');
    setSyncStatus('syncing');

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserAppData;
        setAppData(data);
        lastAppliedServerUpdatedAtRef.current = data.updatedAt || new Date().toISOString();
        lastPersistedSemanticKeyRef.current = getSemanticPayloadKey(data);
        setLastSyncedAt(new Date());
        setSyncStatus('saved');
      } else {
        setSyncStatus('saved');
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        isQuotaExceededRef.current = true;
        setSyncStatus('quota-exceeded');
      } else {
        syncLogger.saveFailure(currentUser.uid, 'forceRefresh', docPath, err, false);
        handleFirestoreError(err, OperationType.GET, docPath);
        setSyncStatus('error');
      }
    }
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!auth) {
      throw new Error('Firebase is currently disconnected. Please connect a new Firebase project.');
    }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email: string, pass: string) => {
    if (!auth) {
      throw new Error('Firebase is currently disconnected. Please connect a new Firebase project.');
    }
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setActiveUserId(null);
    clearUnscopedSessionData();
    if (!auth) {
      setUser(null);
      setAppData({ notes: '', content: '' });
      return;
    }
    setAuthLoading(true);
    try {
      if (Object.keys(pendingUpdatesRef.current).length > 0 && !isQuotaExceededRef.current && isFirebaseConfigured) {
        await flushPendingUpdates();
      }
      await firebaseSignOut(auth);
    } finally {
      setUser(null);
      setAppData({ notes: '', content: '' });
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    authLoading,
    syncStatus,
    lastSyncedAt,
    appData,
    isCloudLoaded,
    signIn,
    signUp,
    signOut,
    login: signIn,
    logout: signOut,
    updateAppData,
    flushPendingUpdates,
    forceRefreshFromCloud,
  };

  return <AuthSyncContext.Provider value={value}>{children}</AuthSyncContext.Provider>;
};

export const useAuthSync = () => {
  const context = useContext(AuthSyncContext);
  if (!context) {
    throw new Error('useAuthSync must be used within an AuthSyncProvider');
  }
  return context;
};
