/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { XLogo } from '../ui/XLogo';

/**
 * Lightweight, neutral loading screen for authentication initialization.
 * Prevents flash of protected content while Firebase restores session credentials.
 * Follows X-29 monospace typography and transparent spatial aesthetics.
 */
export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-20 flex min-h-full min-h-dvh w-full flex-col items-center justify-center p-6 bg-transparent select-none"
    >
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
        {/* Pulsing X-29 Emblem */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#1F2637]/40 shadow-[0_0_24px_rgba(99,102,241,0.2)] p-2.5 backdrop-blur-sm">
          <XLogo size={28} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366F1] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6366F1]" />
          </span>
        </div>

        {/* Brand Label */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-black tracking-widest text-[#F8FAFC]">
            TraX
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.5">
            Command Deck
          </span>
        </div>

        {/* Verification Message */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 font-mono text-xs text-[#94A3B8]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-[#6366F1]" />
            <span className="tracking-wide">VERIFYING SECURITY SESSION...</span>
          </div>
          <p className="font-mono text-[10px] text-[#64748B]">
            Authenticating operator credentials
          </p>
        </div>
      </div>
    </div>
  );
};
