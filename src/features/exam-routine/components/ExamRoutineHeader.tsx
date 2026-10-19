/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useExamRoutine } from '../context/ExamRoutineContext';

interface ExamRoutineHeaderProps {
  onOpenAddSession: () => void;
}

const ExamRoutineHeaderComponent: React.FC<ExamRoutineHeaderProps> = ({ onOpenAddSession }) => {
  const { searchQuery, setSearchQuery, statusFilter, setStatusFilter } = useExamRoutine();

  return (
    <div className="w-full space-y-5 font-mono select-none">
      {/* ── 1. TITLE & + ADD SESSION BUTTON ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Icon & Heading */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] shadow-[0_0_16px_rgba(244,63,94,0.25)] shrink-0">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
              Exam Routine &amp; Timetable
            </h1>
            <p className="text-[9px] sm:text-xs text-[#94A3B8] tracking-widest uppercase mt-0.5">
              MANAGE SCHEDULES, VENUES, AND STUDY TARGETS FOR UPCOMING TESTS
            </p>
          </div>
        </div>

        {/* Right + ADD SESSION button */}
        <button
          type="button"
          onClick={onOpenAddSession}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white font-mono text-xs sm:text-sm font-black tracking-wider transition-colors duration-150 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-[#FB7185] md:hover:scale-[1.02] md:transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD SESSION</span>
        </button>
      </div>

      {/* ── 2. SEARCH & SEGMENTED SWITCH ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam title, subject, program..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-[#131722] font-mono text-xs text-[#F8FAFC] placeholder-[#64748B] hover:border-white/15 focus:border-[#F43F5E] focus:outline-none transition-colors"
          />
        </div>

        {/* Segmented Switch: ALL | UPCOMING | COMPLETED (NO BG WITH INSIDE GLOWING STYLE) */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/[0.08] bg-transparent self-start sm:self-auto">
          {(['ALL', 'UPCOMING', 'COMPLETED'] as const).map((filter) => {
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`
                  px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider cursor-pointer border
                  ${
                    isActive
                      ? 'border-[#F43F5E]/70 bg-transparent text-white shadow-[inset_0_0_12px_rgba(244,63,94,0.65)] ring-1 ring-[#F43F5E]/40 md:transition-all md:duration-200'
                      : 'border-transparent bg-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
                  }
                `}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ExamRoutineHeader = React.memo(ExamRoutineHeaderComponent);
ExamRoutineHeader.displayName = 'ExamRoutineHeader';
