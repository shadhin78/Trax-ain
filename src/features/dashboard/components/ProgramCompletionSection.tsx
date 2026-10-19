/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../outcome/context/OutcomeContext';
import { CompletionCard } from './CompletionCard';
import { CompletionStatusModal } from './CompletionStatusModal';
import { AppRoute } from '../../../types/navigation';

interface ProgramCompletionSectionProps {
  onNavigate?: (route: AppRoute) => void;
}

const PROGRAM_COLOR_PALETTE = [
  '#38BDF8', // Sky / Blue (e.g. CL)
  '#10B981', // Emerald / Green (e.g. AL)
  '#8B5CF6', // Purple / Violet (e.g. BBA 2ND)
  '#F43F5E', // Rose / Coral (e.g. BBA 1ST)
  '#06B6D4', // Cyan (e.g. PL)
  '#F59E0B', // Amber (e.g. BBA 3RD)
  '#EC4899', // Pink (e.g. BBA 4TH)
  '#6366F1', // Indigo
];

export function getProgramColor(name: string, index: number): string {
  const lower = name.toLowerCase();
  if (lower.includes('cl')) return '#38BDF8';
  if (lower.includes('al')) return '#10B981';
  if (lower.includes('1st') || lower.includes('first')) return '#F43F5E';
  if (lower.includes('2nd') || lower.includes('second')) return '#8B5CF6';
  if (lower.includes('3rd') || lower.includes('third')) return '#F59E0B';
  if (lower.includes('4th') || lower.includes('fourth')) return '#EC4899';
  if (lower.includes('pl')) return '#06B6D4';
  return PROGRAM_COLOR_PALETTE[index % PROGRAM_COLOR_PALETTE.length];
}

/**
 * Program Completion Section for Dashboard
 * Displays overall progress for all enrolled study programs dynamically from academic hierarchy.
 */
export const ProgramCompletionSection: React.FC<ProgramCompletionSectionProps> = ({ onNavigate }) => {
  const { programs, subjects, chapters } = useAcademicHierarchy();
  const { freezeConfig } = useOutcome();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const programMetrics = useMemo(() => {
    // Sort programs according to canonical order
    const sortedPrograms = [...programs].sort((a, b) => a.order - b.order);

    return sortedPrograms.map((prog, idx) => {
      const progSubjects = subjects.filter((s) => s.programId === prog.id);
      const progSubjectIds = new Set(progSubjects.map((s) => s.id));

      // Active non-skipped chapters belonging to this program
      const progChapters = chapters.filter(
        (c) =>
          (c.programId === prog.id || progSubjectIds.has(c.subjectId)) &&
          !c.isSkipped &&
          c.status !== 'skipped'
      );

      const totalChapters = progChapters.length;
      const completedChapters = progChapters.filter(
        (c) => c.completed || c.status === 'completed'
      ).length;

      // Check if program is passed via Outcome Pass/Freeze config
      const isProgramPassed = Boolean(
        freezeConfig?.frozenProgramIds?.includes(prog.id) ||
        freezeConfig?.manualFrozenProgramIds?.includes(prog.id) ||
        (progSubjects.length > 0 &&
          progSubjects.every(
            (s) =>
              freezeConfig?.frozenSubjectIds?.includes(s.id) ||
              freezeConfig?.manualFrozenSubjectIds?.includes(s.id)
          ))
      );

      const percentage = isProgramPassed
        ? 100
        : totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

      const color = getProgramColor(prog.name, idx);

      return {
        id: prog.id,
        name: prog.name,
        completedChapters,
        totalChapters,
        percentage,
        color,
      };
    });
  }, [programs, subjects, chapters, freezeConfig]);

  if (programs.length === 0) {
    return (
      <section className="space-y-3 font-mono">
        <div className="space-y-1">
          <h3 className="font-mono text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#CBD5E1]">
            PROGRAM COMPLETION
          </h3>
          <p className="font-mono text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
            OVERALL PROGRESS FOR ALL ENROLLED STUDY PROGRAMS
          </p>
        </div>
        <div className="w-full py-8 text-center rounded-[24px] border border-dashed border-white/[0.08] bg-[#0B0F19]/30 text-[#64748B] text-xs font-mono">
          NO ENROLLED STUDY PROGRAMS DETECTED
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 font-mono">
      {/* ── HEADER ── */}
      <div className="space-y-1">
        <h3 className="font-mono text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#CBD5E1]">
          PROGRAM COMPLETION
        </h3>
        <p className="font-mono text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
          OVERALL PROGRESS FOR ALL ENROLLED STUDY PROGRAMS
        </p>
      </div>

      {/* ── CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {programMetrics.map((prog) => (
          <CompletionCard
            key={prog.id}
            id={prog.id}
            name={prog.name}
            completedChapters={prog.completedChapters}
            totalChapters={prog.totalChapters}
            percentage={prog.percentage}
            color={prog.color}
            onProgressClick={() => setSelectedProgramId(prog.id)}
          />
        ))}
      </div>

      {/* ── COMPLETION STATUS BREAKDOWN MODAL ── */}
      {selectedProgramId && (
        <CompletionStatusModal
          isOpen={true}
          onClose={() => setSelectedProgramId(null)}
          target={{ type: 'program', id: selectedProgramId }}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
};
