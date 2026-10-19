/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Track, Program, Subject, Chapter } from '../../../types/academic';
import { useOutcome } from '../../outcome/context/OutcomeContext';

interface SubjectProgressSectionProps {
  tracks: Track[];
  programs: Program[];
  subjects: Subject[];
  chapters: Chapter[];
  selectedTrackFilter?: string;
  selectedProgramFilter?: string;
}

export const SubjectProgressSection: React.FC<SubjectProgressSectionProps> = React.memo(({
  tracks,
  programs,
  subjects,
  chapters,
  selectedTrackFilter = 'all',
  selectedProgramFilter = 'all',
}) => {
  const { freezeConfig } = useOutcome();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter tracks to display
  const visibleTracks = selectedTrackFilter === 'all'
    ? tracks
    : tracks.filter(t => t.id === selectedTrackFilter);

  return (
    <div className="w-full rounded-3xl border border-white/[0.1] bg-[#131722]/40 backdrop-blur-md p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden">
      {/* ── SECTION HEADER ── */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold font-mono uppercase tracking-widest text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors">
            Subject Progress
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#94A3B8]">
            {subjects.length} Subjects
          </span>
        </div>

        <div
          className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all duration-200 ${
            isExpanded
              ? 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_14px_rgba(56,189,248,0.25)]'
              : 'border-white/[0.1] bg-[#0E121B]/60 text-[#94A3B8] group-hover:text-[#F8FAFC] group-hover:border-white/[0.22] group-hover:bg-white/[0.08]'
          }`}
          aria-label={isExpanded ? 'Collapse Subject Progress' : 'Expand Subject Progress'}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              isExpanded ? 'rotate-180 text-[#38BDF8]' : 'rotate-0 text-[#94A3B8] group-hover:text-[#F8FAFC]'
            }`}
          />
        </div>
      </div>

      {/* ── EXPANDABLE PROGRESS BODY (SMOOTH CSS GRID EXPAND / COLLAPSE) ── */}
      <div
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          {isExpanded && (
            <div className="space-y-8 pt-6 border-t border-white/[0.06] mt-4">
            {visibleTracks.map((track) => {
              // Track chapters & stats (excluding skipped chapters)
              const trackChapters = chapters.filter(c => c.trackId === track.id && !c.isSkipped && c.status !== 'skipped');
              const trackCompleted = trackChapters.filter(c => c.completed || c.status === 'completed').length;
              const trackTotal = trackChapters.length;
              const trackPercent = trackTotal > 0 ? Math.round((trackCompleted / trackTotal) * 100) : 0;

              // Programs belonging to this track
              const trackPrograms = programs.filter(p => {
                if (p.trackId !== track.id) return false;
                if (selectedProgramFilter !== 'all' && p.id !== selectedProgramFilter) return false;
                return true;
              });

              if (trackPrograms.length === 0) return null;

              return (
                <div key={track.id} className="space-y-6 pb-6 border-b border-white/[0.06] last:border-b-0 last:pb-0">
                  {/* ── TRACK PROGRESS BAR (Matches Reference Layout) ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-[#F8FAFC] tracking-wider">
                        {track.name.toUpperCase()} <span className="text-[#94A3B8] font-normal">(TRACK PROGRESS)</span>
                      </span>
                      <span className="text-[#818CF8] tracking-wide">
                        {trackCompleted}/{trackTotal} Ch ({trackPercent}%)
                      </span>
                    </div>

                    {/* Full width Track Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        style={{ width: `${Math.min(100, Math.max(0, trackPercent))}%` }}
                      />
                    </div>
                  </div>

                  {/* ── PROGRAMS IN THIS TRACK ── */}
                  <div className="space-y-6 pl-1 sm:pl-2">
                    {trackPrograms.map((prog) => {
                      const progSubjects = subjects.filter(s => s.programId === prog.id);
                      if (progSubjects.length === 0) return null;

                      return (
                        <div key={prog.id} className="space-y-3">
                          {/* Program Label */}
                          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
                            {prog.name.toUpperCase()} PROGRAM
                          </div>

                          {/* 3-Column Responsive Subjects Grid (1 col on mobile, 2 on tablet, 3 on desktop) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            {progSubjects.map((subj) => {
                              const isPassed = Boolean(freezeConfig?.frozenSubjectIds?.includes(subj.id));
                              const subjChapters = chapters.filter(c => c.subjectId === subj.id && !c.isSkipped && c.status !== 'skipped');
                              const subjCompleted = subjChapters.filter(c => c.completed || c.status === 'completed').length;
                              const subjTotal = subjChapters.length;
                              const subjPercent = subjTotal > 0 ? Math.round((subjCompleted / subjTotal) * 100) : 0;

                              return (
                                <div
                                  key={subj.id}
                                  className="p-2 rounded-xl border border-transparent bg-transparent"
                                >
                                  {/* Top Line: Subject Name (left) & Stats (right) */}
                                  <div className="flex items-center justify-between gap-2 text-xs font-mono mb-1.5">
                                    <span className="font-semibold truncate text-[#E2E8F0]">
                                      {subj.name}
                                    </span>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isPassed && (
                                        <span className="text-[9px] font-black uppercase text-[#34D399] bg-[#10B981]/20 px-1.5 py-0.2 rounded border border-[#10B981]/40">
                                          PASS
                                        </span>
                                      )}
                                      <span className="text-[11px] font-mono text-[#94A3B8]">
                                        {subjCompleted}/{subjTotal} ({subjPercent}%)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Bottom Line: Subject Progress Bar */}
                                  <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isPassed || subjPercent === 100
                                          ? 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                                          : 'bg-gradient-to-r from-[#6366F1] to-[#38BDF8]'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, subjPercent))}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
});

SubjectProgressSection.displayName = 'SubjectProgressSection';
