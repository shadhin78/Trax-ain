/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Trash2, Check, AlertCircle } from 'lucide-react';
import { DailyAction, DailyActionColor, DailyActionIcon } from '../../types';
import { useDailyActions } from '../../context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';

interface EditDailyActionModalProps {
  action: DailyAction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditDailyActionModal: React.FC<EditDailyActionModalProps> = ({
  action,
  isOpen,
  onClose,
}) => {
  const { updateDailyAction, deleteDailyAction } = useDailyActions();
  const { subjects, programs } = useAcademicHierarchy();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [themeColor, setThemeColor] = useState<DailyActionColor>('indigo');
  const [icon, setIcon] = useState<DailyActionIcon>('list');
  const [track, setTrack] = useState('-- No Track (Optional) --');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state when action changes
  useEffect(() => {
    if (action) {
      setTitle(action.title);
      setDescription(action.description || '');
      setStartDate(action.startDate);
      setThemeColor(action.themeColor);
      setIcon(action.icon);
      setTrack(action.track || '-- No Track (Optional) --');
      setIsConfirmingDelete(false);
      setErrorMsg(null);
    }
  }, [action]);

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

  if (!isOpen || !action || typeof document === 'undefined') return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Please specify an Action Title.');
      return;
    }

    updateDailyAction(action.id, {
      title: trimmedTitle,
      description: description.trim() || undefined,
      startDate: startDate || action.startDate,
      themeColor,
      icon,
      track: track !== '-- No Track (Optional) --' ? track : undefined,
    });

    initiateClose();
  };

  const handleDelete = () => {
    deleteDailyAction(action.id);
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
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#F8FAFC]">
                Edit Daily Action Tracker
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Modify habit tracker configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="mt-5 space-y-4 relative z-10">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Action Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Action Title <span className="text-[#F43F5E]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all"
            />
          </div>

          {/* 2. Question / Description (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Question / Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Did you complete Johor?"
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all"
            />
          </div>

          {/* 3. Start Date & Theme Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Theme Color
              </label>
              <select
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value as DailyActionColor)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all cursor-pointer"
              >
                <option value="indigo" className="bg-[#0E121B]">Indigo</option>
                <option value="emerald" className="bg-[#0E121B]">Emerald</option>
                <option value="amber" className="bg-[#0E121B]">Amber</option>
                <option value="cyan" className="bg-[#0E121B]">Cyan</option>
                <option value="rose" className="bg-[#0E121B]">Rose</option>
                <option value="violet" className="bg-[#0E121B]">Violet</option>
                <option value="sky" className="bg-[#0E121B]">Sky</option>
                <option value="teal" className="bg-[#0E121B]">Teal</option>
              </select>
            </div>
          </div>

          {/* 4. Icon & Track (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Icon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value as DailyActionIcon)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all cursor-pointer"
              >
                <option value="list" className="bg-[#0E121B]">List / Default</option>
                <option value="check" className="bg-[#0E121B]">Check / Task</option>
                <option value="flame" className="bg-[#0E121B]">Flame / Habit</option>
                <option value="target" className="bg-[#0E121B]">Target / Goal</option>
                <option value="book" className="bg-[#0E121B]">Book / Study</option>
                <option value="code" className="bg-[#0E121B]">Code / Tech</option>
                <option value="dumbbell" className="bg-[#0E121B]">Dumbbell / Fitness</option>
                <option value="brain" className="bg-[#0E121B]">Brain / Focus</option>
                <option value="sparkles" className="bg-[#0E121B]">Sparkles / Creative</option>
                <option value="zap" className="bg-[#0E121B]">Zap / Energy</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Track (Optional)
              </label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all cursor-pointer truncate"
              >
                <option value="-- No Track (Optional) --" className="bg-[#0E121B]">-- No Track (Optional) --</option>
                {subjects.map((s) => {
                  const p = programs.find((prog) => prog.id === s.programId);
                  return (
                    <option key={s.id} value={s.name} className="bg-[#0E121B]">
                      {s.name} {p ? `(${p.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            {isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-[#EF4444] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-1 text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 py-2 rounded-xl text-[#F43F5E]/70 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-transparent hover:border-[#F43F5E]/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={initiateClose}
                className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#818CF8] hover:to-[#6366F1] text-xs font-black uppercase text-white shadow-[0_0_16px_rgba(99,102,241,0.35)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
