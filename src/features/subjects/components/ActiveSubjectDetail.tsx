/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  Clock, 
  TrendingUp, 
  Calendar, 
  Check, 
  AlertCircle,
  Sliders,
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { 
  Track, 
  Program, 
  Subject, 
  Chapter, 
  AcademicTask, 
  ChapterStatus, 
  PriorityLevel 
} from '../../../types/academic';
import { getChapterTopicDisplay } from '../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../outcome/context/OutcomeContext';
import { usePace } from '../../pace/context/PaceContext';
import { PaceGoal } from '../../pace/types';
import { PaceTrendChartModal } from '../../pace/components/modals/PaceTrendChartModal';
import { ChapterEditModal } from './ChapterEditModal';
import { SubjectEditModal } from './SubjectEditModal';
import { SubjectDayRangeModal } from './SubjectDayRangeModal';

interface ActiveSubjectDetailProps {
  subject: Subject;
  track?: Track;
  program?: Program;
  chapters: Chapter[];
  tasks?: AcademicTask[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  defaultExpanded?: boolean;
  onToggleChapterCompletion: (chapterId: string) => void;
  onSetChapterStatus: (chapterId: string, status: ChapterStatus) => void;
  onCreateTask?: (
    subjectId: string, 
    title: string, 
    options?: { chapterId?: string; priority?: PriorityLevel; dueDate?: string }
  ) => void;
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onNavigateToMasterConfig?: () => void;
}

export const ActiveSubjectDetail: React.FC<ActiveSubjectDetailProps> = React.memo(({
  subject,
  track,
  program,
  chapters,
  tasks,
  isExpanded: isExpandedProp,
  onToggleExpand,
  defaultExpanded = false,
  onToggleChapterCompletion,
  onSetChapterStatus,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onNavigateToMasterConfig,
}) => {
  // Expand / collapse state (supports both controlled and uncontrolled)
  const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
  const isControlled = isExpandedProp !== undefined;
  const isExpanded = isControlled ? isExpandedProp : internalExpanded;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    }
    if (!isControlled) {
      setInternalExpanded(prev => !prev);
    }
  };

  // Pace Context integration for this subject (isolated to this subject card only)
  const { 
    globalBaseline, 
    calculateStatsForGoal, 
    getSubjectGoal, 
    setSubjectTimeRange, 
    clearSubjectTimeRange 
  } = usePace();

  const { freezeConfig } = useOutcome();

  const isSubjectPassed = Boolean(freezeConfig?.frozenSubjectIds?.includes(subject.id));
  
  const [isTrendOpen, setIsTrendOpen] = useState(false);
  const [isSubjectEditOpen, setIsSubjectEditOpen] = useState(false);
  const [isDayRangeOpen, setIsDayRangeOpen] = useState(false);

  // Dedicated subject goal (isolated for this subject card only - does NOT appear on Pace Management active timelines)
  const subjectGoal = useMemo(() => {
    return getSubjectGoal(subject.id, subject.name);
  }, [getSubjectGoal, subject.id, subject.name]);

  // Fallback virtual goal for trend modal if no time range set yet
  const resolvedGoal = useMemo<PaceGoal>(() => {
    if (subjectGoal) return subjectGoal;
    return {
      id: `subject_pace_${subject.id}`,
      type: 'subjects',
      target: subject.name,
      startDate: globalBaseline.startDate || '',
      deadline: globalBaseline.endDate || '',
      subjects: [subject.id],
      notes: `Target timeline for ${subject.name}`,
      createdAt: new Date().toISOString(),
    };
  }, [subjectGoal, subject.id, subject.name, globalBaseline]);

  // Calculate pace statistics for this subject
  const subjectPaceStats = useMemo(() => {
    if (!subjectGoal) return null;
    return calculateStatsForGoal(subjectGoal);
  }, [subjectGoal, calculateStatsForGoal]);

  const handleSaveDayRange = (startDate: string, deadline: string) => {
    setSubjectTimeRange(subject.id, startDate, deadline);
  };

  const handleClearDayRange = () => {
    clearSubjectTimeRange(subject.id);
  };

  // Chapter Edit Modal state
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = (chap: Chapter) => {
    setEditingChapter(chap);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingChapter(null);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(c => !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')).length;
    const skippedChapters = chapters.filter(c => c.isSkipped || c.status === 'skipped').length;
    const activeTotalChapters = Math.max(0, totalChapters - skippedChapters);
    const pendingChapters = Math.max(0, activeTotalChapters - completedChapters);
    const completionPercent = activeTotalChapters > 0 ? Math.round((completedChapters / activeTotalChapters) * 100) : 0;
    return { totalChapters, completedChapters, skippedChapters, activeTotalChapters, pendingChapters, completionPercent };
  }, [chapters]);

  const { totalChapters, completedChapters, skippedChapters, activeTotalChapters, pendingChapters, completionPercent } = stats;

  const getStatusColor = (status?: ChapterStatus, completed?: boolean, isSkipped?: boolean) => {
    if (isSkipped || status === 'skipped') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (completed || status === 'completed') return 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30';
    if (status === 'in_progress') return 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30';
    return 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]';
  };

  const getStatusLabel = (status?: ChapterStatus, completed?: boolean, isSkipped?: boolean) => {
    if (isSkipped || status === 'skipped') return 'Skipped';
    if (completed || status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In Progress';
    return 'Pending';
  };

  const cycleStatus = (chapter: Chapter) => {
    if (chapter.isSkipped || chapter.status === 'skipped') return;
    const current = chapter.status || (chapter.completed ? 'completed' : 'pending');
    const order: ChapterStatus[] = ['pending', 'in_progress', 'completed'];
    const currentIndex = order.indexOf(current as ChapterStatus);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length;
    onSetChapterStatus(chapter.id, order[nextIndex]);
  };

  return (
    <div className={`w-full rounded-3xl backdrop-blur-md transition-all duration-300 overflow-hidden ${
      isSubjectPassed
        ? 'border border-[#10B981]/35 bg-[#061E17]/60 shadow-[0_12px_40px_rgba(16,185,129,0.15)] ring-1 ring-[#10B981]/25'
        : 'border border-white/[0.12] bg-[#131722]/40 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
    }`}>
      {/* ── 1. ACTIVE SUBJECT HEADER: BREADCRUMB + NAME + PRIORITY + EXPAND/COLLAPSE TOGGLE ── */}
      <div 
        onClick={isSubjectPassed ? undefined : handleToggleExpand}
        role={isSubjectPassed ? undefined : "button"}
        tabIndex={isSubjectPassed ? -1 : 0}
        aria-expanded={isSubjectPassed ? undefined : isExpanded}
        onKeyDown={(e) => {
          if (isSubjectPassed) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        className={`p-5 sm:p-7 select-none transition-colors duration-150 ${
          isSubjectPassed
            ? 'cursor-default'
            : 'cursor-pointer group hover:bg-white/[0.02]'
        }`}
        title={isSubjectPassed ? undefined : (isExpanded ? 'Click to collapse chapters' : 'Click to expand chapters')}
      >
        <div className="space-y-4">
          {/* Conceptual Breadcrumb: Track → Program → Subject */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] sm:text-xs">
            <span className="text-[#94A3B8] uppercase">Track:</span>
            <span className="text-[#6366F1] font-semibold">
              {track ? track.name : 'Unknown Track'}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[#94A3B8] uppercase">Program:</span>
            <span className="text-[#38BDF8] font-semibold">
              {program ? program.name : 'Unknown Program'}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[#94A3B8] uppercase">Subject:</span>
            <span className="text-[#F8FAFC] font-semibold">
              {subject.name}
            </span>
          </div>

          {/* Subject Name and Priority Badge + Expand / Collapse Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                {subject.name}
              </h2>

              {!isSubjectPassed && subject.priority && subject.priority !== 'none' && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider shrink-0 border ${
                  subject.priority === 'high' ? 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40' :
                  subject.priority === 'medium' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40' :
                  'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                }`}>
                  {subject.priority} Priority
                </span>
              )}

              {isSubjectPassed && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider shrink-0 border border-[#10B981]/50 bg-[#10B981]/20 text-[#34D399] shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34D399]" />
                  PASSED • FROZEN
                </span>
              )}
            </div>

            {/* Right side: When Passed & Frozen -> ONLY Analytics Button Active; Otherwise -> EST. FINISH + Action Buttons */}
            {isSubjectPassed ? (
              <div className="flex items-center shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTrendOpen(true);
                  }}
                  className="h-8 w-8 rounded-xl border border-[#10B981]/50 bg-[#10B981]/15 text-[#34D399] hover:bg-[#10B981]/25 hover:border-[#10B981]/70 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] group/btn"
                  title="Pace Trajectory & Trend Chart"
                  aria-label="View Trend Chart"
                >
                  <TrendingUp className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 shrink-0 self-start sm:self-center">
                {/* EST. FINISH summary */}
                <div className="text-right">
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    EST. FINISH
                  </span>
                  <span className="block font-mono text-xs font-bold text-[#F8FAFC] mt-0.5">
                    {subjectPaceStats?.projectedFinishStr || 'No Data'}
                  </span>
                </div>

                {/* Action Buttons Toolstrip */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* 1. Trend Line Chart */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTrendOpen(true);
                    }}
                    className="h-8 w-8 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#94A3B8] hover:text-[#818CF8] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/15 transition-all flex items-center justify-center cursor-pointer shadow-sm group/btn"
                    title="Pace Trajectory & Trend Chart"
                    aria-label="View Trend Chart"
                  >
                    <TrendingUp className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  </button>

                  {/* 2. Edit Subject (Name, Track, Program) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSubjectEditOpen(true);
                    }}
                    className="h-8 w-8 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#94A3B8] hover:text-[#818CF8] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/15 transition-all flex items-center justify-center cursor-pointer shadow-sm group/btn"
                    title="Edit Subject (Name, Track, Program)"
                    aria-label="Edit Subject"
                  >
                    <Edit3 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  </button>

                  {/* 3. Expand / Collapse Indicator Icon */}
                  <div 
                    className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all duration-200 ${
                      isExpanded
                        ? 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_14px_rgba(56,189,248,0.25)]'
                        : 'border-white/[0.1] bg-white/[0.04] text-[#94A3B8] group-hover:text-[#F8FAFC] group-hover:border-white/[0.22] group-hover:bg-white/[0.08]'
                    }`}
                    aria-label={isExpanded ? 'Collapse subject dropdown' : 'Expand subject dropdown'}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180 text-[#38BDF8]' : 'rotate-0 text-[#94A3B8] group-hover:text-[#F8FAFC]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Summary and Full Bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#94A3B8]">
                Progress: <strong className="text-[#F8FAFC]">{isSubjectPassed ? activeTotalChapters : completedChapters} / {activeTotalChapters}</strong> Chapters Complete
                {skippedChapters > 0 && (
                  <span className="text-amber-400/90 ml-2">({skippedChapters} Skipped)</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {isSubjectPassed && (
                  <span className="text-[10px] font-black uppercase text-[#34D399] bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                    PASSED
                  </span>
                )}
                <span className={`text-sm font-bold font-mono ${isSubjectPassed || completionPercent === 100 ? 'text-[#34D399]' : 'text-[#818CF8]'}`}>
                  {isSubjectPassed ? 100 : completionPercent}%
                </span>
              </div>
            </div>

            <div className={`h-2 w-full rounded-full overflow-hidden ${
              isSubjectPassed 
                ? 'bg-[#042017] border border-[#10B981]/30' 
                : 'bg-white/[0.06] border border-white/[0.08]'
            }`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isSubjectPassed || completionPercent === 100
                    ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                    : 'bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#38BDF8] shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                }`}
                style={{ width: `${isSubjectPassed ? 100 : Math.min(100, Math.max(0, completionPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. EXPANDABLE DROPDOWN AREA (SMOOTH CSS GRID EXPAND / COLLAPSE) ── */}
      {!isSubjectPassed && (
        <div
          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
        <div className="overflow-hidden">
          {isExpanded && (
            <div className="px-5 sm:px-7 pb-6 sm:pb-8 pt-6 space-y-7 border-t border-white/[0.08]">

      {/* ── 2. SUBJECT KPI STRIP (4 METRIC TILES) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TIME GOAL */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-sm space-y-1 relative group/tile">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
              <Clock className="h-3 w-3 text-[#6366F1]" />
              <span>Time Goal</span>
            </div>
            {/* Edit Day Range Icon Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDayRangeOpen(true);
              }}
              className="h-6 w-6 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#94A3B8] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 hover:bg-[#38BDF8]/10 transition-all flex items-center justify-center cursor-pointer shadow-sm group/btn"
              title="Day Range Setting"
              aria-label="Open Day Range Setting"
            >
              <Edit3 className="h-3 w-3 transition-transform group-hover/btn:scale-110" />
            </button>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#F8FAFC]">
            {subjectPaceStats && subjectPaceStats.totalDays > 0 ? `${subjectPaceStats.totalDays} Days` : '--'}
          </div>
          <div className="text-[10px] font-mono text-[#64748B]">
            {subjectPaceStats?.countdownText || 'No Goal Set'}
          </div>
        </div>

        {/* REQ PACE */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            <TrendingUp className="h-3 w-3 text-[#38BDF8]" />
            <span>Req Pace</span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#F8FAFC]">
            {subjectPaceStats && subjectPaceStats.reqPace > 0 ? `${subjectPaceStats.reqPace.toFixed(2)} CH/D` : '-- CH/D'}
          </div>
          <div className="text-[10px] font-mono text-[#64748B]">
            {subjectPaceStats && subjectPaceStats.daysRemaining > 0 ? `${subjectPaceStats.daysRemaining} Days Left` : 'No Deadline'}
          </div>
        </div>

        {/* ACTUAL PACE */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            <TrendingUp className="h-3 w-3 text-[#10B981]" />
            <span>Actual Pace</span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#F8FAFC]">
            {subjectPaceStats ? `${subjectPaceStats.curPace.toFixed(2)} CH/D` : '0.00 CH/D'}
          </div>
          <div className="text-[10px] font-mono text-[#64748B]">
            {subjectPaceStats?.timeElapsedText || '0 Days Passed'}
          </div>
        </div>

        {/* EST. FINISH */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            <Calendar className="h-3 w-3 text-[#F59E0B]" />
            <span>Est. Finish</span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#F8FAFC]">
            {subjectPaceStats?.projectedFinishStr || 'No Data'}
          </div>
          <div className={`text-[10px] font-mono ${subjectPaceStats?.isBehind ? 'text-[#F97316]' : 'text-[#10B981]'}`}>
            {subjectPaceStats?.status === 'finished' ? 'Goal Complete' : subjectPaceStats?.isBehind ? 'Behind Schedule' : 'On Track'}
          </div>
        </div>
      </div>

      {/* ── 3. CHAPTER SECTION (CHAPTERS MATRIX) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#F8FAFC]">
              Chapters Matrix
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#94A3B8]">
              {activeTotalChapters} Chapters
            </span>
          </div>

          <div className="text-xs font-mono text-[#94A3B8]">
            <span className="text-[#10B981] font-semibold">{completedChapters}</span> Completed
            {skippedChapters > 0 && (
              <> • <span className="text-amber-400 font-semibold">{skippedChapters}</span> Skipped</>
            )}
            {" "}• {pendingChapters} Pending
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-white/[0.1] bg-[#0E121B]/30 text-center space-y-3">
            <AlertCircle className="h-7 w-7 text-[#64748B] mx-auto opacity-70" />
            <div className="text-xs font-mono text-[#94A3B8]">
              No chapters configured for this subject yet.
            </div>
            {onNavigateToMasterConfig && (
              <button
                onClick={onNavigateToMasterConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.15] bg-[#131722] text-xs font-mono text-[#F8FAFC] hover:border-[#6366F1] transition-all cursor-pointer"
              >
                <Sliders className="h-3 w-3 text-[#6366F1]" />
                <span>Add Chapters in Master Config</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {chapters.map((chap) => {
              const isCompleted = chap.completed || chap.status === 'completed';
              const isSkipped = Boolean(chap.isSkipped || chap.status === 'skipped');
              const status = chap.status || (chap.completed ? 'completed' : 'pending');

              return (
                <div
                  key={chap.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isSkipped
                      ? 'border-amber-500/25 bg-[#0E121B]/60 shadow-[0_4px_16px_rgba(245,158,11,0.06)] opacity-90'
                      : isCompleted
                      ? 'border-[#10B981]/25 bg-[#0E121B]/80 shadow-[0_4px_16px_rgba(16,185,129,0.08)]'
                      : 'border-white/[0.08] bg-[#0E121B]/60 hover:border-white/[0.18]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: Chapter Badge + Priority + Status Cycle */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
                        CH {chap.chapterNumber}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {chap.priority && chap.priority !== 'none' && (
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                            chap.priority === 'high' ? 'text-[#F43F5E]' :
                            chap.priority === 'medium' ? 'text-[#F59E0B]' :
                            'text-[#10B981]'
                          }`}>
                            {chap.priority}
                          </span>
                        )}

                        {/* Status badge - clickable to cycle status (disabled if skipped) */}
                        <button
                          disabled={isSkipped}
                          onClick={() => cycleStatus(chap)}
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border transition-all ${
                            isSkipped 
                              ? 'cursor-not-allowed opacity-75' 
                              : 'cursor-pointer hover:scale-105'
                          } ${getStatusColor(chap.status, chap.completed, isSkipped)}`}
                          title={isSkipped ? "Chapter is skipped" : "Click to cycle status: Pending → In Progress → Completed"}
                        >
                          {getStatusLabel(chap.status, chap.completed, isSkipped)}
                        </button>
                      </div>
                    </div>

                    {/* Chapter Title & Topic Name + Edit Button (Red Box Location) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`font-semibold text-sm truncate ${isSkipped ? 'line-through text-[#64748B]' : 'text-[#F8FAFC]'}`}>
                            Chapter {chap.chapterNumber}
                          </h4>
                          {isSkipped && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              (SKIPPED)
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-mono mt-0.5 truncate ${isSkipped ? 'line-through text-[#64748B]' : 'text-[#94A3B8]'}`}>
                          Topic: <span className={isSkipped ? 'text-[#64748B]' : 'text-[#38BDF8]'}>{getChapterTopicDisplay(chap)}</span>
                        </p>
                      </div>

                      {/* Edit Button (Icon Only) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(chap);
                        }}
                        className="h-8 w-8 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-[#6366F1]/15 hover:border-[#6366F1]/40 text-[#94A3B8] hover:text-[#818CF8] flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] shrink-0 group/edit"
                        title={`Edit Chapter ${chap.chapterNumber}`}
                        aria-label={`Edit Chapter ${chap.chapterNumber}`}
                      >
                        <Edit3 className="h-3.5 w-3.5 transition-transform group-hover/edit:scale-110" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Completion Toggle Footer */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      disabled={isSkipped}
                      onClick={() => onToggleChapterCompletion(chap.id)}
                      title={isSkipped ? "Cannot complete a skipped chapter" : isCompleted ? "Mark Pending" : "Mark Complete"}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-none md:transition-all md:duration-200 active:scale-95 md:hover:scale-[1.02] border ${
                        isSkipped
                          ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.05] text-[#64748B]'
                          : isCompleted
                          ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981] cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-white/[0.03] border-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.2] cursor-pointer'
                      }`}
                    >
                      <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${
                        isSkipped ? 'border-white/10' : isCompleted ? 'bg-[#10B981] border-[#10B981]' : 'border-white/30'
                      }`}>
                        {isCompleted && !isSkipped && <Check className="h-2.5 w-2.5 text-black stroke-[3]" />}
                      </div>
                      <span>{isSkipped ? 'Skipped' : isCompleted ? 'Completed' : 'Mark Complete'}</span>
                    </button>

                    <button
                      disabled={isSkipped}
                      onClick={() => cycleStatus(chap)}
                      title={isSkipped ? "Cannot cycle status of a skipped chapter" : "Cycle status"}
                      className={`text-[10px] font-mono ${isSkipped ? 'opacity-30 cursor-not-allowed text-[#64748B]' : 'text-[#94A3B8] hover:text-[#38BDF8] cursor-pointer'}`}
                    >
                      Cycle Status →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── PACE MODALS FOR THIS SUBJECT ── */}
      {isTrendOpen && (
        <PaceTrendChartModal
          goal={resolvedGoal}
          isOpen={isTrendOpen}
          onClose={() => setIsTrendOpen(false)}
        />
      )}

      {/* ── SUBJECT EDIT MODAL (NAME, TRACK, PROGRAM) ── */}
      {isSubjectEditOpen && (
        <SubjectEditModal
          isOpen={isSubjectEditOpen}
          onClose={() => setIsSubjectEditOpen(false)}
          subject={subject}
          currentTrack={track}
          currentProgram={program}
        />
      )}

      {/* ── DAY RANGE SETTING MODAL ── */}
      {isDayRangeOpen && (
        <SubjectDayRangeModal
          isOpen={isDayRangeOpen}
          onClose={() => setIsDayRangeOpen(false)}
          subject={subject}
          currentGoal={subjectGoal}
          globalBaseline={globalBaseline}
          activeChaptersCount={activeTotalChapters}
          remainingChaptersCount={pendingChapters}
          onSaveGoal={handleSaveDayRange}
          onClearGoal={subjectGoal ? handleClearDayRange : undefined}
        />
      )}

      {/* ── CHAPTER EDIT MODAL ── */}
      {isEditModalOpen && (
        <ChapterEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          chapter={editingChapter}
          currentSubject={subject}
          currentProgram={program}
          currentTrack={track}
        />
      )}
    </div>
  );
});

ActiveSubjectDetail.displayName = 'ActiveSubjectDetail';
