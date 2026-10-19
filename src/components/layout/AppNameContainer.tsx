/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { XLogo } from '../ui/XLogo';

interface AppNameContainerProps {
  onNavigate: (route: AppRoute) => void;
  onCloseMobile?: () => void;
}

/**
 * Container 1 — App Name / Logo Container
 * Position:
 * - Top-left
 * - Occupies the same top horizontal level as the Header
 * - Horizontally aligned with the Header
 * - Must NOT sit above the Header
 * Style: Fully transparent background (no solid fill, no card effect, no shadow)
 * Contains ONLY the existing app logo/name area.
 */
export const AppNameContainer: React.FC<AppNameContainerProps> = ({
  onNavigate,
  onCloseMobile,
}) => {
  return (
    <div
      id="app-name-container"
      data-container="app-name"
      className="hidden lg:flex shrink-0 lg:w-60 px-2.5 sm:px-4 py-2 sm:py-3 lg:py-3.5 items-center bg-transparent"
    >
      <button
        onClick={() => {
          onNavigate('/');
          if (onCloseMobile) onCloseMobile();
        }}
        className="group flex items-center justify-between rounded-full lg:w-full transition-all duration-200 focus:outline-none px-3 py-2 sm:px-4 sm:py-2.5 border border-white/[0.08] bg-[#131722]/40 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#6366F1]/50 hover:bg-[#131722]/70"
        aria-label="TraX Dashboard Home"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F2637]/80 border border-white/[0.1] shadow-inner shrink-0 p-1">
            <XLogo size={18} />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC] group-hover:text-white">
              TraX
            </span>
            <span className="font-mono text-[9px] tracking-wider text-[#94A3B8]">
              COMMAND DECK
            </span>
          </div>
        </div>

        {/* Pulse Status Dot */}
        <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)] ml-2" />
      </button>
    </div>
  );
};
