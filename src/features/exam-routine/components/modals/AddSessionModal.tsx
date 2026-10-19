/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Check } from 'lucide-react';
import { ExamSession } from '../../types';
import { useExamRoutine } from '../../context/ExamRoutineContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSession?: ExamSession | null;
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  editingSession = null,
}) => {
  const { addSession, updateSession } = useExamRoutine();
  const { programs } = useAcademicHierarchy();

  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [hasManuallyEditedTitle, setHasManuallyEditedTitle] = useState(false);

  useEffect(() => {
    if (editingSession) {
      setTitle(editingSession.title);
      setProgramId(editingSession.programId || '');
      setStartDate(editingSession.startDate);
      setEndDate(editingSession.endDate);
      setDescription(editingSession.description || '');
      setHasManuallyEditedTitle(true);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setTitle('');
      setProgramId('');
      setStartDate(today);
      setEndDate(nextWeek);
      setDescription('');
      setHasManuallyEditedTitle(false);
    }
  }, [editingSession, isOpen]);

  const handleProgramChange = (selectedId: string) => {
    setProgramId(selectedId);
    const selectedProgram = programs.find((p) => p.id === selectedId);
    if (selectedProgram) {
      // Auto-format title as "program name - Exam" unless user typed a custom title
      if (
        !hasManuallyEditedTitle ||
        !title.trim() ||
        programs.some((p) => title === `${p.name} - Exam` || title === `${p.name} - Exam Session`)
      ) {
        setTitle(`${selectedProgram.name} - Exam`);
        setHasManuallyEditedTitle(false);
      }
    } else {
      // Reverted to General (No Specific Program)
      if (
        !hasManuallyEditedTitle ||
        programs.some((p) => title === `${p.name} - Exam` || title === `${p.name} - Exam Session`)
      ) {
        setTitle('');
        setHasManuallyEditedTitle(false);
      }
    }
  };

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

  // Close modal on Escape
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

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedProgram = programs.find((p) => p.id === programId);

    if (editingSession) {
      await updateSession(editingSession.id, {
        title: title.trim(),
        programId: selectedProgram?.id,
        programName: selectedProgram?.name,
        startDate,
        endDate,
        description: description.trim(),
      });
    } else {
      await addSession({
        title: title.trim(),
        programId: selectedProgram?.id,
        programName: selectedProgram?.name,
        startDate,
        endDate,
        description: description.trim(),
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
          w-full max-w-md rounded-[28px] border border-white/[0.12] bg-[#0E1320] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative max-h-[90vh] overflow-hidden flex flex-col
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient PC-only subtle accent glow safely clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none" aria-hidden="true">
          <div 
            className="hidden md:block absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#8B5CF6]/10 blur-3xl pointer-events-none" 
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] shadow-[0_0_12px_rgba(139,92,246,0.25)]">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider uppercase">
                {editingSession ? 'Edit Exam Session' : 'Add Exam Session'}
              </h3>
              <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
                CONFIGURE TIMETABLE SESSION
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
          {/* Session Title */}
          <div>
            <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              SESSION TITLE
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasManuallyEditedTitle(true);
              }}
              placeholder="e.g. Program Name - Exam"
              className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none"
            />
          </div>

          {/* Academic Program (Optional) */}
          {programs.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                PROGRAM (OPTIONAL)
              </label>
              <select
                value={programId}
                onChange={(e) => handleProgramChange(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              >
                <option value="">General (No Specific Program)</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                START DATE
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                END DATE
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] focus:border-[#F43F5E] outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              DESCRIPTION / VENUE NOTES (OPTIONAL)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fall term exams at Main Campus"
              className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#F43F5E] outline-none"
            />
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
              <span>SAVE SESSION</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
