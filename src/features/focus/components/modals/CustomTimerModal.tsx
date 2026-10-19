/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Check } from 'lucide-react';

interface CustomTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (seconds: number) => void;
}

export const CustomTimerModal: React.FC<CustomTimerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [hours, setHours] = useState<string>('00');
  const [minutes, setMinutes] = useState<string>('00');

  useEffect(() => {
    if (isOpen) {
      setHours('00');
      setMinutes('00');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Math.max(0, parseInt(hours, 10) || 0);
    const m = Math.max(0, parseInt(minutes, 10) || 0);
    const total = h * 3600 + m * 60;
    if (total > 0) {
      onConfirm(total);
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
      <div className="w-full max-w-sm rounded-[24px] border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] font-mono relative z-10 transition-all duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-[#818CF8]">
            <Clock className="h-4 w-4" />
            <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              Custom Duration
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
                Hours
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '00' || e.target.value === '0') {
                    e.target.select();
                  }
                }}
                placeholder="00"
                className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-base font-bold text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
                autoFocus
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
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '00' || e.target.value === '0') {
                    e.target.select();
                  }
                }}
                placeholder="00"
                className="w-full h-11 px-3 text-center rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-base font-bold text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none"
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
              className="flex-1 h-11 rounded-xl border border-[#6366F1]/50 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold tracking-wider shadow-[0_0_16px_rgba(99,102,241,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Set Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
