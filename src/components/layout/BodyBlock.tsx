/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { AccountView, BackgroundMode } from '../../features/account/AccountView';
import { Layers, Compass } from 'lucide-react';

interface BodyBlockProps {
  route: AppRoute;
  title: string;
  isTransitioning: boolean;
  backgroundMode: BackgroundMode;
  onSetBackgroundMode: (mode: BackgroundMode) => void;
}

/**
 * BLOCK 04 — Body Block (Bottom-Right Quadrant)
 * Completely transparent background, position secured by borders.
 * Displays "blank Body" workspace area (matching diagram) or active view with full interactivity.
 */
export const BodyBlock: React.FC<BodyBlockProps> = ({
  route,
  title,
  isTransitioning,
  backgroundMode,
  onSetBackgroundMode,
}) => {
  const isAccountPage = route === '/account/';

  return (
    <main
      data-block="body"
      className={`
        relative flex flex-1 flex-col justify-between p-4 sm:p-6 lg:p-8 bg-transparent w-full min-w-0 transition-opacity duration-150
        ${isTransitioning ? 'opacity-40' : 'opacity-100'}
      `}
    >
      <div className="w-full min-w-0 flex-1 flex flex-col">
        {/* ── TOP HEADER OF BODY BLOCK ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/[0.08] min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] sm:text-xs text-[#94A3B8]">
              <span>TraX</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#6366F1] truncate">{route}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.2 ml-1">
                body
              </span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#F8FAFC] truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs text-[#94A3B8] rounded-xl px-3 py-1.5 border border-white/[0.1] bg-transparent backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>BODY ACTIVE</span>
            </div>
          </div>
        </div>

        {/* ── BODY WORKSPACE AREA ── */}
        <div className="mt-4 sm:mt-6 flex-1 flex flex-col min-w-0">
          {isAccountPage ? (
            <div className="min-w-0 py-2">
              <AccountView
                backgroundMode={backgroundMode}
                onSetBackgroundMode={onSetBackgroundMode}
              />
            </div>
          ) : (
            /* Blank Body Container — secured by border & 100% transparent */
            <div className="flex-1 flex min-h-[360px] sm:min-h-[440px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.14] bg-transparent p-6 sm:p-12 text-center relative overflow-hidden group hover:border-[#6366F1]/40 transition-colors">
              {/* Subtle ambient crosshair lines */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 60%)',
                }}
                aria-hidden="true"
              />

              {/* Center icon */}
              <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-white/[0.14] bg-transparent backdrop-blur-sm text-[#6366F1] shadow-[0_0_24px_rgba(99,102,241,0.2)] mb-4">
                <Compass className="h-7 w-7 sm:h-8 sm:w-8 animate-pulse text-[#6366F1]" />
                <span className="absolute -bottom-1 -right-1 font-mono text-[8px] font-bold bg-[#1F2637] border border-white/[0.1] px-1 rounded text-[#F8FAFC]">
                  TX
                </span>
              </div>

              {/* Title from diagram: "blank Body" */}
              <h2 className="font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider text-[#F8FAFC]">
                blank Body
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-sm sm:max-w-md">
                Workspace viewport for <span className="text-[#F8FAFC] font-semibold">{title}</span>. Transparent design preserved, location secured by borders.
              </p>

              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] text-[#64748B]">
                <Layers className="h-3 w-3 text-[#6366F1]" />
                <span>QUADRANT 04 // BODY VIEWPORT READY</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER OF BODY BLOCK ── */}
      <div className="mt-6 pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-[#64748B]">
        <span>TraX SPATIAL ENVIRONMENT — 4 SECURED BLOCKS</span>
        <div className="flex items-center gap-3">
          <span>MODE: {backgroundMode.toUpperCase()}</span>
          <span aria-hidden="true">·</span>
          <span>BORDER: ACTIVE</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#6366F1]">BLOCK 04</span>
        </div>
      </div>
    </main>
  );
};
