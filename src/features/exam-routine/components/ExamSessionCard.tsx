/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flag, Plus, Edit3, Trash2 } from 'lucide-react';
import { ExamSession, ExamSubject } from '../types';
import { ExamSubjectCard } from './ExamSubjectCard';
import { formatExamDateRange, sortExamSubjects } from '../utils/examTimeUtils';
import { useExamRoutine } from '../context/ExamRoutineContext';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';

interface ExamSessionCardProps {
  session: ExamSession;
  onEditSession: (session: ExamSession) => void;
  onAddSubject: (session: ExamSession) => void;
  onEditSubject: (session: ExamSession, subject: ExamSubject) => void;
}

const ExamSessionCardComponent: React.FC<ExamSessionCardProps> = ({
  session,
  onEditSession,
  onAddSubject,
  onEditSubject,
}) => {
  const { deleteSession, nearestUpcomingExamId } = useExamRoutine();
  const { confirmDelete } = useDeleteConfirmation();

  const sortedSubjects = React.useMemo(() => {
    return sortExamSubjects(session.subjects || []);
  }, [session.subjects]);

  const upcomingCount = sortedSubjects.filter((s) => !s.isCompleted).length;
  const completedCount = sortedSubjects.filter((s) => s.isCompleted).length;
  const totalCount = sortedSubjects.length;

  const dateRangeStr = formatExamDateRange(session.startDate, session.endDate);

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-transparent overflow-hidden font-mono select-none">
      {/* ── TOP BAR OF SESSION (HEADER UNCHANGED WITH BACKGROUND) ── */}
      <div className="bg-[#0E1320]/75 backdrop-blur-xl p-5 sm:p-6 border-b border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Icon, Title, Date Range & Sub-badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] shadow-[0_0_14px_rgba(139,92,246,0.25)] shrink-0 mt-0.5 sm:mt-0">
              <Flag className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight">
                  {session.title}
                </h3>
                {dateRangeStr && (
                  <span className="text-xs text-[#94A3B8] font-bold">
                    ({dateRangeStr})
                  </span>
                )}
              </div>

              {/* Sub-Badges row */}
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="px-2.5 py-0.5 rounded-full font-black uppercase bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#FDA4AF]">
                  {upcomingCount} UPCOMING
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-black uppercase bg-[#10B981]/15 border border-[#10B981]/40 text-[#34D399]">
                  {completedCount} COMPLETED
                </span>
                <span className="text-[#94A3B8] font-bold">
                  ({totalCount} Total Exam{totalCount === 1 ? '' : 's'})
                </span>
              </div>
            </div>
          </div>

          {/* Right: Edit, Delete, + ADD SUBJECT (MATCHING SCREENSHOT) ── */}
          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={() => onEditSession(session)}
              className="p-2 rounded-xl bg-[#131722] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Edit Session"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                confirmDelete({
                  title: 'Delete Exam Session',
                  itemType: 'Exam Session',
                  itemName: session.title,
                  message: `Are you sure you want to delete session "${session.title}"? All ${totalCount} exam subject${totalCount === 1 ? '' : 's'} scheduled under this session will also be permanently deleted. This action cannot be undone.`,
                  confirmLabel: 'DELETE SESSION',
                  onConfirm: () => deleteSession(session.id),
                });
              }}
              className="p-2 rounded-xl bg-[#F43F5E]/15 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/30 transition-colors cursor-pointer"
              title="Delete Session"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* + ADD SUBJECT button */}
            <button
              type="button"
              onClick={() => onAddSubject(session)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-black tracking-wider transition-colors duration-150 cursor-pointer shadow-[0_0_14px_rgba(244,63,94,0.3)] border border-[#FB7185] md:hover:scale-[1.02] md:transition-transform active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>ADD SUBJECT</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY / CONTENT AREA (TRANSPARENT) ── */}
      <div className="p-5 sm:p-6 bg-transparent">
        {sortedSubjects.length === 0 ? (
          <div className="py-8 rounded-2xl border border-dashed border-white/[0.08] bg-transparent text-center space-y-2">
            <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">
              NO EXAMS IN THIS SESSION
            </p>
            <p className="text-[11px] text-white/30">
              Click <span className="text-[#F43F5E] font-bold">+ ADD SUBJECT</span> to schedule exam dates and venues for this session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-transparent">
            {sortedSubjects.map((sub) => (
              <ExamSubjectCard
                key={sub.id}
                subject={sub}
                sessionId={session.id}
                onEdit={(subject) => onEditSubject(session, subject)}
                isNearestUpcoming={nearestUpcomingExamId === sub.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ExamSessionCard = React.memo(ExamSessionCardComponent);
ExamSessionCard.displayName = 'ExamSessionCard';
