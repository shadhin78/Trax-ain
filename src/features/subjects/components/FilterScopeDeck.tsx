/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Track, Program } from '../../../types/academic';

interface FilterScopeDeckProps {
  tracks: Track[];
  programs: Program[];
  selectedTrackId: string;
  selectedProgramId: string;
  searchQuery: string;
  totalFilteredSubjects: number;
  totalSubjects: number;
  onSelectTrack: (trackId: string) => void;
  onSelectProgram: (programId: string) => void;
  onSearchChange: (query: string) => void;
  onResetFilters?: () => void;
}

/**
 * Filter Scope Deck for Subject Page
 * Provides primary Track and Program filtering controls with enlarged sizing,
 * strong page presence, and transparent X-29 spatial styling.
 * Subject selection is decoupled and handled directly via Subject Cards.
 */
export const FilterScopeDeck: React.FC<FilterScopeDeckProps> = React.memo(({
  tracks,
  programs,
  selectedTrackId,
  selectedProgramId,
  searchQuery,
  totalFilteredSubjects,
  totalSubjects,
  onSelectTrack,
  onSelectProgram,
  onSearchChange,
  onResetFilters,
}) => {
  // Cascading programs for the current track selection
  const availablePrograms = useMemo(() => {
    return selectedTrackId === 'all'
      ? programs
      : programs.filter(p => p.trackId === selectedTrackId);
  }, [programs, selectedTrackId]);

  const hasActiveFilters = selectedTrackId !== 'all' || selectedProgramId !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="w-full space-y-5 p-5 sm:p-6 lg:p-7 rounded-3xl border border-white/[0.1] bg-[#131722]/30 backdrop-blur-md shadow-[0_12px_36px_rgba(0,0,0,0.3)]">
      {/* ── TOP ROW: SECTION TITLE & ENLARGED SEARCH BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8] shadow-[0_0_16px_rgba(99,102,241,0.2)]">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#F8FAFC]">
                Filter Hierarchy
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8]">
                Scope
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
              Select Track and Program scope to view filtered Subject Cards
            </p>
          </div>
        </div>

        {/* Enlarged Prominent Search Input */}
        <div className="relative w-full md:w-80 lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search subject, chapter or topic..."
            className="w-full h-11 sm:h-12 pl-10 pr-9 rounded-xl border border-white/[0.12] bg-[#0E121B]/70 font-mono text-xs sm:text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── SECOND ROW: TRACK & PROGRAM CONTROLS + SUMMARY COUNT ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Track and Program Dropdowns */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Track Dropdown Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label 
              htmlFor="track-filter-select" 
              className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5 shrink-0"
            >
              <span className="h-2 w-2 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span>Track:</span>
            </label>
            <div className="relative">
              <select
                id="track-filter-select"
                value={selectedTrackId}
                onChange={(e) => onSelectTrack(e.target.value)}
                className="h-11 sm:h-12 min-w-[210px] sm:min-w-[250px] px-4 py-2.5 rounded-xl border border-white/[0.14] bg-[#0E121B]/80 font-mono text-xs sm:text-sm text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 focus:outline-none cursor-pointer transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
              >
                <option value="all">All Tracks ({tracks.length})</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Program Dropdown Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label 
              htmlFor="program-filter-select" 
              className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5 shrink-0"
            >
              <span className="h-2 w-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <span>Program:</span>
            </label>
            <div className="relative">
              <select
                id="program-filter-select"
                value={selectedProgramId}
                onChange={(e) => onSelectProgram(e.target.value)}
                className="h-11 sm:h-12 min-w-[210px] sm:min-w-[250px] px-4 py-2.5 rounded-xl border border-white/[0.14] bg-[#0E121B]/80 font-mono text-xs sm:text-sm text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 focus:outline-none cursor-pointer transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
              >
                <option value="all">All Programs ({availablePrograms.length})</option>
                {availablePrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Shortcut (appears when any filter is customized) */}
          {hasActiveFilters && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20 transition-all cursor-pointer self-start sm:self-auto"
              title="Reset all filters to All Tracks / All Programs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Dynamic Filter Results Badge */}
        <div className="flex items-center gap-2 self-start lg:self-center px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs sm:text-sm font-mono text-[#94A3B8] shadow-inner">
          <span>
            Showing <strong className="text-[#F8FAFC] font-semibold">{totalFilteredSubjects}</strong> of {totalSubjects} Subjects
          </span>
        </div>
      </div>
    </div>
  );
});

FilterScopeDeck.displayName = 'FilterScopeDeck';
