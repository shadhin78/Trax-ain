/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SyncLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SyncLogEntry {
  timestamp: string;
  level: SyncLogLevel;
  event: string;
  details?: Record<string, unknown>;
}

const MAX_LOG_HISTORY = 100;
const logHistory: SyncLogEntry[] = [];

function emitLog(level: SyncLogLevel, event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const entry: SyncLogEntry = { timestamp, level, event, details };
  
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Console output formatted with clean [X29-Sync] prefix
  const prefix = `[X29-Sync ${timestamp.slice(11, 19)}] [${event}]`;
  const safeDetails = details ? { ...details } : undefined;
  
  // Mask any accidental sensitive keys
  if (safeDetails) {
    delete (safeDetails as Record<string, unknown>).password;
    delete (safeDetails as Record<string, unknown>).token;
  }

  if (level === 'error') {
    console.error(prefix, safeDetails ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, safeDetails ?? '');
  } else {
    console.log(prefix, safeDetails ?? '');
  }
}

export const syncLogger = {
  saveStart: (userId: string | null, section: string, docPath: string, version: number) => {
    emitLog('info', 'SAVE_START', { userId, section, docPath, version });
  },
  saveSuccess: (userId: string | null, section: string, docPath: string, durationMs: number, version: number) => {
    emitLog('info', 'SAVE_SUCCESS', { userId, section, docPath, durationMs, version });
  },
  saveFailure: (userId: string | null, section: string, docPath: string, error: unknown, willRetry: boolean) => {
    const errText = error instanceof Error ? error.message : String(error);
    const isTimeoutOrQuota =
      errText.includes('timeout') ||
      errText.includes('Timeout') ||
      errText.includes('resource-exhausted') ||
      errText.includes('Quota') ||
      errText.includes('quota');

    emitLog(isTimeoutOrQuota ? 'warn' : 'error', 'SAVE_FAILURE', {
      userId,
      section,
      docPath,
      error: errText,
      willRetry,
    });
  },
  incomingSnapshot: (
    userId: string | null,
    docPath: string,
    hasPendingWrites: boolean,
    updatedAt?: string,
    version?: number
  ) => {
    emitLog('info', 'INCOMING_SNAPSHOT', {
      userId,
      docPath,
      hasPendingWrites,
      updatedAt,
      version,
    });
  },
  conflictRejected: (reason: string, details?: Record<string, unknown>) => {
    emitLog('warn', 'CONFLICT_REJECTED', { reason, ...details });
  },
  hydrationOrder: (step: string, details?: Record<string, unknown>) => {
    emitLog('info', 'HYDRATION_ORDER', { step, ...details });
  },
  authChanged: (userId: string | null, email?: string | null) => {
    emitLog('info', 'AUTH_CHANGED', { userId, email });
  },
  retryAttempt: (section: string, attempt: number, maxAttempts: number) => {
    emitLog('warn', 'RETRY_ATTEMPT', { section, attempt, maxAttempts });
  },
  quotaExceeded: (userId: string | null, docPath: string, message: string) => {
    emitLog('warn', 'QUOTA_EXCEEDED', {
      userId,
      docPath,
      message,
      note: 'Firestore daily write quota reached. Local persistence remains fully active.',
    });
  },
  getHistory: () => [...logHistory],
};
