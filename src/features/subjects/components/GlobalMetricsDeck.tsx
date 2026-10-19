/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sliders, ArrowUpRight, Database } from 'lucide-react';

interface GlobalMetricsDeckProps {
  totalChapters: number;
  completedChapters: number;
  completionPercent: number;
  totalSubjects: number;
  totalTracks: number;
  onNavigateToMasterConfig?: () => void;
  onOpenCompletionDatabase?: () => void;
}

export const GlobalMetricsDeck: React.FC<GlobalMetricsDeckProps> = React.memo(({
  totalChapters,
  completedChapters,
  completionPercent,
  totalSubjects,
  totalTracks,
  onNavigateToMasterConfig,
  onOpenCompletionDatabase,
}) => {
  // SVG Radial Gauge Calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="w-full space-y-4">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Subjects
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              Spatial Hierarchy
            </span>
          </div>
          <p className="mt-1 text-xs font-mono text-[#94A3B8]">
            Academic Hierarchy Overview • Track → Program → Subject → Chapter → Topic
          </p>
        </div>

        {/* Master Config Button */}
        {onNavigateToMasterConfig && (
          <button
            onClick={onNavigateToMasterConfig}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#6366F1]/50 bg-[#6366F1]/20 font-mono text-xs font-semibold text-[#F8FAFC] hover:bg-[#6366F1]/30 hover:border-[#6366F1] transition-all self-start sm:self-center cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.25)] active:scale-95"
            title="Navigate to Master Configuration"
          >
            <Sliders className="h-3.5 w-3.5 text-[#818CF8]" />
            <span>Master Config</span>
            <ArrowUpRight className="h-3 w-3 text-white/50" />
          </button>
        )}
      </div>

      {/* ── METRICS DECK: GLOBAL OVERALL COMPLETION + SYLLABUS GAUGE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Global Overall Completion (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/[0.1] bg-[#131722]/40 backdrop-blur-md p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-white/[0.18] transition-all">
          {/* Subtle ambient light gradient */}
          <div 
            className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
            aria-hidden="true" 
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8]">
                Global Overall Completion
              </span>
              <div className="flex items-center gap-2">
                {onOpenCompletionDatabase && (
                  <button
                    type="button"
                    onClick={onOpenCompletionDatabase}
                    id="open-completion-database-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6366F1]/15 hover:bg-[#6366F1]/25 text-[#818CF8] hover:text-[#A5B4FC] border border-[#6366F1]/30 hover:border-[#6366F1]/50 font-mono text-xs font-semibold transition-all shadow-[0_0_12px_rgba(99,102,241,0.15)] cursor-pointer"
                    title="Open Chapter Completion Database"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Database</span>
                  </button>
                )}
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#94A3B8]">
                  {completedChapters} / {totalChapters} Chapters
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#F8FAFC]">
                {completionPercent}%
              </span>
              <span className="text-xs sm:text-sm font-mono text-[#94A3B8]">
                {totalChapters > 0 
                  ? `${completedChapters} of ${totalChapters} Chapters Completed` 
                  : 'No Chapters in Workspace'}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.08] p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#38BDF8] transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Chips */}
          <div className="pt-4 mt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-xs font-mono text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
              Tracks: <strong className="text-[#F8FAFC]">{totalTracks}</strong>
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
              Subjects: <strong className="text-[#F8FAFC]">{totalSubjects}</strong>
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              Completed: <strong className="text-[#10B981]">{completedChapters}</strong>
            </span>
          </div>
        </div>

        {/* Right: Radial Syllabus Gauge */}
        <div className="rounded-3xl border border-white/[0.1] bg-[#131722]/40 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/[0.18] transition-all relative overflow-hidden">
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8]">
              Syllabus Gauge
            </span>
            <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
          </div>

          {/* Radial SVG Gauge */}
          <div className="relative my-3 flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-white/[0.08]"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-[#6366F1] transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.6))',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black font-mono tracking-tight text-[#F8FAFC]">
                {completionPercent}%
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#94A3B8]">
                Syllabus
              </span>
            </div>
          </div>

          {/* Status Subtext */}
          <div className="w-full pt-3 border-t border-white/[0.06] text-center">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              {totalChapters === 0 
                ? 'No Chapters Configured' 
                : completionPercent === 100 
                  ? 'All Chapters Complete' 
                  : `${totalChapters - completedChapters} Remaining Chapters`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

GlobalMetricsDeck.displayName = 'GlobalMetricsDeck';
