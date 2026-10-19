/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tombstone & Active User Management for X-29
 * Ensures reliable deletion semantics across refreshes, offline states, and multi-device sync.
 */

const ACTIVE_USER_KEY = 'x29_active_user_id';

/**
 * Returns the currently active authenticated user ID synchronously.
 * Reads memory or localStorage to eliminate auth-resolution race conditions during page load/refresh.
 */
export function getActiveUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Updates the stored active user ID.
 */
export function setActiveUserId(userId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Storage key for deletion tombstones scoped to user or local/guest.
 */
export function getTombstoneStorageKey(userId?: string | null): string {
  const uid = userId !== undefined ? userId : getActiveUserId();
  return uid ? `x29_tombstones_${uid}` : 'x29_tombstones_local';
}

/**
 * Retrieve local tombstones map: { [recordId: string]: timestampMs }
 */
export function getLocalTombstones(userId?: string | null): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const key = getTombstoneStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, number>;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
}

/**
 * Records deletion of an item ID in the tombstone registry.
 * Persists locally and in global tombstone registries so resurrection is impossible.
 */
export function recordDeletion(id: string, type?: string, userId?: string | null): void {
  if (!id || typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const uid = userId !== undefined ? userId : getActiveUserId();

    // 1. Save to user-scoped tombstones
    const userKey = getTombstoneStorageKey(uid);
    const userTombstones = getLocalTombstones(uid);
    userTombstones[id] = now;
    localStorage.setItem(userKey, JSON.stringify(userTombstones));

    // 2. Also record in local fallback tombstones to protect guest/startup loads
    if (userKey !== 'x29_tombstones_local') {
      const localTombstones = getLocalTombstones(null);
      localTombstones[id] = now;
      localStorage.setItem('x29_tombstones_local', JSON.stringify(localTombstones));
    }

    // 3. Purge immediately from all known localStorage caches
    purgeIdFromLocalStorageCaches(id, uid);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Records multiple deletions in batch.
 */
export function recordDeletions(ids: string[], type?: string, userId?: string | null): void {
  if (!Array.isArray(ids) || !ids.length) return;
  ids.forEach((id) => recordDeletion(id, type, userId));
}

/**
 * Checks whether an item ID has been deleted.
 */
export function isItemDeleted(id: string, userId?: string | null): boolean {
  if (!id || typeof window === 'undefined') return false;
  try {
    const uid = userId !== undefined ? userId : getActiveUserId();
    const userTombstones = getLocalTombstones(uid);
    if (userTombstones[id]) return true;

    const localTombstones = getLocalTombstones(null);
    if (localTombstones[id]) return true;
  } catch {
    // Ignore storage errors
  }
  return false;
}

/**
 * Filters out deleted items from any collection with an `id` property.
 */
export function filterDeletedItems<T extends { id?: string }>(items: T[] | undefined | null, userId?: string | null): T[] {
  if (!Array.isArray(items)) return [];
  if (items.length === 0) return [];

  const uid = userId !== undefined ? userId : getActiveUserId();
  const userTombstones = getLocalTombstones(uid);
  const localTombstones = getLocalTombstones(null);

  return items.filter((item) => {
    if (!item || !item.id) return false;
    return !userTombstones[item.id] && !localTombstones[item.id];
  });
}

/**
 * Merges incoming remote tombstones (e.g. from Firestore sync) into local registry.
 */
export function mergeRemoteTombstones(
  remote: Record<string, number> | undefined | null,
  userId?: string | null
): Record<string, number> {
  const uid = userId !== undefined ? userId : getActiveUserId();
  const current = getLocalTombstones(uid);
  if (!remote || typeof remote !== 'object' || Array.isArray(remote)) {
    return current;
  }

  try {
    let changed = false;
    for (const [id, time] of Object.entries(remote)) {
      if (typeof time === 'number' && (!current[id] || time > current[id])) {
        current[id] = time;
        changed = true;
        // Purge deleted item from local caches
        purgeIdFromLocalStorageCaches(id, uid);
      }
    }

    if (changed) {
      localStorage.setItem(getTombstoneStorageKey(uid), JSON.stringify(current));
    }
  } catch {
    // Ignore storage error
  }

  return current;
}

/**
 * Purges an item ID directly from existing JSON caches in localStorage.
 */
function purgeIdFromLocalStorageCaches(id: string, userId?: string | null): void {
  if (typeof window === 'undefined' || !id) return;

  const storageKeys = [
    userId ? `x29_academic_hierarchy_${userId}` : null,
    'x29_academic_hierarchy',
    userId ? `x29_monthly_targets_${userId}` : null,
    'x29_monthly_targets_data',
    userId ? `x29_weekly_targets_${userId}` : null,
    'x29_weekly_targets_data',
    userId ? `x29_daily_actions_${userId}` : null,
    'x29_daily_actions_data',
    userId ? `x29_pace_management_${userId}` : null,
    'x29_pace_management_data',
    userId ? `x29_user_cache_${userId}` : null,
    'x29_user_cache_local',
    'x29_local_app_data',
    'x29_focus_sessions',
    'x29_subject_targets',
  ].filter(Boolean) as string[];

  storageKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.includes(id)) return;

      const parsed = JSON.parse(raw);
      let updated = false;

      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: { id?: string }) => item && item.id !== id);
        if (filtered.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
          updated = true;
        }
      } else if (parsed && typeof parsed === 'object') {
        // Check academic hierarchy structure
        ['tracks', 'programs', 'subjects', 'chapters', 'tasks', 'completionRecords'].forEach((prop) => {
          if (Array.isArray(parsed[prop])) {
            const before = parsed[prop].length;
            parsed[prop] = parsed[prop].filter((item: { id?: string; chapterId?: string; subjectId?: string; trackId?: string; programId?: string }) => {
              if (!item) return false;
              if (item.id === id) return false;
              if (item.chapterId === id) return false;
              if (item.subjectId === id) return false;
              return true;
            });
            if (parsed[prop].length !== before) updated = true;
          }
        });

        // Check daily actions data inside customData or root
        ['monthlyTargets', 'weeklyTargets', 'dailyActions'].forEach((prop) => {
          if (Array.isArray(parsed[prop])) {
            const before = parsed[prop].length;
            parsed[prop] = parsed[prop].filter((item: { id?: string }) => item && item.id !== id);
            if (parsed[prop].length !== before) updated = true;
          }
        });

        // Check customData nested structures
        if (parsed.customData && typeof parsed.customData === 'object') {
          const cd = parsed.customData;
          if (cd.dailyActionsData && typeof cd.dailyActionsData === 'object') {
            ['monthlyTargets', 'weeklyTargets', 'dailyActions'].forEach((prop) => {
              if (Array.isArray(cd.dailyActionsData[prop])) {
                const before = cd.dailyActionsData[prop].length;
                cd.dailyActionsData[prop] = cd.dailyActionsData[prop].filter((item: { id?: string }) => item && item.id !== id);
                if (cd.dailyActionsData[prop].length !== before) updated = true;
              }
            });
          }
          if (cd.paceManagement && typeof cd.paceManagement === 'object') {
            if (Array.isArray(cd.paceManagement.goals)) {
              const before = cd.paceManagement.goals.length;
              cd.paceManagement.goals = cd.paceManagement.goals.filter((item: { id?: string }) => item && item.id !== id);
              if (cd.paceManagement.goals.length !== before) updated = true;
            }
          }
        }

        // Check paceManagement goals at root
        if (Array.isArray(parsed.goals)) {
          const before = parsed.goals.length;
          parsed.goals = parsed.goals.filter((item: { id?: string }) => item && item.id !== id);
          if (parsed.goals.length !== before) updated = true;
        }

        if (updated) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
  });
}

/**
 * Purges legacy un-scoped session data and temporary in-memory caches upon logout
 * or when unauthenticated to prevent data leakage between sessions and users.
 */
export function clearUnscopedSessionData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem('x29_active_user_id');
    localStorage.removeItem('x29_user_cache_local');
    localStorage.removeItem('x29_local_app_data');
    localStorage.removeItem('x29_academic_hierarchy');
    localStorage.removeItem('x29_tombstones_local');
    localStorage.removeItem('x29_daily_actions_data');
    localStorage.removeItem('x29_monthly_targets_data');
    localStorage.removeItem('x29_weekly_targets_data');
    localStorage.removeItem('x29_pace_management_data');
    localStorage.removeItem('x29_focus_sessions');
    localStorage.removeItem('x29_subject_targets');
    localStorage.removeItem('x29_exam_routine_data');
    localStorage.removeItem('x29_outcome_data');
    if ((window as unknown as { AppState?: unknown }).AppState) {
      delete (window as unknown as { AppState?: unknown }).AppState;
    }
    sessionStorage.removeItem('x29_redirect_destination');
  } catch {
    // Ignore storage errors
  }
}
