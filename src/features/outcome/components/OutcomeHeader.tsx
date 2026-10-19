/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useOutcome } from '../context/OutcomeContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';

interface OutcomeHeaderProps {
  onOpenAddModal: () => void;
}

const OutcomeHeaderComponent: React.FC<OutcomeHeaderProps> = ({ onOpenAddModal }) => {
  const { selectedProgramFilter, setSelectedProgramFilter } = useOutcome();
  const { programs } = useAcademicHierarchy();

  return (
    <div className="w-full space-y-4 font-mono select-none">
      {/* ── TOP TITLE & + ADD RESULT BUTTON (MATCHING IMAGE 1) ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Left Icon & Titles */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B]/30 to-[#D97706]/20 border border-[#F59E0B]/40 text-[#FBBF24] shadow-[0_0_16px_rgba(245,158,11,0.25)] shrink-0">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="font-mono text-base sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
              Success & Results
            </h1>
            <p className="font-mono text-[9px] sm:text-xs text-[#94A3B8] tracking-widest uppercase mt-0.5">
              LOG PROGRAM CGPAS AND MAJOR ACHIEVEMENTS
            </p>
          </div>
        </div>

        {/* Right + ADD RESULT button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-mono text-xs sm:text-sm font-black tracking-wider transition-colors duration-150 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-[#FBBF24] md:hover:scale-[1.02] md:transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD RESULT</span>
        </button>
      </div>

      {/* ── PROGRAM FILTER PILLS ROW (NO BG WITH INSIDE GLOWING STYLE) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {/* ALL PILL */}
        <button
          type="button"
          onClick={() => setSelectedProgramFilter('ALL')}
          className={`
            shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider cursor-pointer border
            ${
              selectedProgramFilter === 'ALL'
                ? 'border-[#6366F1] bg-transparent text-white shadow-[inset_0_0_12px_rgba(99,102,241,0.65)] ring-1 ring-[#6366F1]/50 md:transition-all md:duration-200'
                : 'border-white/[0.08] bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20'
            }
          `}
        >
          <span className="h-2 w-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
          <span>ALL</span>
        </button>

        {/* DYNAMIC PROGRAMS FROM ACADEMIC HIERARCHY */}
        {programs.map((program, idx) => {
          const isSelected = selectedProgramFilter === program.id;
          const palette = [
            { border: 'border-[#3B82F6]', shadow: 'shadow-[inset_0_0_12px_rgba(59,130,246,0.65)] ring-1 ring-[#3B82F6]/50', dot: 'bg-[#3B82F6]' },
            { border: 'border-[#10B981]', shadow: 'shadow-[inset_0_0_12px_rgba(16,185,129,0.65)] ring-1 ring-[#10B981]/50', dot: 'bg-[#10B981]' },
            { border: 'border-[#8B5CF6]', shadow: 'shadow-[inset_0_0_12px_rgba(139,92,246,0.65)] ring-1 ring-[#8B5CF6]/50', dot: 'bg-[#8B5CF6]' },
            { border: 'border-[#EC4899]', shadow: 'shadow-[inset_0_0_12px_rgba(236,72,153,0.65)] ring-1 ring-[#EC4899]/50', dot: 'bg-[#EC4899]' },
            { border: 'border-[#06B6D4]', shadow: 'shadow-[inset_0_0_12px_rgba(6,182,212,0.65)] ring-1 ring-[#06B6D4]/50', dot: 'bg-[#06B6D4]' },
            { border: 'border-[#F59E0B]', shadow: 'shadow-[inset_0_0_12px_rgba(245,158,11,0.65)] ring-1 ring-[#F59E0B]/50', dot: 'bg-[#F59E0B]' },
          ];
          const color = palette[idx % palette.length];

          return (
            <button
              key={program.id}
              type="button"
              onClick={() => setSelectedProgramFilter(isSelected ? 'ALL' : program.id)}
              className={`
                shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider cursor-pointer border
                ${
                  isSelected
                    ? `${color.border} bg-transparent text-white ${color.shadow} md:transition-all md:duration-200`
                    : 'border-white/[0.08] bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/20'
                }
              `}
            >
              <span className={`h-2 w-2 rounded-full ${isSelected ? color.dot : 'bg-[#64748B]'}`} />
              <span className="uppercase">{program.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const OutcomeHeader = React.memo(OutcomeHeaderComponent);
OutcomeHeader.displayName = 'OutcomeHeader';
