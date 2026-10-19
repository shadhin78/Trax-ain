/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Check } from 'lucide-react';
import { ExamSession, ExamSubject } from '../../types';
import { useExamRoutine } from '../../context/ExamRoutineContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { getExamTimestamp } from '../../utils/examTimeUtils';

interface AddExamSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ExamSession | null;
  editingSubject?: ExamSubject | null;
}

export const AddExamSubjectModal: React.FC<AddExamSubjectModalProps> = ({
  isOpen,
  onClose,
  session,
  editingSubject = null,
}) => {
  const { addExamSubject, updateExamSubject } = useExamRoutine();
  const { programs, subjects } = useAcademicHierarchy();

  const [subjectName, setSubjectName] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [examTime, setExamTime] = useState<string>('12:00');
  const [isClosing, setIsClosing] = useState(false);

  // Program details fixed directly by the exam session
  const sessionProgramId = session?.programId || '';
  const sessionProgram = programs.find((p) => p.id === sessionProgramId);
  const programDisplayName = sessionProgram?.name || session?.programName || (sessionProgramId ? sessionProgramId : 'General Study');
  const isGeneralStudy = !sessionProgramId || programDisplayName.toLowerCase().includes('general');

  // Subjects belonging strictly to this session's program
  const programSubjects = useMemo(() => {
    if (!sessionProgramId) return [];
    return subjects.filter((s) => s.programId === sessionProgramId);
  }, [subjects, sessionProgramId]);

  useEffect(() => {
    if (editingSubject) {
      setSubjectName(editingSubject.subjectName);
      setExamDate(editingSubject.examDate);
      setExamTime(editingSubject.examTime || '12:00');
    } else {
      const defaultDate = session?.startDate || new Date().toISOString().split('T')[0];
      setExamDate(defaultDate);
      setExamTime('12:00');

      const avail = session?.programId ? subjects.filter((s) => s.programId === session.programId) : [];
      if (avail.length > 0) {
        setSubjectName(avail[0].name);
      } else {
        setSubjectName('');
      }
    }
  }, [editingSubject, session, subjects]);

  const initiateClose = useCallback(() => {
    if (isClosing) return;
    const isPC = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (isPC) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 200);
    } else {
      onClose();
    }
  }, [isClosing, onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || !session || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !examDate) return;

    const matchedProg = programs.find((p) => p.id === sessionProgramId);
    const progName = matchedProg?.name || session.programName || (sessionProgramId ? sessionProgramId : undefined);

    const matchedSubject = subjects.find(
      (s) => (sessionProgramId ? s.programId === sessionProgramId : true) && s.name.toLowerCase() === subjectName.trim().toLowerCase()
    );

    if (editingSubject) {
      const targetTs = getExamTimestamp(examDate, examTime);
      const isFuture = targetTs > Date.now();
      // If the exam was completed and its new scheduled date/time is in the future,
      // clear the completion state (isCompleted = false, completedAt = undefined).
      // If the scheduled date/time remains in the past, preserve existing completion state.
      const willBeCompleted = editingSubject.isCompleted ? !isFuture : false;

      await updateExamSubject(session.id, editingSubject.id, {
        subjectName: subjectName.trim(),
        subjectId: matchedSubject?.id || editingSubject.subjectId,
        programId: sessionProgramId || undefined,
        programName: progName,
        examDate,
        examTime,
        venue: editingSubject.venue || '',
        targetScore: editingSubject.targetScore || '',
        notes: editingSubject.notes || '',
        isCompleted: willBeCompleted,
        completedAt: willBeCompleted ? editingSubject.completedAt : undefined,
      });
    } else {
      await addExamSubject(session.id, {
        subjectName: subjectName.trim(),
        subjectId: matchedSubject?.id,
        programId: sessionProgramId || undefined,
        programName: progName,
        examDate,
        examTime,
        venue: '',
        targetScore: '',
        notes: '',
        isCompleted: false,
      });
    }

    initiateClose();
  };

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      role="dialog"
      aria-modal="true"
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-lg rounded-[28px] border border-white/[0.12] bg-[#0E1320] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative max-h-[90vh] overflow-hidden flex flex-col
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient PC-only subtle accent glow safely clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none" aria-hidden="true">
          <div 
            className="hidden md:block absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#F43F5E]/10 blur-3xl pointer-events-none" 
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F43F5E]/20 border border-[#F43F5E]/40 text-[#FDA4AF] shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider uppercase">
                {editingSubject ? 'Edit Exam Subject' : 'Add Exam Subject'}
              </h3>
              <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
                SESSION: {session.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="h-8 w-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          className="mt-5 space-y-4 relative z-10 overflow-y-auto overflow-x-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Target Program (Fixed directly by Exam Session) */}
          <div>
            <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              TARGET PROGRAM
            </label>
            <div className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722]/80 font-mono text-xs font-bold text-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${isGeneralStudy ? 'bg-[#94A3B8]' : 'bg-[#F43F5E]'}`} />
                <span>{programDisplayName}</span>
              </div>
              <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
                FIXED BY SESSION
              </span>
            </div>
          </div>

          {/* Subject: Dropdown for program subjects, empty text box for General study */}
          {!isGeneralStudy && programSubjects.length > 0 ? (
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                SUBJECT
              </label>
              <select
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              >
                <option value="" disabled>Select Subject...</option>
                {programSubjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                SUBJECT NAME / CODE
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Enter subject name or code..."
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none"
              />
            </div>
          )}

          {/* Exam Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                EXAM DATE
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                START TIME
              </label>
              <input
                type="time"
                required
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={initiateClose}
              className="flex-1 h-11 rounded-xl border border-white/[0.08] bg-[#1E2538] hover:bg-[#28324D] text-[#94A3B8] hover:text-white text-xs font-bold tracking-wider transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-black tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#FB7185] md:hover:scale-[1.01]"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>SAVE SUBJECT</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
