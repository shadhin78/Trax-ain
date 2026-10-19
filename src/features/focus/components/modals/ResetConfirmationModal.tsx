/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, AlertTriangle, X, Clock } from 'lucide-react';

interface ResetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: string;
  timeDisplay: string;
  status: string;
}

export const ResetConfirmationModal: React.FC<ResetConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode,
  timeDisplay,
  status,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Smooth exit animation handler (PC only; instant on mobile per X-29 rules)
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

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to smoothly close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleReset = () => {
    onConfirm();
    initiateClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      onClick={initiateClose}
    >
      <div
        className={`
          w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-5 sm:p-6
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative font-mono
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient amber glow orb (PC only) */}
        <div
          className="hidden md:block absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.2)]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="reset-modal-title"
                className="font-mono text-sm sm:text-base font-bold tracking-wide text-[#F8FAFC] uppercase"
              >
                Reset Chronometer
              </h2>
              <span className="inline-block mt-0.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                Focus Session Protection
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-3.5 relative z-10">
          <p className="font-mono text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Are you sure you want to reset the chronometer? Your current timer progress will be cleared and restored to initial state.
          </p>

          {/* Current Chronometer State Summary Card */}
          <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-[#818CF8]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">
                  {mode === 'ALARM_RANGE' ? 'ALARM RANGE' : mode}
                </span>
                <span className="text-xs font-bold text-white tracking-widest">
                  {status === 'IDLE' ? 'READY' : status}
                </span>
              </div>
            </div>
            <div className="font-mono font-black text-lg text-[#F8FAFC] tracking-wider">
              {timeDisplay}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-2.5 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/5 flex items-center gap-2 text-[11px] font-mono text-[#FBBF24]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span>Unsaved session progress will be lost.</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08] relative z-10">
          <button
            type="button"
            onClick={initiateClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/[0.08] bg-[#1E2538] hover:bg-[#28324D] font-mono text-xs font-bold text-[#94A3B8] hover:text-white transition-colors cursor-pointer text-center"
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#FBBF24] bg-[#F59E0B] hover:bg-[#D97706] font-mono text-xs font-black text-black active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>CONFIRM RESET</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
