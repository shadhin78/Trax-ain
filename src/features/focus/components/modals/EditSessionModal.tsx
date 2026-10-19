/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Save } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { FocusSession } from '../../types';
import { SubjectSelectOptions } from '../SubjectSelectOptions';

interface EditSessionModalProps {
  isOpen: boolean;
  session: FocusSession;
  onClose: () => void;
  onSaveSession: (id: string, updatedData: Partial<Omit<FocusSession, 'id' | 'createdAt'>>) => void;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  session,
  onClose,
  onSaveSession,
}) => {
  const { programs, subjects } = useAcademicHierarchy();

  const initialTotalMin = Math.max(1, Math.round((session.durationSeconds || 60) / 60));
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.time);
  const [subject, setSubject] = useState(session.subject);
  const [durationHours, setDurationHours] = useState(
    String(Math.floor(initialTotalMin / 60)).padStart(2, '0')
  );
  const [durationMinutes, setDurationMinutes] = useState(
    String(initialTotalMin % 60).padStart(2, '0')
  );

  React.useEffect(() => {
    if (session) {
      setDate(session.date);
      setTime(session.time);
      setSubject(session.subject);
      const totalMin = Math.max(1, Math.round((session.durationSeconds || 60) / 60));
      setDurationHours(String(Math.floor(totalMin / 60)).padStart(2, '0'));
      setDurationMinutes(String(totalMin % 60).padStart(2, '0'));
    }
  }, [session]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Math.max(0, parseInt(durationHours, 10) || 0);
    const m = Math.max(0, parseInt(durationMinutes, 10) || 0);
    const totalSec = h * 3600 + m * 60;
    if (totalSec > 0) {
      onSaveSession(session.id, {
        date,
        time,
        subject,
        durationSeconds: totalSec,
      });
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono"
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Box */}
      <div className="w-full max-w-md rounded-[24px] border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] font-mono relative z-10 transition-all duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-[#818CF8]">
            <Edit3 className="h-4 w-4" />
            <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              Edit Study Session
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none cursor-pointer"
            >
              <SubjectSelectOptions programs={programs} subjects={subjects} />
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Hours
              </label>
              <input
                type="number"
                min="0"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '00' || e.target.value === '0') {
                    e.target.select();
                  }
                }}
                placeholder="00"
                className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-sm font-bold text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '00' || e.target.value === '0') {
                    e.target.select();
                  }
                }}
                placeholder="00"
                className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-sm font-bold text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white text-xs font-bold tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl border border-[#6366F1]/50 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold tracking-wider shadow-[0_0_16px_rgba(99,102,241,0.35)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
