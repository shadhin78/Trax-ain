/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Check, Save, Layers, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { PaceGoal } from '../../types';
import { usePace } from '../../context/PaceContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { formatDisplayDate } from '../../utils/paceCalculations';

interface PaceEditGoalModalProps {
  goal: PaceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaceEditGoalModal: React.FC<PaceEditGoalModalProps> = ({
  goal,
  isOpen,
  onClose,
}) => {
  const { updateGoal, goals } = usePace();
  const { programs, subjects, chapters } = useAcademicHierarchy();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [selectedSecondaryPaceIds, setSelectedSecondaryPaceIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (goal) {
      setName(goal.target || '');
      setStartDate(goal.startDate || '');
      setDeadline(goal.deadline || '');
      setSelectedSubjectIds(new Set(goal.subjects || []));
      setSelectedProgramIds(new Set(goal.programs || []));
      setSelectedSecondaryPaceIds(new Set(goal.secondaryPaces || []));
    }
  }, [goal]);

  // Compute preview of targeted subjects in the modal
  const previewTargetedSubjectIds = useMemo(() => {
    const targeted = new Set<string>();

    if (goal?.type === 'global') {
      selectedSubjectIds.forEach((sId) => targeted.add(sId));
      if (selectedProgramIds.size > 0) {
        subjects.filter((s) => selectedProgramIds.has(s.programId)).forEach((s) => targeted.add(s.id));
      }
      if (selectedSecondaryPaceIds.size > 0) {
        selectedSecondaryPaceIds.forEach((secId) => {
          const secGoal = goals.find((g) => g.id === secId);
          if (secGoal) {
            if (secGoal.type === 'programs') {
              const secProgs = new Set(secGoal.programs || []);
              subjects.filter((s) => secProgs.has(s.programId)).forEach((s) => targeted.add(s.id));
            } else if (secGoal.subjects) {
              secGoal.subjects.forEach((sId) => targeted.add(sId));
            }
          }
        });
      }
    } else if (goal?.type === 'programs') {
      subjects.filter((s) => selectedProgramIds.has(s.programId)).forEach((s) => targeted.add(s.id));
    } else {
      selectedSubjectIds.forEach((sId) => targeted.add(sId));
    }

    return targeted;
  }, [goal, selectedSubjectIds, selectedProgramIds, selectedSecondaryPaceIds, subjects, goals]);

  const previewTotalChapters = useMemo(() => {
    return chapters.filter(
      (c) => previewTargetedSubjectIds.has(c.subjectId) && !c.isSkipped && c.status !== 'skipped'
    ).length;
  }, [chapters, previewTargetedSubjectIds]);

  const previewCompletedChapters = useMemo(() => {
    return chapters.filter(
      (c) => previewTargetedSubjectIds.has(c.subjectId) && !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')
    ).length;
  }, [chapters, previewTargetedSubjectIds]);

  // Group subjects by Program for program-wise 2-column distribution
  const programGroupedSubjects = useMemo(() => {
    const knownProgramIds = new Set(programs.map((p) => p.id));
    const groups = programs
      .map((prog) => {
        const progSubs = subjects.filter((s) => s.programId === prog.id);
        return {
          ...prog,
          subjectsList: progSubs,
        };
      })
      .filter((prog) => prog.subjectsList.length > 0);

    const orphanSubjects = subjects.filter((s) => !knownProgramIds.has(s.programId));
    if (orphanSubjects.length > 0) {
      groups.push({
        id: 'orphan_group',
        name: 'Other Subjects',
        subjectsList: orphanSubjects,
      } as any);
    }

    return groups;
  }, [programs, subjects]);

  if (!isOpen || !goal || typeof document === 'undefined') return null;

  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      return next;
    });
  };

  const handleToggleProgram = (progId: string) => {
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(progId)) {
        next.delete(progId);
      } else {
        next.add(progId);
      }
      return next;
    });
  };

  const handleToggleSecondaryPace = (secId: string) => {
    setSelectedSecondaryPaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) {
        next.delete(secId);
      } else {
        next.add(secId);
      }
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.type !== 'global' && !name.trim()) return;
    if (!startDate || !deadline) return;

    updateGoal(goal.id, {
      target: goal.type === 'global' ? '' : name.trim(),
      startDate,
      deadline,
      subjects: selectedSubjectIds.size > 0 ? Array.from(selectedSubjectIds) : [],
      programs: (goal.type === 'programs' || goal.type === 'global')
        ? Array.from(selectedProgramIds)
        : [],
      secondaryPaces: goal.type === 'global'
        ? Array.from(selectedSecondaryPaceIds)
        : [],
    });

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
          w-full max-w-2xl rounded-3xl border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl p-5 sm:p-6
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden font-mono relative
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient legacy background glow orbs */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#F8FAFC] font-mono">
                {goal.type === 'global' ? 'Edit Global Baseline & Pace' : 'Edit Pace Goal'}
              </h3>
              <p className="font-mono text-xs text-[#94A3B8] mt-0.5">
                {goal.type === 'global'
                  ? 'Update timeline dates, link programs, subjects, or secondary paces'
                  : 'Update timeline target name, dates, or included items'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Goal Name (Omitted for Global Pace) */}
          {goal.type !== 'global' ? (
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                GOAL NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0E121B] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none"
                required
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8] font-mono text-xs">
              <span className="font-bold">Global Pace Scope:</span> No custom title. Changes to dates will automatically update the Global Baseline.
            </div>
          )}

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                START DATE
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0E121B] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none cursor-pointer"
                required
              />
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                {startDate ? formatDisplayDate(startDate) : 'DD - Month - YYYY'}
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                DEADLINE
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#0E121B] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] outline-none cursor-pointer"
                required
              />
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                {deadline ? formatDisplayDate(deadline) : 'DD - Month - YYYY'}
              </span>
            </div>
          </div>

          {/* Live Progress Preview Bar */}
          <div className="p-3 rounded-2xl bg-[#0E121B] border border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              <span className="block font-mono text-[9px] font-black uppercase text-[#94A3B8]">
                EFFECTIVE WORKLOAD
              </span>
              <span className="font-mono text-xs font-bold text-[#F8FAFC]">
                {previewTargetedSubjectIds.size} {previewTargetedSubjectIds.size === 1 ? 'Subject' : 'Subjects'} Included
              </span>
            </div>
            <div className="text-right">
              <span className="block font-mono text-[9px] font-black uppercase text-[#94A3B8]">
                CHAPTER PROGRESS
              </span>
              <span className="font-mono text-xs font-bold text-[#10B981]">
                {previewCompletedChapters} / {previewTotalChapters} Ch
              </span>
            </div>
          </div>

          {/* ── PROGRAM SELECTION (For Program Goals or Global Goals) ── */}
          {(goal.type === 'programs' || goal.type === 'global') && (
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#F97316]">
                  {goal.type === 'global' ? 'PROGRAMS (OPTIONAL — INCLUDES ALL SUBJECTS IN PROGRAM)' : 'INCLUDED PROGRAMS'}{' '}
                  ({selectedProgramIds.size} Selected):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProgramIds.size === programs.length) {
                      setSelectedProgramIds(new Set());
                    } else {
                      setSelectedProgramIds(new Set(programs.map((p) => p.id)));
                    }
                  }}
                  className="text-[10px] font-mono text-[#F97316] hover:underline cursor-pointer"
                >
                  {selectedProgramIds.size === programs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-white/[0.08] rounded-2xl p-2 bg-[#070A11]/60">
                {programs.map((prog) => {
                  const isChecked = selectedProgramIds.has(prog.id);
                  const progSubs = subjects.filter((s) => s.programId === prog.id);
                  return (
                    <label
                      key={prog.id}
                      className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer select-none ${
                        isChecked
                          ? 'bg-[#F97316]/10 border border-[#F97316]/40 text-[#F8FAFC]'
                          : 'hover:bg-white/[0.04] text-[#94A3B8] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProgram(prog.id)}
                          className="rounded border-white/20 bg-white/10 text-[#F97316] focus:ring-0"
                        />
                        <span className="font-mono text-xs font-bold truncate text-[#F8FAFC]">
                          {prog.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-[#94A3B8] shrink-0">
                        {progSubs.length} subs
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUBJECT SELECTION (For Bundle Goals or Global Goals) ── */}
          {goal.type !== 'programs' && (
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#38BDF8]">
                  {goal.type === 'global' ? 'SPECIFIC SUBJECTS (OPTIONAL — SELECT INDIVIDUAL SUBJECTS)' : 'INCLUDED SUBJECTS'}{' '}
                  ({selectedSubjectIds.size} Selected):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSubjectIds.size === subjects.length) {
                      setSelectedSubjectIds(new Set());
                    } else {
                      setSelectedSubjectIds(new Set(subjects.map((s) => s.id)));
                    }
                  }}
                  className="text-[10px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
                >
                  {selectedSubjectIds.size === subjects.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-60 sm:max-h-72 overflow-y-auto border border-white/[0.08] rounded-2xl p-2.5 sm:p-3 space-y-3 bg-[#070A11]/60 pr-1.5">
                {programGroupedSubjects.length === 0 ? (
                  <div className="py-4 text-center font-mono text-xs text-[#94A3B8]">
                    No subjects available in curriculum.
                  </div>
                ) : (
                  programGroupedSubjects.map((prog) => {
                    const progSubIds = prog.subjectsList.map((s) => s.id);
                    const allProgSelected = progSubIds.every((id) => selectedSubjectIds.has(id));

                    return (
                      <div key={prog.id} className="space-y-1.5">
                        {/* Program Group Header */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#F8FAFC] tracking-wide">
                              {prog.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                              {prog.subjectsList.length} {prog.subjectsList.length === 1 ? 'SUB' : 'SUBS'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubjectIds((prev) => {
                                const next = new Set(prev);
                                if (allProgSelected) {
                                  progSubIds.forEach((id) => next.delete(id));
                                } else {
                                  progSubIds.forEach((id) => next.add(id));
                                }
                                return next;
                              });
                            }}
                            className="text-[9px] font-mono text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors cursor-pointer"
                          >
                            {allProgSelected ? 'Deselect Program' : 'Select Program'}
                          </button>
                        </div>

                        {/* 2-Column Grid of Subjects */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {prog.subjectsList.map((sub) => {
                            const isChecked = selectedSubjectIds.has(sub.id);
                            const isIncludedViaProgram = selectedProgramIds.has(sub.programId);

                            return (
                              <label
                                key={sub.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-[#38BDF8]/15 border-[#38BDF8]/50 text-[#F8FAFC] shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                                    : isIncludedViaProgram
                                    ? 'bg-white/[0.03] border-white/[0.12] text-[#38BDF8]'
                                    : 'bg-[#0E121B]/60 hover:bg-white/[0.04] border-white/[0.08] text-[#94A3B8]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSubject(sub.id)}
                                    className="rounded border-white/20 bg-white/10 text-[#38BDF8] focus:ring-0 shrink-0"
                                  />
                                  <span className="font-mono text-xs font-bold text-[#F8FAFC] truncate">
                                    {sub.name}
                                  </span>
                                </div>
                                {isIncludedViaProgram && (
                                  <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 shrink-0 ml-1">
                                    via prog
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SECONDARY PACE (FOR GLOBAL PACE) ── */}
          {goal.type === 'global' && (
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#818CF8]">
                  SECONDARY PACE (LINK OTHER TARGETS) ({selectedSecondaryPaceIds.size} Linked)
                </label>
                <span className="text-[10px] text-[#94A3B8]">Optionally link into Global Pace</span>
              </div>

              {goals.filter((g) => g.id !== goal.id).length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center font-mono text-xs text-[#94A3B8]">
                  No other custom pace targets available to link as secondary pace.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-white/[0.08] rounded-2xl p-2.5 space-y-1 bg-[#070A11]/60">
                  {goals
                    .filter((g) => g.id !== goal.id)
                    .map((secGoal) => {
                      const isChecked = selectedSecondaryPaceIds.has(secGoal.id);
                      return (
                        <label
                          key={secGoal.id}
                          className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer select-none ${
                            isChecked ? 'bg-[#818CF8]/10 text-[#F8FAFC]' : 'hover:bg-white/[0.04] text-[#94A3B8]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSecondaryPace(secGoal.id)}
                              className="rounded border-white/20 bg-white/10 text-[#818CF8] focus:ring-0"
                            />
                            <span className="font-mono text-xs text-[#F8FAFC] truncate">
                              {secGoal.target || (secGoal.type === 'programs' ? 'Program Goal' : 'Bundle Goal')}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/30 shrink-0">
                            {secGoal.type === 'programs' ? 'PROGRAM' : 'BUNDLE'}
                          </span>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5 relative z-10">
            <button
              type="button"
              onClick={initiateClose}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono font-bold text-[#94A3B8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-xs font-mono font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
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

