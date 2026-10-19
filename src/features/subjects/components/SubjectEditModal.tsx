/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  BookOpen, 
  Layers, 
  GitBranch, 
  AlertTriangle, 
  Sparkles 
} from 'lucide-react';
import { Subject, Track, Program } from '../../../types/academic';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { usePace } from '../../pace/context/PaceContext';

interface SubjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  currentTrack?: Track;
  currentProgram?: Program;
}

export const SubjectEditModal: React.FC<SubjectEditModalProps> = ({
  isOpen,
  onClose,
  subject,
  currentTrack,
  currentProgram,
}) => {
  const { 
    tracks, 
    programs, 
    chapters, 
    updateSubject 
  } = useAcademicHierarchy();

  const { goals, updateGoal } = usePace();

  // Form states
  const [name, setName] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync form states on open or subject change
  useEffect(() => {
    if (isOpen && subject) {
      setName(subject.name || '');
      setSelectedTrackId(subject.trackId || currentTrack?.id || '');
      setSelectedProgramId(subject.programId || currentProgram?.id || '');
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [isOpen, subject, currentTrack, currentProgram]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
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

  // Available programs filtered by the selected track
  const availablePrograms = useMemo(() => {
    if (!selectedTrackId) return [];
    return programs.filter(p => p.trackId === selectedTrackId);
  }, [programs, selectedTrackId]);

  // Handle track change - auto switch program if needed
  const handleTrackChange = (newTrackId: string) => {
    setSelectedTrackId(newTrackId);
    setErrorMsg(null);
    const validPrograms = programs.filter(p => p.trackId === newTrackId);
    if (!validPrograms.some(p => p.id === selectedProgramId)) {
      setSelectedProgramId(validPrograms.length > 0 ? validPrograms[0].id : '');
    }
  };

  // Associated chapters count for this subject
  const subjectChaptersCount = useMemo(() => {
    return chapters.filter(c => c.subjectId === subject.id).length;
  }, [chapters, subject.id]);

  // Dynamic names for breadcrumb preview: Track > Program > Subject > X ch
  const currentTrackName = useMemo(() => {
    return tracks.find(t => t.id === selectedTrackId)?.name || currentTrack?.name || 'Track';
  }, [tracks, selectedTrackId, currentTrack]);

  const currentProgramName = useMemo(() => {
    return programs.find(p => p.id === selectedProgramId)?.name || currentProgram?.name || 'Program';
  }, [programs, selectedProgramId, currentProgram]);

  const currentSubjectName = name.trim() || subject.name;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Subject name cannot be empty.');
      return;
    }
    if (!selectedTrackId) {
      setErrorMsg('Please select a valid academic track.');
      return;
    }
    if (!selectedProgramId) {
      setErrorMsg('Please select a valid program/semester.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const result = updateSubject(subject.id, {
      name: trimmed,
      trackId: selectedTrackId,
      programId: selectedProgramId,
      priority: subject.priority,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Failed to update subject.');
      setIsSaving(false);
      return;
    }

    // Also sync subject pace goals if any match this subject ID
    const matchingGoal = goals.find(g => g.subjects?.includes(subject.id));
    if (matchingGoal && matchingGoal.target === subject.name) {
      updateGoal(matchingGoal.id, {
        target: trimmed,
      });
    }

    setIsSaving(false);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && subject && (
        <motion.div
          key="subject-edit-modal-backdrop"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-mono"
          onClick={onClose}
        >
          {/* ── MODAL CONTAINER (GLASSMORPHIC X-29 THEME) ── */}
          <motion.div
            key="subject-edit-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0E121B]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glows */}
            <div 
              className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-[#6366F1]/15 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />

            {/* ── MODAL HEADER ── */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0E121B]/95 backdrop-blur-md flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8] shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-mono text-base font-bold tracking-tight text-[#F8FAFC]">
                    Edit Subject
                  </h2>
                  <p className="text-xs font-mono text-[#94A3B8] mt-0.5">
                    Configure subject title, parent track, and program
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

            {/* ── MODAL BODY (FORM) ── */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)] relative z-10 custom-scrollbar">
              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* 1. Subject Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#818CF8]" />
                  Subject Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. Elective Module, Advanced Calculus"
                  required
                  className="w-full bg-[#090D16] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono placeholder:text-white/20 focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all"
                />
              </div>

              {/* 2. Track & Program Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Track Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-[#6366F1]" />
                    Track
                  </label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => handleTrackChange(e.target.value)}
                    className="w-full bg-[#090D16] border border-white/[0.12] rounded-xl px-3 py-2.5 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none cursor-pointer"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#0E121B] text-[#F8FAFC]">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Program
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => {
                      setSelectedProgramId(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={availablePrograms.length === 0}
                    className="w-full bg-[#090D16] border border-white/[0.12] rounded-xl px-3 py-2.5 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none cursor-pointer disabled:opacity-50"
                  >
                    {availablePrograms.length === 0 ? (
                      <option value="" className="bg-[#0E121B] text-[#94A3B8]">
                        No Programs in Track
                      </option>
                    ) : (
                      availablePrograms.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0E121B] text-[#F8FAFC]">
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* 3. Hierarchy Summary: CA > CL > Accounting > 17 ch */}
              <div className="p-3 px-3.5 rounded-xl border border-white/[0.08] bg-[#070A12]/60 font-mono text-xs text-[#94A3B8] flex items-center gap-1.5 flex-wrap">
                <span className="text-[#6366F1] font-semibold">{currentTrackName}</span>
                <span className="text-white/30">&gt;</span>
                <span className="text-[#38BDF8] font-semibold">{currentProgramName}</span>
                <span className="text-white/30">&gt;</span>
                <span className="text-[#F8FAFC] font-semibold">{currentSubjectName}</span>
                <span className="text-white/30">&gt;</span>
                <span className="text-[#10B981] font-semibold">{subjectChaptersCount} ch</span>
              </div>

              {/* ── MODAL FOOTER ── */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-xs font-mono font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
