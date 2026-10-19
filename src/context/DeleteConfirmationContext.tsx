/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

export interface DeleteConfirmationOptions {
  title?: string;
  message?: string;
  itemType?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface DeleteConfirmationContextType {
  confirmDelete: (options: DeleteConfirmationOptions) => void;
  requestDelete: (itemType: string, itemName: string, onConfirm: () => void | Promise<void>) => void;
  closeConfirmation: () => void;
}

const DeleteConfirmationContext = createContext<DeleteConfirmationContextType | null>(null);

export const useDeleteConfirmation = (): DeleteConfirmationContextType => {
  const context = useContext(DeleteConfirmationContext);
  if (!context) {
    throw new Error('useDeleteConfirmation must be used within a DeleteConfirmationProvider');
  }
  return context;
};

export const DeleteConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DeleteConfirmationOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const isExecutingRef = useRef(false);

  const confirmDelete = useCallback((options: DeleteConfirmationOptions) => {
    // Prevent overlapping confirmations if one is already open
    if (isExecutingRef.current) return;
    setConfig(options);
    setIsClosing(false);
    setIsOpen(true);
    setIsProcessing(false);
  }, []);

  const requestDelete = useCallback(
    (itemType: string, itemName: string, onConfirm: () => void | Promise<void>) => {
      confirmDelete({
        itemType,
        itemName,
        onConfirm,
      });
    },
    [confirmDelete]
  );

  const closeConfirmation = useCallback(() => {
    if (isExecutingRef.current) return;
    const isPC = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (isPC) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        setIsProcessing(false);
        if (config?.onCancel) {
          try {
            config.onCancel();
          } catch {
            // Guard against errors in cancel handler
          }
        }
        setConfig(null);
      }, 180);
    } else {
      setIsOpen(false);
      setIsClosing(false);
      setIsProcessing(false);
      if (config?.onCancel) {
        try {
          config.onCancel();
        } catch {
          // Guard against errors in cancel handler
        }
      }
      setConfig(null);
    }
  }, [config]);

  const handleConfirm = async () => {
    if (!config || isExecutingRef.current || isProcessing) return;

    try {
      isExecutingRef.current = true;
      setIsProcessing(true);
      const res = config.onConfirm();
      if (res instanceof Promise) {
        await res;
      }
    } finally {
      isExecutingRef.current = false;
      setIsProcessing(false);
      const isPC = typeof window !== 'undefined' && window.innerWidth >= 768;
      if (isPC) {
        setIsClosing(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsClosing(false);
          setConfig(null);
        }, 180);
      } else {
        setIsOpen(false);
        setIsClosing(false);
        setConfig(null);
      }
    }
  };

  const handleCancel = () => {
    if (isExecutingRef.current || isProcessing) return;
    closeConfirmation();
  };

  // Keyboard accessibility: ESC key to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Body scroll locking when modal is open to prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus cancel button for safe keyboard navigation
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Format message dynamically
  const displayTitle = config?.title || 'Confirm Delete';
  const displayItemName = config?.itemName?.trim();
  const displayItemType = config?.itemType?.trim();

  let defaultMessage = 'Are you sure you want to delete this item? This action cannot be undone.';
  if (displayItemName) {
    defaultMessage = `Are you sure you want to delete "${displayItemName}"? This action cannot be undone.`;
  }
  const displayMessage = config?.message || defaultMessage;

  return (
    <DeleteConfirmationContext.Provider value={{ confirmDelete, requestDelete, closeConfirmation }}>
      {children}

      {isOpen && config && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className={`
            fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md select-none font-mono
            ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
          `}
          onClick={handleCancel}
        >
          <div
            className={`
              flex flex-col w-full max-w-md rounded-[28px] border border-white/[0.12] bg-[#0E1320] p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden font-mono relative
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

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08] relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#F43F5E] shadow-[0_0_16px_rgba(244,63,94,0.2)]">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="delete-dialog-title"
                    className="font-mono text-sm sm:text-base font-bold tracking-wide text-[#F8FAFC] uppercase"
                  >
                    {displayTitle}
                  </h2>
                  {displayItemType && (
                    <span className="inline-block mt-0.5 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                      {displayItemType}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-3 relative z-10">
              <p
                id="delete-dialog-description"
                className="font-mono text-xs sm:text-sm text-[#94A3B8] leading-relaxed break-words"
              >
                {displayItemName && displayMessage.includes(`"${displayItemName}"`) ? (
                  <>
                    {displayMessage.split(`"${displayItemName}"`)[0]}
                    <span className="font-bold text-[#F8FAFC] bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08]">
                      "{displayItemName}"
                    </span>
                    {displayMessage.split(`"${displayItemName}"`)[1]}
                  </>
                ) : (
                  displayMessage
                )}
              </p>

              <div className="p-2.5 rounded-xl border border-[#F43F5E]/20 bg-[#F43F5E]/5 flex items-center gap-2 text-[11px] font-mono text-[#F43F5E]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>This action cannot be undone.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08] relative z-10">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/[0.08] bg-[#1E2538] hover:bg-[#28324D] font-mono text-xs font-bold text-[#94A3B8] hover:text-white transition-colors cursor-pointer text-center"
              >
                {config.cancelLabel || 'CANCEL'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#FB7185] bg-[#F43F5E] hover:bg-[#E11D48] font-mono text-xs font-black text-white active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{config.confirmLabel || 'DELETE'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DeleteConfirmationContext.Provider>
  );
};
