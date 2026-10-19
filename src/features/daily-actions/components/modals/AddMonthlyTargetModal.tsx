/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Plus, AlertCircle } from 'lucide-react';
import { useDailyActions } from '../../context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';

interface AddMonthlyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMonthlyTargetModal: React.FC<AddMonthlyTargetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedMonthKey, addMonthlyTarget } = useDailyActions();
  const { subjects, programs } = useAcademicHierarchy();

  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unitLabel, setUnitLabel] = useState('Chapters');
  const [track, setTrack] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Smooth exit on PC, instant on mobile
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
    }, 190);
  }, [isClosing, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') initiateClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a target title (e.g. Chapter 1-5).');
      return;
    }

    if (!targetCount || targetCount < 1) {
      setError('Target count must be at least 1.');
      return;
    }

    addMonthlyTarget({
      title: trimmedTitle,
      targetCount,
      completedCount: 0,
      unitLabel,
      track: track ? track : undefined,
      notes: notes.trim() || undefined,
      monthKey: selectedMonthKey,
    });

    // Reset form & close
    setTitle('');
    setTargetCount(10);
    setNotes('');
    setTrack('');
    initiateClose();
  };

  return createPortal(
    <div 
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0B0F19]/90 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col font-mono relative overflow-hidden
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient neon orbs */}
        <div 
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight">
                Add Monthly Target
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Target for month: <span className="text-[#38BDF8] font-bold">{selectedMonthKey}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Target Name / Title <span className="text-[#F43F5E]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish Chapter 1-5, Solve 200 Questions"
              autoFocus
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none transition-all"
            />
          </div>

          {/* Target Count & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Target Amount / Count <span className="text-[#F43F5E]">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Unit Label
              </label>
              <select
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none transition-all cursor-pointer"
              >
                <option value="Chapters" className="bg-[#0E121B] text-[#F8FAFC]">Chapters</option>
                <option value="Tasks" className="bg-[#0E121B] text-[#F8FAFC]">Tasks</option>
                <option value="Units" className="bg-[#0E121B] text-[#F8FAFC]">Units</option>
                <option value="Problems" className="bg-[#0E121B] text-[#F8FAFC]">Problems</option>
                <option value="Sessions" className="bg-[#0E121B] text-[#F8FAFC]">Sessions</option>
                <option value="Hours" className="bg-[#0E121B] text-[#F8FAFC]">Hours</option>
              </select>
            </div>
          </div>

          {/* Track / Subject Link (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Link to Academic Subject / Track (Optional)
            </label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none transition-all cursor-pointer"
            >
              <option value="" className="bg-[#0E121B] text-white/50">-- No Subject Track (General Target) --</option>
              {subjects.map((sub) => {
                const prog = programs.find((p) => p.id === sub.programId);
                return (
                  <option key={sub.id} value={sub.name} className="bg-[#0E121B] text-[#F8FAFC]">
                    {sub.name} {prog ? `(${prog.name})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Notes / Strategy (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on CQ type questions first"
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={initiateClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-xs font-black uppercase text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
