/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, disableNetwork, enableNetwork, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect whether a valid Firebase project configuration is present
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId.trim() !== ''
);

// Initialize Firebase SDK only if valid credentials are provided
if (typeof window !== 'undefined') {
  try {
    const currentProj = firebaseConfig?.projectId || '';
    const storedProj = localStorage.getItem('x29_active_project_id');
    if (currentProj && currentProj !== storedProj) {
      localStorage.setItem('x29_active_project_id', currentProj);
      localStorage.removeItem('x29_quota_exceeded');
    }
  } catch {
    // Ignore storage errors
  }
}

export const app: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth: Auth | null = isFirebaseConfigured && app ? getAuth(app) : null;

const dbId = (firebaseConfig as Record<string, unknown>).firestoreDatabaseId as string | undefined;
export const db: Firestore | null = isFirebaseConfigured && app
  ? (dbId && dbId.trim() !== '' ? getFirestore(app, dbId) : getFirestore(app))
  : null;

// Authentication Error Handler Helper
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred.';
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return (error as Error)?.message || 'Authentication error. Please try again.';
  }
}

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  GET = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      email?: string | null;
    }[];
  };
  operationType: OperationType;
  path: string | null;
}

/**
 * Robust detection of Firestore free-tier write quota exhaustion and backoff errors
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? (error.message + ' ' + (error.stack || '')) : typeof error === 'object' ? JSON.stringify(error) : String(error);
  const code = (error as { code?: string })?.code;
  return (
    code === 'resource-exhausted' ||
    message.includes('resource-exhausted') ||
    message.includes('Quota limit exceeded') ||
    message.includes('Quota exceeded') ||
    message.includes('maximum backoff delay') ||
    message.includes('Free daily write units')
  );
}

// Global listener for quota exhaustion
type QuotaListener = (errorMsg: string) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export function onQuotaExceeded(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  return () => {
    quotaListeners.delete(listener);
  };
}

let isNetworkDisabled = false;

export async function disableFirestoreNetwork(): Promise<void> {
  if (isNetworkDisabled || !db) return;
  try {
    isNetworkDisabled = true;
    await disableNetwork(db);
  } catch {
    // Ignore if already disabled or unsupported
  }
}

export async function enableFirestoreNetwork(): Promise<void> {
  if (!db) return;
  try {
    isNetworkDisabled = false;
    await enableNetwork(db);
  } catch {
    // Ignore
  }
}

export function notifyQuotaExceeded(errorMsg: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('x29_quota_exceeded', Date.now().toString());
    }
  } catch {
    // Ignore storage errors
  }

  // Immediately cease background stream retries to prevent overloading & backoff loops
  disableFirestoreNetwork().catch(() => {});

  quotaListeners.forEach((listener) => {
    try {
      listener(errorMsg);
    } catch {
      // ignore
    }
  });
}

// Global console filter to safely redirect @firebase/firestore resource-exhausted & backoff notices to warn
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    // Check all arguments for quota exhaustion or timeout signatures
    const fullText = args
      .filter(Boolean)
      .map((item) => (item instanceof Error ? (item.message + ' ' + (item.stack || '')) : typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(' ');

    if (isQuotaExceededError(fullText)) {
      notifyQuotaExceeded(fullText);
      console.warn('[X29-Firestore] Notice: Firestore daily free tier quota or backoff encountered. Switched to offline mode with local persistence.');
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errString = error instanceof Error ? error.message : String(error);

  if (isQuotaExceededError(error)) {
    notifyQuotaExceeded(errString);
    console.warn(`[X29-Firestore] Quota limit reached for ${path || 'database'}. Local persistence active.`);
    return null;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errString,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}
