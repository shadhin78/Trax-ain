/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Plus, Clock } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { Subject } from '../../../../types/academic';
import { SessionMode } from '../../types';
import { SubjectSelectOptions } from '../SubjectSelectOptions';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSession: (session: {
    date: string;
    time: string;
    subject: string;
    durationSeconds: number;
    mode: SessionMode;
  }) => void;
}

type DurationMode = 'HOURS_MIN' | 'TIME_RANGE';

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  isOpen,
  onClose,
  onAddSession,
}) => {
  const { programs, subjects } = useAcademicHierarchy();
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [subject, setSubject] = useState('General Study');

  const [durationMode, setDurationMode] = useState<DurationMode>('HOURS_MIN');
  const [durationHours, setDurationHours] = useState('00');
  const [durationMinutes, setDurationMinutes] = useState('00');
  const [startTimeRange, setStartTimeRange] = useState('');
  const [endTimeRange, setEndTimeRange] = useState('');

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setSubject('General Study');
      setDurationHours('00');
      setDurationMinutes('00');
      setStartTimeRange('');
      setEndTimeRange('');
      setDurationMode('HOURS_MIN');
    }
  }, [isOpen]);

  // Calculate range duration in seconds
  const calculatedRangeSeconds = useMemo(() => {
    if (!startTimeRange || !endTimeRange) return 0;
    const [sh, sm] = startTimeRange.split(':').map(Number);
    const [eh, em] = endTimeRange.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin < startMin) {
      endMin += 24 * 60; // Spans across midnight
    }
    return Math.max(0, (endMin - startMin) * 60);
  }, [startTimeRange, endTimeRange]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let totalSeconds = 0;
    let sessionTime = time;

    if (durationMode === 'HOURS_MIN') {
      const h = Math.max(0, parseInt(durationHours, 10) || 0);
      const m = Math.max(0, parseInt(durationMinutes, 10) || 0);
      totalSeconds = h * 3600 + m * 60;
    } else {
      totalSeconds = calculatedRangeSeconds;
      if (startTimeRange) {
        sessionTime = startTimeRange;
      }
    }

    if (totalSeconds > 0) {
      onAddSession({
        date,
        time: sessionTime,
        subject,
        durationSeconds: totalSeconds,
        mode: 'ADDED',
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

      {/* Modal Dialog Box - centered in viewport window */}
      <div className="w-full max-w-md rounded-[24px] border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] font-mono relative z-10 transition-all duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-[#10B981]">
            <Calendar className="h-4 w-4" />
            <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              Log Study Session
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
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none cursor-pointer"
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
                className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none cursor-pointer"
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
              className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none cursor-pointer"
            >
              <SubjectSelectOptions programs={programs} subjects={subjects} />
            </select>
          </div>

          {/* ── DURATION CONFIGURATION (HOURS & MIN vs TIME RANGE) ── */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Duration</span>
              </label>
              <div className="inline-flex p-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setDurationMode('HOURS_MIN')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                    durationMode === 'HOURS_MIN'
                      ? 'bg-[#10B981] text-black font-black shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  HOURS & MIN
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('TIME_RANGE')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                    durationMode === 'TIME_RANGE'
                      ? 'bg-[#10B981] text-black font-black shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  TIME RANGE
                </button>
              </div>
            </div>

            {durationMode === 'HOURS_MIN' ? (
              /* Hours and Minutes inputs: default 00 */
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
                    className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-sm font-bold text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none"
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
                    className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-sm font-bold text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Time Range inputs: two empty time boxes (Start & End Time) */
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTimeRange}
                      onChange={(e) => {
                        setStartTimeRange(e.target.value);
                        if (e.target.value) setTime(e.target.value);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTimeRange}
                      onChange={(e) => setEndTimeRange(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {calculatedRangeSeconds > 0 && (
                  <div className="flex items-center justify-between text-[11px] px-1 pt-1 font-mono">
                    <span className="text-[#94A3B8] tracking-wider uppercase text-[10px]">
                      Calculated Duration:
                    </span>
                    <span className="font-bold text-[#34D399]">
                      {Math.floor(calculatedRangeSeconds / 3600) > 0
                        ? `${Math.floor(calculatedRangeSeconds / 3600)} hr `
                        : ''}
                      {Math.floor((calculatedRangeSeconds % 3600) / 60)} min
                    </span>
                  </div>
                )}
              </div>
            )}
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
              className="flex-1 h-11 rounded-xl border border-[#10B981]/50 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold tracking-wider shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
