/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardList, Layers, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../outcome/context/OutcomeContext';
import { getProgramColor } from './ProgramCompletionSection';
import { getTrackColor } from './TrackCompletionSection';
import { AppRoute } from '../../../types/navigation';

export const SUBJECT_PALETTE = [
  '#38BDF8', // Sky / Cyan
  '#10B981', // Emerald / Green
  '#8B5CF6', // Purple / Violet
  '#F43F5E', // Rose / Red
  '#F59E0B', // Amber / Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export type CompletionModalTarget =
  | { type: 'program'; id: string }
  | { type: 'track'; id: string };

export interface CompletionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: CompletionModalTarget | null;
  onNavigate?: (route: AppRoute) => void;
}

interface SubjectCompletionItem {
  id: string;
  name: string;
  completedChapters: number;
  totalChapters: number;
  percentage: number;
  color: string;
  isPassed: boolean;
}

interface ProgramCompletionItem {
  id: string;
  name: string;
  completedChapters: number;
  totalChapters: number;
  percentage: number;
  color: string;
  isPassed: boolean;
  subjectCount: number;
}

/**
 * Redesigned Spatial Completion Status Modal for Dashboard.
 * Features:
 * - Fluid spatial spring pop-up entrance and exit animations
 * - Staggered cascade for items and dynamic gliding progress bars
 * - Luminous ambient glow reflecting active program / track color
 * - Polished glassmorphic card surfaces and clear monospace typography hierarchy
 * - 100% dynamic data from AcademicHierarchyContext and OutcomeContext (zero hardcoded values)
 */
export const CompletionStatusModal: React.FC<CompletionStatusModalProps> = React.memo(({
  isOpen,
  onClose,
  target,
}) => {
  const { tracks, programs, subjects, chapters } = useAcademicHierarchy();
  const { freezeConfig } = useOutcome();

  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [drilledProgramId, setDrilledProgramId] = useState<string | null>(null);
  const [animateBars, setAnimateBars] = useState<boolean>(false);

  // Trigger progress bar fill glide shortly after mount
  useEffect(() => {
    if (isOpen) {
      setAnimateBars(false);
      const timer = setTimeout(() => {
        setAnimateBars(true);
      }, 70);
      return () => clearTimeout(timer);
    } else {
      setAnimateBars(false);
      setDrilledProgramId(null);
      setIsClosing(false);
    }
  }, [isOpen, target, drilledProgramId]);

  // Smooth exit animation handler (PC only; lightweight on mobile)
  const initiateClose = useCallback(() => {
    if (isClosing) return;
    const isPc = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
    if (!isPc) {
      onClose();
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  // ESC key listener to close modal or drill up
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drilledProgramId) {
          setDrilledProgramId(null);
        } else {
          initiateClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, drilledProgramId, initiateClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Current active track / program resolution
  const activeProgramId = useMemo(() => {
    if (drilledProgramId) return drilledProgramId;
    if (target?.type === 'program') return target.id;
    return null;
  }, [target, drilledProgramId]);

  const activeTrack = useMemo(() => {
    if (target?.type === 'track') {
      return tracks.find((t) => t.id === target.id) || null;
    }
    return null;
  }, [target, tracks]);

  const activeProgram = useMemo(() => {
    if (!activeProgramId) return null;
    return programs.find((p) => p.id === activeProgramId) || null;
  }, [activeProgramId, programs]);

  // Compute subject completions for active program
  const subjectItems: SubjectCompletionItem[] = useMemo(() => {
    if (!activeProgramId) return [];

    const progSubjects = subjects
      .filter((s) => s.programId === activeProgramId)
      .sort((a, b) => a.order - b.order);

    return progSubjects.map((subj, idx) => {
      const subjChapters = chapters.filter(
        (c) => c.subjectId === subj.id && !c.isSkipped && c.status !== 'skipped'
      );
      const totalChapters = subjChapters.length;
      const completedChapters = subjChapters.filter(
        (c) => c.completed || c.status === 'completed'
      ).length;

      const isSubjectPassed = Boolean(
        freezeConfig?.frozenSubjectIds?.includes(subj.id) ||
        freezeConfig?.manualFrozenSubjectIds?.includes(subj.id) ||
        freezeConfig?.frozenProgramIds?.includes(activeProgramId) ||
        freezeConfig?.manualFrozenProgramIds?.includes(activeProgramId)
      );

      const percentage = isSubjectPassed
        ? 100
        : totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

      const color = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];

      return {
        id: subj.id,
        name: subj.name,
        completedChapters,
        totalChapters,
        percentage,
        color,
        isPassed: isSubjectPassed,
      };
    });
  }, [activeProgramId, subjects, chapters, freezeConfig]);

  // Compute program completions for active track
  const programItems: ProgramCompletionItem[] = useMemo(() => {
    if (!activeTrack) return [];

    const trackPrograms = programs
      .filter((p) => p.trackId === activeTrack.id)
      .sort((a, b) => a.order - b.order);

    return trackPrograms.map((prog, idx) => {
      const progSubjects = subjects.filter((s) => s.programId === prog.id);
      const progSubjectIds = new Set(progSubjects.map((s) => s.id));

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
        isPassed: isProgramPassed,
        subjectCount: progSubjects.length,
      };
    });
  }, [activeTrack, programs, subjects, chapters, freezeConfig]);

  if (!isOpen || !target) return null;
  if (typeof document === 'undefined') return null;

  // Header display details
  const isDisplayingSubjects = Boolean(activeProgramId);
  const titleName = isDisplayingSubjects
    ? activeProgram?.name || 'Program'
    : activeTrack?.name || 'Track';
  const headerSubtitle = isDisplayingSubjects
    ? `SUBJECT COMPLETIONS INSIDE THE ${titleName.toUpperCase()} PROGRAM`
    : `PROGRAM COMPLETIONS INSIDE THE ${titleName.toUpperCase()} TRACK`;
  const activeColor = isDisplayingSubjects
    ? getProgramColor(titleName, 0)
    : getTrackColor(titleName, 0);

  // Overall calculations for summary header pill
  const overallCompleted = isDisplayingSubjects
    ? subjectItems.reduce((acc, s) => acc + s.completedChapters, 0)
    : programItems.reduce((acc, p) => acc + p.completedChapters, 0);
  const overallTotal = isDisplayingSubjects
    ? subjectItems.reduce((acc, s) => acc + s.totalChapters, 0)
    : programItems.reduce((acc, p) => acc + p.totalChapters, 0);
  const overallPercentage =
    overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-black/80 backdrop-blur-md sm:backdrop-blur-lg transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-200'
      }`}
      onClick={initiateClose}
    >
      <div
        className={`relative w-full max-w-[620px] max-h-[90vh] flex flex-col rounded-[28px] sm:rounded-[32px] border border-white/[0.12] bg-[#080C16]/95 text-[#F8FAFC] font-mono shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden transition-all duration-200 ${
          isClosing ? 'animate-spatial-modal-out' : 'animate-spatial-modal-in'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-modal-title"
      >
        {/* ── AMBIENT LUMINOUS GLOW ACCENT ── */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full blur-3xl opacity-25 transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />

        {/* ── MODAL HEADER ── */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-7 py-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Header Icon Tile with glow drop shadow */}
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all duration-300 shadow-[0_0_24px_rgba(0,0,0,0.5)]"
              style={{
                borderColor: `${activeColor}45`,
                backgroundColor: `${activeColor}15`,
                color: activeColor,
                boxShadow: `0 0 20px ${activeColor}30`,
              }}
            >
              {isDisplayingSubjects ? (
                <ClipboardList className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              ) : (
                <Layers className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Back navigation button if drilled down into program from track view */}
              {drilledProgramId && activeTrack && (
                <button
                  type="button"
                  onClick={() => setDrilledProgramId(null)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer mb-1 group"
                >
                  <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                  <span>BACK TO {activeTrack.name.toUpperCase()}</span>
                </button>
              )}
              <h3
                id="completion-modal-title"
                className="font-mono text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC] truncate"
              >
                {titleName} Completion Status
              </h3>
              <p className="font-mono text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] truncate mt-0.5">
                {headerSubtitle}
              </p>
            </div>
          </div>

          {/* Right Header Action Area: Summary Pill + Close Button */}
          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {/* Summary Tag */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold whitespace-nowrap shadow-sm"
              style={{
                borderColor: `${activeColor}35`,
                backgroundColor: `${activeColor}10`,
                color: activeColor,
              }}
            >
              <span>{overallCompleted}/{overallTotal} Ch</span>
              <span className="opacity-40">•</span>
              <span>{overallPercentage}%</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={initiateClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/[0.22] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:rotate-90 active:scale-90 transition-all duration-200 cursor-pointer"
              aria-label="Close Completion Status"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY: COMPLETIONS LIST ── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-7 pt-5 pb-6 space-y-3 sm:space-y-3.5 max-h-[min(65vh,540px)] scrollbar-thin pr-3.5 sm:pr-5">
          {isDisplayingSubjects ? (
            /* ── SUBJECT COMPLETIONS LIST ── */
            subjectItems.length === 0 ? (
              <div className="w-full py-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0B0F19]/30 text-[#64748B] text-xs font-mono">
                NO SUBJECTS DETECTED FOR THIS PROGRAM
              </div>
            ) : (
              subjectItems.map((subj, idx) => (
                <div
                  key={subj.id}
                  className="animate-spatial-item rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F1629]/90 to-[#0A0F1D]/80 hover:from-[#131C35] hover:to-[#0E1528] hover:border-white/[0.18] p-4 sm:p-4.5 space-y-3 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] group relative overflow-hidden"
                  style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
                >
                  {/* Subtle vertical indicator bar on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-opacity opacity-80 group-hover:opacity-100"
                    style={{
                      backgroundColor: subj.color,
                      boxShadow: `0 0 8px ${subj.color}`,
                    }}
                  />

                  {/* Top Line: Subject Name & Stats */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-[13.5px] font-mono pl-1">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: subj.color,
                          boxShadow: `0 0 6px ${subj.color}90`,
                        }}
                      />
                      <span
                        className="font-bold text-[#F1F5F9] group-hover:text-white transition-colors truncate"
                        title={subj.name}
                      >
                        {subj.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-bold whitespace-nowrap">
                      <span className="text-xs sm:text-[12.5px] text-[#94A3B8]">
                        <span className="text-[#F1F5F9] font-bold">
                          {subj.completedChapters}
                        </span>{' '}
                        / {subj.totalChapters} Ch
                      </span>

                      {/* Percentage Badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full font-mono text-[11px] sm:text-xs font-bold border transition-all"
                        style={{
                          backgroundColor: `${subj.color}15`,
                          borderColor: `${subj.color}40`,
                          color: subj.color,
                          boxShadow:
                            subj.percentage > 0
                              ? `0 0 10px ${subj.color}30`
                              : undefined,
                        }}
                      >
                        {subj.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Bottom Line: Animated Glowing Progress Bar */}
                  <div className="h-2 sm:h-2.5 w-full rounded-full bg-[#060913] border border-white/[0.05] p-[1.5px] overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.7)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: animateBars
                          ? `${Math.min(100, Math.max(0, subj.percentage))}%`
                          : '0%',
                        background: `linear-gradient(90deg, ${subj.color}cc 0%, ${subj.color} 100%)`,
                        boxShadow:
                          subj.percentage > 0
                            ? `0 0 12px ${subj.color}90`
                            : undefined,
                      }}
                    />
                  </div>
                </div>
              ))
            )
          ) : (
            /* ── PROGRAM COMPLETIONS LIST (TRACK VIEW) ── */
            programItems.length === 0 ? (
              <div className="w-full py-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0B0F19]/30 text-[#64748B] text-xs font-mono">
                NO PROGRAMS DETECTED FOR THIS TRACK
              </div>
            ) : (
              programItems.map((prog, idx) => (
                <div
                  key={prog.id}
                  onClick={() => setDrilledProgramId(prog.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDrilledProgramId(prog.id);
                    }
                  }}
                  className="animate-spatial-item rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F1629]/90 to-[#0A0F1D]/80 hover:from-[#131C35] hover:to-[#0E1528] hover:border-white/[0.22] p-4 sm:p-4.5 space-y-3 transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] group relative overflow-hidden active:scale-[0.99]"
                  style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
                >
                  {/* Subtle vertical indicator bar on left */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-opacity opacity-80 group-hover:opacity-100"
                    style={{
                      backgroundColor: prog.color,
                      boxShadow: `0 0 8px ${prog.color}`,
                    }}
                  />

                  {/* Top Line: Program Name & Stats */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-[13.5px] font-mono pl-1">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: prog.color,
                          boxShadow: `0 0 6px ${prog.color}90`,
                        }}
                      />
                      <span className="font-bold text-[#F1F5F9] group-hover:text-white transition-colors truncate">
                        {prog.name}
                      </span>
                      <span className="text-[10px] text-[#64748B] hidden sm:inline-block">
                        ({prog.subjectCount}{' '}
                        {prog.subjectCount === 1 ? 'subject' : 'subjects'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-bold whitespace-nowrap">
                      <span className="text-xs sm:text-[12.5px] text-[#94A3B8]">
                        <span className="text-[#F1F5F9] font-bold">
                          {prog.completedChapters}
                        </span>{' '}
                        / {prog.totalChapters} Ch
                      </span>

                      {/* Percentage Badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full font-mono text-[11px] sm:text-xs font-bold border transition-all"
                        style={{
                          backgroundColor: `${prog.color}15`,
                          borderColor: `${prog.color}40`,
                          color: prog.color,
                          boxShadow:
                            prog.percentage > 0
                              ? `0 0 10px ${prog.color}30`
                              : undefined,
                        }}
                      >
                        {prog.percentage}%
                      </span>

                      <ChevronRight className="h-4 w-4 text-[#64748B] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Bottom Line: Animated Glowing Progress Bar */}
                  <div className="h-2 sm:h-2.5 w-full rounded-full bg-[#060913] border border-white/[0.05] p-[1.5px] overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.7)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: animateBars
                          ? `${Math.min(100, Math.max(0, prog.percentage))}%`
                          : '0%',
                        background: `linear-gradient(90deg, ${prog.color}cc 0%, ${prog.color} 100%)`,
                        boxShadow:
                          prog.percentage > 0
                            ? `0 0 12px ${prog.color}90`
                            : undefined,
                      }}
                    />
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* ── MODAL FOOTER BAR ── */}
        <div className="relative z-10 px-5 sm:px-7 py-3.5 border-t border-white/[0.08] bg-white/[0.015] flex items-center justify-between text-[10.5px] sm:text-[11px] font-mono text-[#64748B]">
          <span>
            {isDisplayingSubjects
              ? `${subjectItems.length} SUBJECTS IN PROGRAM`
              : `${programItems.length} PROGRAMS IN TRACK`}
          </span>
          <span className="hidden sm:inline-block tracking-wider opacity-70">
            [ESC] TO CLOSE
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
});

CompletionStatusModal.displayName = 'CompletionStatusModal';
