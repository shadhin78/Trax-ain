/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { ProgramResult } from '../../types';
import { formatDisplayDate, mapCgpaToGrade } from '../../utils/outcomeHelpers';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  result: ProgramResult | null;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  result,
  isDeleting = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !result) return null;
  if (typeof document === 'undefined') return null;

  const isAchievement = result.resultType === 'Achievement';
  const title = isAchievement ? (result.achievementTitle || 'Milestone Achievement') : result.programName;
  const gradeStr = result.actualGrade || mapCgpaToGrade(result.actualCgpa, result.evaluationOption);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-[28px] border border-white/[0.12] bg-[#0B0F19]/90 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_24px_rgba(244,63,94,0.18)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"

          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#131722] hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon with Red Neon Glow */}
        <div className="h-12 w-12 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 flex items-center justify-center text-[#F43F5E] shadow-[0_0_20px_rgba(244,63,94,0.35)] mb-4">
          <Trash2 className="h-6 w-6" />
        </div>

        {/* Header Titles */}
        <h3
          id="delete-confirm-title"
          className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight uppercase"
        >
          DELETE LOGGED RESULT
        </h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed mt-2">
          Are you sure you want to permanently delete this logged record? This action cannot be undone and will update related pass/freeze tracking.
        </p>

        {/* Item Preview Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#131722]/80 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              {isAchievement ? 'ACHIEVEMENT' : 'PROGRAM'}
            </span>
            <span className="text-[10px] text-[#94A3B8] font-bold">
              {formatDisplayDate(result.date)}
            </span>
          </div>

          <p className="text-sm font-black text-[#F8FAFC] truncate">
            {title}
          </p>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
            {isAchievement ? (
              <>
                <span className="text-[#94A3B8] text-[11px]">Milestone Value:</span>
                <span className="font-bold text-[#A78BFA]">{result.achievementValue || 'Completed'}</span>
              </>
            ) : (
              <>
                <span className="text-[#94A3B8] text-[11px]">
                  Target: {result.targetIsNone ? 'None' : result.targetCgpa.toFixed(2)}
                </span>
                <span className="font-bold text-[#38BDF8]">
                  Actual: {result.actualCgpa.toFixed(2)} ({gradeStr})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-[#131722] hover:bg-white/10 text-xs font-bold text-[#94A3B8] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl border border-[#F43F5E]/60 bg-[#F43F5E] hover:bg-[#E11D48] text-xs font-black text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'DELETING...' : 'DELETE RECORD'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

