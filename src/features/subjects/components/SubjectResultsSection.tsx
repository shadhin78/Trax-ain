/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { Track, Program, Subject, Chapter } from '../../../types/academic';
import { useOutcome } from '../../outcome/context/OutcomeContext';

interface SubjectResultsSectionProps {
  tracks: Track[];
  programs: Program[];
  subjects: Subject[];
  chapters: Chapter[];
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string) => void;
  selectedTrackFilter: string;
  selectedProgramFilter: string;
}

/**
 * Subject Results Section
 * Displays filtered subjects structured in the exact format from the reference layout:
 * - Grouped by Program rows with clear uppercase program titles (e.g., "CL PROGRAM", "PL PROGRAM")
 * - Rounded pill buttons for [ ENTIRE {PROGRAM} ] followed by individual Subject pills
 * - Selected subject pill glows with X-29 accent styling without modifying Track/Program filters
 * - 100% transparent floating container preserving the X-29 Grid Background
 */
export const SubjectResultsSection: React.FC<SubjectResultsSectionProps> = React.memo(({
  tracks,
  programs,
  subjects,
  chapters,
  selectedSubjectId,
  onSelectSubject,
  selectedTrackFilter,
  selectedProgramFilter,
}) => {
  const { freezeConfig } = useOutcome();
  const isSubjectPassed = (id: string) => Boolean(freezeConfig?.frozenSubjectIds?.includes(id));

  // Cascading programs based on Track and Program filter selections
  const visiblePrograms = useMemo(() => {
    return programs.filter((prog) => {
      if (selectedTrackFilter !== 'all' && prog.trackId !== selectedTrackFilter) {
        return false;
      }
      if (selectedProgramFilter !== 'all' && prog.id !== selectedProgramFilter) {
        return false;
      }
      return true;
    });
  }, [programs, selectedTrackFilter, selectedProgramFilter]);

  // Filter programs that have matching subjects in current filtered scope
  const programsWithSubjects = useMemo(() => {
    return visiblePrograms.map((prog) => {
      const progSubjects = subjects.filter((s) => s.programId === prog.id);
      const progTrack = tracks.find((t) => t.id === prog.trackId);
      return {
        program: prog,
        track: progTrack,
        subjects: progSubjects,
      };
    }).filter((group) => group.subjects.length > 0);
  }, [visiblePrograms, subjects, tracks]);

  if (programsWithSubjects.length === 0) {
    return null;
  }

  // Active state for All Subjects (when no specific subject or entire program is selected)
  const isAllSubjectsActive = !selectedSubjectId || selectedSubjectId === 'all';

  return (
    <div className="w-full rounded-3xl border border-white/[0.1] bg-[#131722]/30 backdrop-blur-md p-5 sm:p-6 lg:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.3)] space-y-6">
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8]">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#F8FAFC]">
              Subject Results
            </h3>
            <p className="text-[11px] font-mono text-[#94A3B8]">
              Select any subject to inspect its chapter matrix & pace tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {/* 1. All Subjects Button in Header */}
          <button
            type="button"
            id="all-subjects-btn"
            onClick={() => onSelectSubject('all')}
            className={`
              inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-mono text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 cursor-pointer border select-none
              ${
                isAllSubjectsActive
                  ? 'border-[#818CF8] bg-[#818CF8]/20 text-[#818CF8] shadow-[0_0_16px_rgba(129,140,248,0.4)] ring-1 ring-[#818CF8]/70 scale-[1.02]'
                  : 'border-white/[0.1] bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.22] hover:bg-white/[0.08]'
              }
            `}
            title="Show all subject cards below filter"
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>All Subjects</span>
          </button>

          <span className="px-3 py-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-[#94A3B8]">
            {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} in Scope
          </span>
        </div>
      </div>


      {/* ── PROGRAM ROWS (Matches Reference Image Structural Format) ── */}
      <div className="space-y-6">
        {programsWithSubjects.map(({ program, track, subjects: progSubjects }, index) => {
          const isEntireSelected = selectedSubjectId === `entire_${program.id}`;
          const isLast = index === programsWithSubjects.length - 1;

          // Format title: if program.name already contains "program", avoid duplicate
          const rawName = program.name.trim();
          const programLabel = rawName.toLowerCase().endsWith('program')
            ? rawName.toUpperCase()
            : `${rawName.toUpperCase()} PROGRAM`;

          return (
            <div 
              key={program.id} 
              className={`space-y-3 ${!isLast ? 'pb-6 border-b border-white/[0.06]' : ''}`}
            >
              {/* Program Label Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
                    {programLabel}
                  </span>
                  {selectedTrackFilter === 'all' && track && (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#64748B]">
                      {track.name}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-[#64748B]">
                  {progSubjects.length} {progSubjects.length === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>

              {/* Horizontal Pill Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* 1. [ ENTIRE {PROGRAM} ] Button */}
                <button
                  type="button"
                  onClick={() => onSelectSubject(`entire_${program.id}`)}
                  className={`
                    px-4 py-2 rounded-2xl font-mono text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 cursor-pointer border select-none shrink-0
                    ${
                      isEntireSelected
                        ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.4)] ring-1 ring-[#38BDF8]/70 scale-[1.02]'
                        : 'border-white/[0.1] bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.22] hover:bg-white/[0.08]'
                    }
                  `}
                  title={`View all chapters across ${program.name}`}
                >
                  [ ENTIRE {rawName.toUpperCase()} ]
                </button>

                {/* 2. Individual Subject Buttons */}
                {progSubjects.map((subj) => {
                  const isSelected = selectedSubjectId === subj.id;
                  const isPassed = isSubjectPassed(subj.id);
                  const subjChapters = chapters.filter((c) => c.subjectId === subj.id);
                  const activeSubjChapters = subjChapters.filter(c => !c.isSkipped && c.status !== 'skipped');
                  const isAllCompleted = activeSubjChapters.length > 0 && activeSubjChapters.every((c) => c.completed || c.status === 'completed');

                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => onSelectSubject(subj.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-mono text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 cursor-pointer border select-none shrink-0
                        ${
                          isSelected
                            ? 'border-[#818CF8] bg-[#818CF8]/20 text-[#818CF8] shadow-[0_0_16px_rgba(129,140,248,0.4)] ring-1 ring-[#818CF8]/70 scale-[1.02]'
                            : isPassed
                            ? 'border-[#10B981]/50 bg-[#10B981]/15 text-[#34D399] shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:border-[#10B981]/70 hover:bg-[#10B981]/25'
                            : 'border-white/[0.1] bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.22] hover:bg-white/[0.08]'
                        }
                      `}
                      title={`${subj.name} (${activeSubjChapters.length} active chapters)${isPassed ? ' • PASSED & FROZEN' : ''}`}
                    >
                      <span>{subj.name}</span>
                      {isPassed ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#34D399] bg-[#10B981]/25 px-1.5 py-0.5 rounded border border-[#10B981]/40 flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-[#34D399]" />
                          PASS
                        </span>
                      ) : isAllCompleted ? (
                        <CheckCircle2 className={`h-3 w-3 shrink-0 ${isSelected ? 'text-[#818CF8]' : 'text-[#10B981]'}`} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

SubjectResultsSection.displayName = 'SubjectResultsSection';
