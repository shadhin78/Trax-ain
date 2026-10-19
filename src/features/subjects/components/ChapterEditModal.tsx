/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Save, 
  SkipForward, 
  RotateCcw, 
  ArrowRight, 
  BookOpen, 
  Hash, 
  Type, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Chapter, Subject, Program, Track } from '../../../types/academic';
import { 
  useAcademicHierarchy, 
  parseChapterNumber, 
  getNextAvailableChapterNumber, 
  getChapterTopicDisplay 
} from '../../../context/AcademicHierarchyContext';

interface ChapterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  currentSubject?: Subject;
  currentProgram?: Program;
  currentTrack?: Track;
}

export const ChapterEditModal: React.FC<ChapterEditModalProps> = ({
  isOpen,
  onClose,
  chapter,
  currentSubject,
  currentProgram,
  currentTrack,
}) => {
  const { 
    programs, 
    subjects, 
    chapters, 
    updateChapter, 
    deleteChapter 
  } = useAcademicHierarchy();

  // Form states
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [chapterNumber, setChapterNumber] = useState<string>('');
  const [topicName, setTopicName] = useState<string>('');
  const [isSkipped, setIsSkipped] = useState<boolean>(false);

  // Clear slot confirmation state
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize form when modal opens or chapter changes
  useEffect(() => {
    if (isOpen && chapter) {
      const progId = chapter.programId || currentProgram?.id || (currentSubject ? currentSubject.programId : '');
      setSelectedProgramId(progId);
      setSelectedSubjectId(chapter.subjectId || currentSubject?.id || '');
      setChapterNumber(String(chapter.chapterNumber || ''));
      setTopicName(chapter.topicName || chapter.title || '');
      setIsSkipped(Boolean(chapter.isSkipped || chapter.status === 'skipped'));
      setIsConfirmingClear(false);
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [isOpen, chapter, currentSubject, currentProgram]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Subjects filtered by selected program
  const programSubjects = useMemo(() => {
    if (!selectedProgramId || selectedProgramId === 'all') return subjects;
    return subjects.filter(s => s.programId === selectedProgramId);
  }, [subjects, selectedProgramId]);

  // Current target subject object
  const targetSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId) || currentSubject;
  }, [subjects, selectedSubjectId, currentSubject]);

  // Check if target subject differs from chapter's original subject
  const isMovingSubject = useMemo(() => {
    if (!chapter) return false;
    return selectedSubjectId !== chapter.subjectId;
  }, [chapter, selectedSubjectId]);

  // Check for duplicate chapter number in target subject
  const duplicateWarning = useMemo(() => {
    if (!chapter || !selectedSubjectId || !chapterNumber.trim()) return null;
    const parsed = parseChapterNumber(chapterNumber);
    if (parsed <= 0) return 'Chapter number must be a positive integer.';

    const duplicate = chapters.some(c => {
      // Ignore current chapter if staying in the same subject
      if (c.id === chapter.id) return false;
      return c.subjectId === selectedSubjectId && parseChapterNumber(c.chapterNumber) === parsed;
    });

    if (duplicate) {
      const subjName = targetSubject?.name || 'selected subject';
      return `Chapter ${parsed} already exists in ${subjName}. Please pick a unique number.`;
    }
    return null;
  }, [chapter, selectedSubjectId, chapterNumber, chapters, targetSubject]);

  // Handle program change in dropdown
  const handleProgramChange = (progId: string) => {
    setSelectedProgramId(progId);
    setErrorMsg(null);
    if (progId === 'all') return;
    const subjsInProg = subjects.filter(s => s.programId === progId);
    if (subjsInProg.length > 0) {
      // If current subject is not in this program, select first subject
      const hasCurrent = subjsInProg.some(s => s.id === selectedSubjectId);
      if (!hasCurrent) {
        setSelectedSubjectId(subjsInProg[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  };

  // Chapter number stepper handlers
  const handleIncrementChapter = () => {
    const current = parseChapterNumber(chapterNumber);
    const nextVal = current > 0 ? current + 1 : 1;
    setChapterNumber(String(nextVal));
    setErrorMsg(null);
  };

  const handleDecrementChapter = () => {
    const current = parseChapterNumber(chapterNumber);
    if (current > 1) {
      setChapterNumber(String(current - 1));
      setErrorMsg(null);
    }
  };

  // Auto-suggest next available chapter number in target subject
  const handleAutoSuggestNumber = () => {
    if (!selectedSubjectId) return;
    const targetChapters = chapters.filter(c => c.subjectId === selectedSubjectId && c.id !== chapter?.id);
    const nextNum = getNextAvailableChapterNumber(targetChapters);
    setChapterNumber(String(nextNum));
    setErrorMsg(null);
  };

  // Immediate Skip / Unskip action
  const handleToggleSkip = () => {
    if (!chapter) return;
    const nextSkipped = !isSkipped;
    setIsSkipped(nextSkipped);
    setErrorMsg(null);
    updateChapter(chapter.id, { isSkipped: nextSkipped });
  };

  // Save changes
  const handleSave = () => {
    if (!chapter) return;
    setErrorMsg(null);

    const parsedNum = parseChapterNumber(chapterNumber);
    if (parsedNum <= 0) {
      setErrorMsg('Please enter a valid positive chapter number (e.g. 1, 2, 3).');
      return;
    }

    if (!selectedSubjectId) {
      setErrorMsg('Please select a target subject.');
      return;
    }

    if (duplicateWarning) {
      setErrorMsg(duplicateWarning);
      return;
    }

    setIsSaving(true);
    const result = updateChapter(chapter.id, {
      chapterNumber: String(parsedNum),
      topicName: topicName.trim(),
      title: topicName.trim(),
      targetSubjectId: selectedSubjectId,
      isSkipped: isSkipped,
    });

    setIsSaving(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Failed to update chapter.');
      return;
    }

    onClose();
  };

  // Clear slot (delete chapter)
  const handleConfirmClearSlot = () => {
    if (!chapter) return;
    deleteChapter(chapter.id);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && chapter && (
        <motion.div
          key="chapter-edit-modal-backdrop"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          {/* ── MODAL CONTAINER (GLASSMORPHIC X-29 THEME) ── */}
          <motion.div
            key="chapter-edit-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-3xl border border-white/[0.12] bg-[#0E121B]/90 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glows */}
            <div 
              className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-[#6366F1]/12 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-[#38BDF8]/08 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />

            {/* ── MODAL HEADER ── */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0E121B]/95 backdrop-blur-md flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8] shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-base font-bold tracking-tight text-[#F8FAFC]">
                      Edit Chapter
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#A5B4FC]">
                      CH {chapter.chapterNumber}
                    </span>
                    {isSkipped && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        SKIPPED
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#94A3B8] mt-0.5">
                    {currentSubject ? currentSubject.name : 'Active Subject'} • Configure details or manage slot
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:text-[#F8FAFC] text-[#94A3B8] flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── MODAL BODY (SCROLLABLE CONTENT) ── */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)] relative z-10 custom-scrollbar">

              {/* Error Alert (if any) */}
              {errorMsg && (
                <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* ── 1. PROGRAM-BASED SUBJECT SELECTION (MOVE TO ANOTHER SUBJECT) ── */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-[#38BDF8]" />
                    <span>Move to Subject</span>
                  </label>
                  {isMovingSubject && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] animate-pulse">
                      <ArrowRight className="h-3 w-3" />
                      Moving Subject
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Program Dropdown */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                      Program:
                    </span>
                    <select
                      value={selectedProgramId}
                      onChange={(e) => handleProgramChange(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#0E121B]/90 font-mono text-xs sm:text-sm text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 outline-none cursor-pointer transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                    >
                      <option value="all">All Programs ({programs.length})</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Program-Based Subject Dropdown */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
                      Subject:
                    </span>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-white/[0.12] bg-[#0E121B]/90 font-mono text-xs sm:text-sm text-[#F8FAFC] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 outline-none cursor-pointer transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                    >
                      {selectedProgramId === 'all' ? (
                        programs.map(prog => {
                          const subjsInProg = subjects.filter(s => s.programId === prog.id);
                          if (subjsInProg.length === 0) return null;
                          return (
                            <optgroup key={prog.id} label={prog.name}>
                              {subjsInProg.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.id === chapter.subjectId ? '(Current)' : ''}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })
                      ) : (
                        programSubjects.length === 0 ? (
                          <option value="">No subjects in this program</option>
                        ) : (
                          programSubjects.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.id === chapter.subjectId ? '(Current)' : ''}
                            </option>
                          ))
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Move Status feedback */}
                {isMovingSubject && targetSubject && (
                  <div className="p-2.5 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[11px] font-mono text-[#BAE6FD] flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                    <span>
                      Chapter will be transferred from <strong className="text-white">{currentSubject?.name || 'current'}</strong> to <strong className="text-[#38BDF8]">{targetSubject.name}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* ── 2. CHAPTER DETAILS (NUMBER & TOPIC NAME COMPACT COMBINED) ── */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  {/* Chapter Number Column (4 cols on sm+) */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-[#818CF8]" />
                        <span>CH No.</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoSuggestNumber}
                        className="text-[10px] font-mono text-[#818CF8] hover:text-[#A5B4FC] flex items-center gap-0.5 cursor-pointer transition-colors"
                        title="Auto-suggest next available chapter number"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Next #</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Decrement Stepper */}
                      <button
                        type="button"
                        onClick={handleDecrementChapter}
                        className="h-10 w-9 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center font-mono transition-all cursor-pointer shrink-0"
                        title="Decrease chapter number"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      {/* Number Input */}
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={chapterNumber}
                        onChange={(e) => {
                          setChapterNumber(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="1"
                        className="w-full h-10 px-2 text-center rounded-xl border border-white/[0.12] bg-[#0E121B]/90 font-mono text-sm font-bold text-[#F8FAFC] placeholder-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 outline-none transition-all"
                      />

                      {/* Increment Stepper */}
                      <button
                        type="button"
                        onClick={handleIncrementChapter}
                        className="h-10 w-9 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center font-mono transition-all cursor-pointer shrink-0"
                        title="Increase chapter number"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chapter / Topic Name Column (8 cols on sm+) */}
                  <div className="sm:col-span-8 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5 text-[#10B981]" />
                        <span>Chapter / Topic Name</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setTopicName(`Topic ${chapterNumber || '1'}`)}
                        className="text-[10px] font-mono text-[#94A3B8] hover:text-[#38BDF8] cursor-pointer transition-colors"
                      >
                        Reset Default
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder={`Topic ${chapterNumber || '1'}`}
                        className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-white/[0.12] bg-[#0E121B]/90 font-mono text-xs sm:text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50 outline-none transition-all"
                      />
                      {topicName && (
                        <button
                          type="button"
                          onClick={() => setTopicName('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-xs text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
                          title="Clear field"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                {duplicateWarning ? (
                  <div className="text-[11px] font-mono text-rose-400 flex items-center gap-1.5 pt-0.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{duplicateWarning}</span>
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-[#10B981] flex items-center gap-1.5 pt-0.5">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Chapter {chapterNumber || '1'} is available</span>
                  </div>
                )}
              </div>

              {/* ── 3. ACTIONS ROW (COMPACT SKIP & CLEAR SIDE-BY-SIDE) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Skip / Unskip Card */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                      <SkipForward className="h-3.5 w-3.5 text-amber-400" />
                      <span>Skip Status</span>
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isSkipped 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                        : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                    }`}>
                      {isSkipped ? 'SKIPPED' : 'ACTIVE'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSkip}
                    className={`w-full h-10 px-3 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      isSkipped
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-white/[0.04] border-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.2]'
                    }`}
                  >
                    {isSkipped ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Unskip Chapter</span>
                      </>
                    ) : (
                      <>
                        <SkipForward className="h-3.5 w-3.5 text-amber-400" />
                        <span>Skip Chapter</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Clear Slot Card */}
                <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span>Clear Slot</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      DELETE
                    </span>
                  </div>

                  {!isConfirmingClear ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(true)}
                      className="w-full h-10 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear Chapter Slot</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 h-10">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        className="flex-1 h-full rounded-xl border border-white/[0.1] text-xs font-mono text-[#94A3B8] hover:text-white cursor-pointer transition-colors"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmClearSlot}
                        className="flex-1 h-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold cursor-pointer shadow-[0_0_10px_rgba(225,29,72,0.4)] transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── MODAL FOOTER (SAVE & CANCEL) ── */}
            <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0E121B]/95 backdrop-blur-md flex items-center justify-between gap-3 relative z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || Boolean(duplicateWarning)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shadow-lg ${
                    duplicateWarning || isSaving
                      ? 'bg-gray-700/50 border border-gray-600/30 text-gray-400 cursor-not-allowed'
                      : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-[#818CF8]/40 hover:scale-[1.02]'
                  }`}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
