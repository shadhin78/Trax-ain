/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SyncStatus } from '../../context/AuthSyncContext';
import { RefreshCw, CheckCircle2, WifiOff, AlertCircle } from 'lucide-react';

interface SyncStatusBarProps {
  status: SyncStatus;
}

/**
 * Sync Status Bar for X-29.
 * Positioned strictly above the Account button.
 * Transparent background style, displaying only the 4 required synchronization states:
 * - Syncing
 * - Saved
 * - Offline
 * - Sync error
 */
export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ status }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full items-center justify-between px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-transparent text-[#94A3B8] font-mono text-[10.5px] select-none mb-2"
    >
      <span className="tracking-wider uppercase text-[9px] text-[#64748B]">
        Cloud Sync
      </span>

      <div className="flex items-center gap-1.5">
        {status === 'syncing' && (
          <>
            <RefreshCw className="h-3 w-3 text-[#F59E0B] animate-spin shrink-0" />
            <span className="text-[#F59E0B] font-medium">Syncing</span>
          </>
        )}

        {status === 'saved' && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
            <span className="text-[#10B981] font-medium">Saved</span>
          </>
        )}

        {status === 'offline' && (
          <>
            <WifiOff className="h-3 w-3 text-[#94A3B8] shrink-0" />
            <span className="text-[#94A3B8]">Offline</span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-3 w-3 text-[#F43F5E] shrink-0" />
            <span className="text-[#F43F5E] font-medium">Sync error</span>
          </>
        )}

        {status === 'quota-exceeded' && (
          <>
            <AlertCircle className="h-3 w-3 text-[#F59E0B] shrink-0" />
            <span className="text-[#F59E0B] font-medium" title="Firestore daily free tier write quota reached. Local saves active.">Quota reached</span>
          </>
        )}
      </div>
    </div>
  );
};
