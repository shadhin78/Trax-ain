/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Calendar, Check, Edit3, Trash2, MapPin } from 'lucide-react';
import { ExamSubject } from '../types';
import { useExamRoutine } from '../context/ExamRoutineContext';
import { calculateExamTimeRemaining } from '../utils/examTimeUtils';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';

interface ExamSubjectCardProps {
  subject: ExamSubject;
  sessionId: string;
  onEdit: (subject: ExamSubject) => void;
  isNearestUpcoming?: boolean;
}

const ExamSubjectCardComponent: React.FC<ExamSubjectCardProps> = ({
  subject,
  sessionId,
  onEdit,
  isNearestUpcoming,
}) => {
  const { toggleExamCompleted, deleteExamSubject, pinnedSubjectId, nearestUpcomingExamId } = useExamRoutine();
  const { confirmDelete } = useDeleteConfirmation();

  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (subject.isCompleted) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (!interval && !document.hidden) {
        interval = setInterval(() => setTick((t) => (t + 1) % 1000000), 1000);
      }
    };
    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        setTick((t) => (t + 1) % 1000000);
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [subject.isCompleted]);

  const countdown = useMemo(() => {
    return calculateExamTimeRemaining(subject.examDate, subject.examTime);
  }, [subject.examDate, subject.examTime, tick]);

  const isNearest = (isNearestUpcoming !== undefined ? isNearestUpcoming : nearestUpcomingExamId === subject.id) && !subject.isCompleted;
  const isPinned = pinnedSubjectId === subject.id;

  return (
    <div
      className={`
        w-full rounded-2xl border p-4 sm:p-5 relative overflow-hidden group select-none font-mono
        ${
          subject.isCompleted
            ? 'border-white/[0.05] bg-[#0B0F19]/50 opacity-80 shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
            : isNearest
            ? 'border-[#F43F5E]/70 bg-[#0B0F19]/80 shadow-[0_0_20px_rgba(244,63,94,0.22),0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-[#F43F5E]/40 hover:border-[#F43F5E]/90 hover:shadow-[0_0_24px_rgba(244,63,94,0.3),0_4px_20px_rgba(0,0,0,0.35)]'
            : isPinned
            ? 'border-[#F59E0B]/50 bg-[#0B0F19]/80 shadow-[0_0_15px_rgba(245,158,11,0.15),0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-[#F59E0B]/30'
            : 'border-white/[0.08] bg-[#0B0F19]/80 hover:border-white/[0.18] shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
        }
        transition-none md:transition-[border-color,box-shadow,ring-color,transform] md:duration-300 md:motion-reduce:transition-none md:hover:-translate-y-0.5
      `}
    >
      {/* ── TOP TAG ROW: TIME COUNTDOWN & STATUS DOT ── */}
      <div className="flex items-center justify-between pb-2">
        {/* Countdown Pill matching screenshot with dynamic tiers & live status */}
        {subject.isCompleted ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399]">
            <Check className="h-3 w-3 stroke-[3]" />
            <span>COMPLETED</span>
          </span>
        ) : countdown.status === 'LIVE_IN_PROGRESS' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#FCA5A5] shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] md:animate-ping" />
            <span>LIVE NOW</span>
          </span>
        ) : countdown.status === 'ENDED' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#64748B]/20 border border-[#64748B]/40 text-[#94A3B8]">
            <span>ENDED</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#FDA4AF] shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
            <span>{countdown.compactString}</span>
          </span>
        )}

        {/* Right Status Dot / Pin badge */}
        <div className="flex items-center gap-1.5">
          {isPinned && (
            <span className="text-[9px] font-black text-[#F59E0B] uppercase bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-1.5 py-0.5 rounded">
              PINNED
            </span>
          )}
          <span
            className={`h-2 w-2 rounded-full ${
              subject.isCompleted ? 'bg-[#10B981]' : 'bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]'
            }`}
          />
        </div>
      </div>

      {/* ── SUBJECT NAME ── */}
      <div className="mt-1">
        <h4 className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
          {subject.subjectName}
        </h4>
      </div>

      {/* ── DATE & TIME & VENUE ── */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold text-[#94A3B8]">
          <Calendar className="h-3.5 w-3.5 text-[#FDA4AF] shrink-0" />
          <span>{countdown.formattedDateString}</span>
        </div>

        {subject.venue && (
          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <MapPin className="h-3 w-3 text-[#F59E0B] shrink-0" />
            <span className="truncate">{subject.venue}</span>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS ROW (MATCHING SCREENSHOT) ── */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        {/* Left: Mark Complete Toggle Button */}
        <button
          type="button"
          onClick={() => toggleExamCompleted(sessionId, subject.id)}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer border
            ${
              subject.isCompleted
                ? 'border-[#10B981]/70 bg-transparent text-[#34D399] shadow-[inset_0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-[#10B981]/40 md:hover:shadow-[inset_0_0_16px_rgba(16,185,129,0.7)]'
                : 'border-white/[0.12] bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.25] shadow-[inset_0_0_8px_rgba(255,255,255,0.03)] hover:shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]'
            }
            md:transition-all md:duration-200 md:hover:scale-[1.02] active:scale-95
          `}
        >
          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>{subject.isCompleted ? 'Completed' : 'Mark Complete'}</span>
        </button>

        {/* Right: Edit & Delete Icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(subject)}
            className="p-1.5 rounded-lg bg-[#131722] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
            title="Edit Subject"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              confirmDelete({
                title: 'Delete Exam Subject',
                itemType: 'Exam Subject',
                itemName: subject.subjectName,
                message: `Are you sure you want to delete exam subject "${subject.subjectName}"? This action cannot be undone.`,
                confirmLabel: 'DELETE SUBJECT',
                onConfirm: () => deleteExamSubject(sessionId, subject.id),
              });
            }}
            className="p-1.5 rounded-lg bg-[#F43F5E]/15 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/30 transition-colors cursor-pointer"
            title="Delete Subject"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExamSubjectCard = React.memo(ExamSubjectCardComponent);
ExamSubjectCard.displayName = 'ExamSubjectCard';
