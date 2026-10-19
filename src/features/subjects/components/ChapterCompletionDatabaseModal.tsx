/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Database, X, FileText, Folder, LineChart as LineChartIcon } from 'lucide-react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { CompletionRecordsSection } from './completion-database/CompletionRecordsSection';
import { CompletedChaptersBySubjectSection } from './completion-database/CompletedChaptersBySubjectSection';
import { CompletionLineChartSection } from './completion-database/CompletionLineChartSection';
import { formatRecordDate, formatRecordTime } from './completion-database/completionUtils';

interface ChapterCompletionDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveSectionTab = 'record' | 'subjects' | 'progress';

export const ChapterCompletionDatabaseModal: React.FC<ChapterCompletionDatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    tracks, 
    programs, 
    subjects, 
    completionRecords, 
    updateCompletionRecord 
  } = useAcademicHierarchy();

  const [activeTab, setActiveTab] = useState<ActiveSectionTab>('record');
  const [isClosing, setIsClosing] = useState(false);

  // Short summary metrics
  const totalCompleted = completionRecords.length;
  const lastRecord = useMemo(() => {
    if (completionRecords.length === 0) return null;
    return [...completionRecords].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )[0];
  }, [completionRecords]);

  // Reset closing flag whenever isOpen turns true
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  // Safe close handler preventing duplicate triggers
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  }, [isClosing, onClose]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="completion-database-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-database-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md select-none overflow-hidden"
          onClick={handleClose}
        >
          {/* ── MODAL CONTAINER (TRANSPARENT X-29 STYLE) ── */}
          <motion.div
            key="completion-database-container"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl h-[88vh] max-h-[88vh] rounded-3xl border border-white/[0.12] bg-[#0E121B]/80 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glow inside modal */}
            <div 
              className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-[#10B981]/05 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />

            {/* ── MODAL HEADER ── */}
            <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-[#0E121B]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8]">
                    <Database className="h-4 w-4" />
                  </div>
                  <h2
                    id="completion-database-title"
                    className="font-mono text-sm sm:text-base font-bold tracking-tight text-[#F8FAFC]"
                  >
                    Database
                  </h2>
                </div>

                {/* Short Dashboard Summary */}
                <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/[0.1] text-xs font-mono">
                  <span className="text-[#10B981] font-semibold">{totalCompleted} Chapters Completed</span>
                  {lastRecord && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="text-[#94A3B8]">
                        Last: {formatRecordDate(lastRecord.completedAt)}, {formatRecordTime(lastRecord.completedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* ── SECTION SWITCHER TABS & CLOSE BUTTON ── */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab('record')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'record'
                        ? 'bg-[#6366F1]/25 text-[#A5B4FC] border border-[#6366F1]/50 font-semibold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Record</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('subjects')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'subjects'
                        ? 'bg-[#6366F1]/25 text-[#A5B4FC] border border-[#6366F1]/50 font-semibold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span>Subjects</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('progress')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'progress'
                        ? 'bg-[#6366F1]/25 text-[#A5B4FC] border border-[#6366F1]/50 font-semibold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                    }`}
                  >
                    <LineChartIcon className="h-3.5 w-3.5" />
                    <span>Progress</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── MODAL SCROLLABLE BODY (SINGLE ACTIVE SECTION) ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain">
              {activeTab === 'record' && (
                <CompletionRecordsSection
                  records={completionRecords}
                  subjects={subjects}
                  tracks={tracks}
                  programs={programs}
                  onUpdateRecord={updateCompletionRecord}
                />
              )}

              {activeTab === 'subjects' && (
                <CompletedChaptersBySubjectSection
                  records={completionRecords}
                  subjects={subjects}
                  tracks={tracks}
                  programs={programs}
                  onUpdateRecord={updateCompletionRecord}
                />
              )}

              {activeTab === 'progress' && (
                <CompletionLineChartSection
                  records={completionRecords}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
