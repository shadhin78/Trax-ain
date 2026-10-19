/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { PaceGoal } from '../../types';
import { usePace } from '../../context/PaceContext';

interface PaceDeleteConfirmModalProps {
  goal: PaceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaceDeleteConfirmModal: React.FC<PaceDeleteConfirmModalProps> = ({
  goal,
  isOpen,
  onClose,
}) => {
  const { deleteGoal } = usePace();
  const [isClosing, setIsClosing] = useState(false);

  // Smooth exit animation handler (PC only; instant on mobile)
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

  if (!isOpen || !goal || typeof document === 'undefined') return null;

  const handleDelete = () => {
    deleteGoal(goal.id);
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
          w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl p-5 sm:p-6
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative font-mono
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient red glow orb */}
        <div 
          className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-[#EF4444]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        <button
          type="button"
          onClick={initiateClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer relative z-10"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8 relative z-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] font-mono">
              Delete Pace Target?
            </h3>
            <p className="font-mono text-xs text-[#94A3B8] mt-0.5">
              This action will remove the timeline goal.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-[#0E121B]/70 border border-white/[0.08] font-mono text-xs text-[#94A3B8] relative z-10">
          Goal: <strong className="text-[#F8FAFC]">{goal.type === 'global' ? 'Global Pace' : goal.target}</strong>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 relative z-10">
          <button
            type="button"
            onClick={initiateClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono font-bold text-[#94A3B8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-xs font-mono font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
