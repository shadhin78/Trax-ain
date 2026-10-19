/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Check, 
  Calendar, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { usePace } from '../context/PaceContext';
import { PaceBundleType, PaceGoalScopeType } from '../types';
import { toIsoDateString, formatDisplayDate } from '../utils/paceCalculations';

export const CreatePaceTargetForm: React.FC = React.memo(() => {
  const { programs, subjects, chapters } = useAcademicHierarchy();
  const { addGoal, goals, globalBaseline } = usePace();

  // Form states
  const [bundleType, setBundleType] = useState<PaceBundleType>('subjects');
  const [goalName, setGoalName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');

  // Check if a global pace already exists (only 1 global pace allowed on site)
  const hasExistingGlobalPace = useMemo(() => {
    return goals.some((g) => g.type === 'global');
  }, [goals]);

  // Lock bundleType away from 'global' if a global pace already exists
  useEffect(() => {
    if (hasExistingGlobalPace && bundleType === 'global') {
      setBundleType('subjects');
    }
  }, [hasExistingGlobalPace, bundleType]);

  // Available secondary paces to link into Global Pace (all other non-global goals)
  const availableSecondaryPaces = useMemo(() => {
    return goals.filter((g) => g.type !== 'global' && !g.id.startsWith('goal_subject_') && !g.id.startsWith('subject_pace_'));
  }, [goals]);

  // Selected secondary pace IDs
  const [selectedSecondaryPaceIds, setSelectedSecondaryPaceIds] = useState<Set<string>>(new Set());

  const toggleSecondaryPaceSelect = (secId: string) => {
    setSelectedSecondaryPaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  // Clear title only when bundleType is global; do NOT preset dates
  useEffect(() => {
    if (bundleType === 'global') {
      setGoalName('');
    }
  }, [bundleType]);

  // Selected subjects and programs
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [expandedProgramIds, setExpandedProgramIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form validity:
  // - Global pace can be set without selecting any program and chapter (valid as soon as dates are filled)
  // - Other paces (subjects or programs) must have at least 1 item selected below to activate button
  const isFormValid = useMemo(() => {
    if (!startDate || !deadline) return false;
    if (new Date(startDate) > new Date(deadline)) return false;

    if (bundleType === 'global') {
      return !hasExistingGlobalPace;
    }

    if (!goalName.trim()) return false;

    if (bundleType === 'subjects') {
      return selectedSubjectIds.size > 0;
    }

    if (bundleType === 'programs') {
      return selectedProgramIds.size > 0;
    }

    return false;
  }, [
    bundleType,
    goalName,
    startDate,
    deadline,
    selectedSubjectIds.size,
    selectedProgramIds.size,
    hasExistingGlobalPace,
  ]);

  const validationHint = useMemo(() => {
    if (bundleType === 'global') {
      if (hasExistingGlobalPace) {
        return 'Global Pace is already active on this site. Use Edit on the card below to modify.';
      }
      if (!startDate || !deadline) {
        return 'Select Start Date and Deadline above to activate Create button';
      }
      if (new Date(startDate) > new Date(deadline)) {
        return 'Deadline must be after Start Date';
      }
      return null;
    }

    if (!startDate || !deadline) {
      return 'Select Start Date and Deadline above';
    }
    if (new Date(startDate) > new Date(deadline)) {
      return 'Deadline must be after Start Date';
    }
    if (!goalName.trim()) {
      return 'Enter a Goal Name above';
    }
    if (bundleType === 'subjects' && selectedSubjectIds.size === 0) {
      return 'Select at least 1 subject below to activate create button';
    }
    if (bundleType === 'programs' && selectedProgramIds.size === 0) {
      return 'Select at least 1 program below to activate create button';
    }
    return null;
  }, [
    bundleType,
    hasExistingGlobalPace,
    startDate,
    deadline,
    goalName,
    selectedSubjectIds.size,
    selectedProgramIds.size,
  ]);

  // Group subjects by Program and compute subject completion stats
  const programData = useMemo(() => {
    return programs.map((prog) => {
      const progSubjects = subjects.filter((s) => s.programId === prog.id);
      const subjectItems = progSubjects.map((sub) => {
        const subChapters = chapters.filter((c) => c.subjectId === sub.id && !c.isSkipped && c.status !== 'skipped');
        const totalCh = subChapters.length;
        const compCh = subChapters.filter((c) => c.completed || c.status === 'completed').length;
        const isPassed = totalCh > 0 && compCh >= totalCh;
        return {
          ...sub,
          totalChapters: totalCh,
          completedChapters: compCh,
          isPassed,
        };
      });

      return {
        ...prog,
        subjectsList: subjectItems,
        subjectCount: subjectItems.length,
      };
    });
  }, [programs, subjects, chapters]);

  // Toggle program accordion expand/collapse
  const toggleExpandProgram = (progId: string) => {
    setExpandedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(progId)) {
        next.delete(progId);
      } else {
        next.add(progId);
      }
      return next;
    });
  };

  // Toggle subject selection (passed subjects cannot be selected)
  const toggleSubjectSelect = (sub: { id: string; isPassed: boolean; name: string }) => {
    if (sub.isPassed) return;
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(sub.id)) {
        next.delete(sub.id);
      } else {
        next.add(sub.id);
      }
      return next;
    });
  };

  // Toggle program checkbox
  const toggleProgramSelect = (progId: string) => {
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

  // Handle Form Submission
  const handleCreateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let trimmedName = goalName.trim();
    if (bundleType === 'global') {
      trimmedName = ''; // Global pace does not have title
    } else if (!trimmedName) {
      setErrorMsg('Please specify a Goal Name (e.g. "Phase 1 Year Target").');
      return;
    }

    if (!startDate || !deadline) {
      setErrorMsg('Please select valid Start Date and Deadline dates.');
      return;
    }

    if (new Date(startDate) > new Date(deadline)) {
      setErrorMsg('Deadline date must be after Start Date.');
      return;
    }

    let targetScope: PaceGoalScopeType = 'bundle';
    let finalSubjects: string[] = [];
    let finalPrograms: string[] = [];

    if (bundleType === 'subjects') {
      targetScope = 'bundle';
      if (selectedSubjectIds.size === 0) {
        setErrorMsg('Please select at least one subject to include in this bundle.');
        return;
      }
      finalSubjects = Array.from(selectedSubjectIds);
    } else if (bundleType === 'programs') {
      targetScope = 'programs';
      if (selectedProgramIds.size === 0) {
        setErrorMsg('Please select at least one program to include.');
        return;
      }
      finalPrograms = Array.from(selectedProgramIds);
    } else if (bundleType === 'global') {
      if (hasExistingGlobalPace) {
        setErrorMsg('Only 1 Global Pace can exist on this site. To make changes, use the Edit button on the Global Pace card below.');
        return;
      }
      targetScope = 'global';
      if (selectedSubjectIds.size > 0) {
        finalSubjects = Array.from(selectedSubjectIds);
      }
      if (selectedProgramIds.size > 0) {
        finalPrograms = Array.from(selectedProgramIds);
      }
    }

    addGoal({
      type: targetScope,
      target: trimmedName,
      startDate,
      deadline,
      subjects: finalSubjects,
      programs: finalPrograms,
      secondaryPaces: bundleType === 'global' && selectedSecondaryPaceIds.size > 0
        ? Array.from(selectedSecondaryPaceIds)
        : [],
    });

    setSuccessMsg(
      bundleType === 'global'
        ? 'Global pace target created & synced with Global Baseline!'
        : `Pace target "${trimmedName}" created successfully!`
    );
    setGoalName('');
    setStartDate('');
    setDeadline('');
    setSelectedSubjectIds(new Set());
    setSelectedProgramIds(new Set());
    setSelectedSecondaryPaceIds(new Set());

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div 
      id="create-pace-target-card"
      className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300 font-mono"
    >
      {/* Background spatial neon glow */}
      <div 
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#F97316]/5 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* ── CARD HEADER ── */}
      <div className="flex items-center gap-3.5 pb-6 border-b border-white/[0.08]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 shadow-[0_0_16px_rgba(249,115,22,0.2)]">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#F8FAFC] font-mono">
            Pace Management
          </h2>
          <p className="font-mono text-[10px] sm:text-xs text-[#94A3B8] uppercase tracking-wider mt-0.5">
            BUNDLE SUBJECTS OR PROGRAMS TOGETHER TO CREATE SPECIFIC TIMELINE GOALS
          </p>
        </div>
      </div>

      {/* ── FORM ── */}
      <form onSubmit={handleCreateTarget} className="mt-6 space-y-6">
        {/* Row 1: 4 Configuration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. BUNDLE TYPE */}
          <div className="space-y-1.5">
            <label 
              htmlFor="pace-bundle-type-select"
              className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
            >
              BUNDLE TYPE
            </label>
            <select
              id="pace-bundle-type-select"
              value={bundleType}
              onChange={(e) => setBundleType(e.target.value as PaceBundleType)}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all cursor-pointer"
            >
              <option value="subjects" className="bg-[#0E121B] text-[#F8FAFC]">
                Specific Subjects (Across Programs)
              </option>
              <option value="programs" className="bg-[#0E121B] text-[#F8FAFC]">
                Programs
              </option>
              <option 
                value="global" 
                disabled={hasExistingGlobalPace}
                className={hasExistingGlobalPace ? "bg-[#0E121B] text-white/30" : "bg-[#0E121B] text-[#F8FAFC]"}
              >
                {hasExistingGlobalPace ? 'Global Overall Target (Locked — Already Created)' : 'Global Overall Target'}
              </option>
            </select>
            {hasExistingGlobalPace && (
              <p className="font-mono text-[9px] text-[#38BDF8] mt-1">
                Global Pace active (locked). Use Edit button on card to modify.
              </p>
            )}
          </div>

          {/* 2. GOAL NAME (Omitted for Global Pace) */}
          {bundleType !== 'global' ? (
            <div className="space-y-1.5">
              <label 
                htmlFor="pace-goal-name-input"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                GOAL NAME
              </label>
              <input
                type="text"
                id="pace-goal-name-input"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Phase 1 Year Target"
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] font-mono placeholder:text-white/30 focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label 
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                GOAL SCOPE
              </label>
              <div className="w-full bg-[#0E121B]/90 border border-white/[0.08] rounded-xl px-3.5 py-3 text-xs text-[#38BDF8] font-mono flex items-center justify-between select-none">
                <span className="font-bold">Global Pace</span>
                <span className="text-[10px] text-[#94A3B8]">(No custom title)</span>
              </div>
            </div>
          )}

          {/* 3. START DATE */}
          <div className="space-y-1.5">
            <label 
              htmlFor="pace-start-date-input"
              className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
            >
              START DATE
            </label>
            <input
              type="date"
              id="pace-start-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all cursor-pointer"
            />
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              {startDate ? formatDisplayDate(startDate) : 'DD - Month - YYYY'}
            </span>
          </div>

          {/* 4. DEADLINE */}
          <div className="space-y-1.5">
            <label 
              htmlFor="pace-deadline-input"
              className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
            >
              DEADLINE
            </label>
            <input
              type="date"
              id="pace-deadline-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all cursor-pointer"
            />
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              {deadline ? formatDisplayDate(deadline) : 'DD - Month - YYYY'}
            </span>
          </div>
        </div>

        {/* ── ROW 2: DYNAMIC SELECTION CHECKLIST ── */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
            <span className="font-mono text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
              {bundleType === 'global'
                ? 'PART 1: OPTIONAL SUBJECT SELECTION (OR CONFIGURE LATER VIA EDIT)'
                : bundleType === 'programs'
                ? 'SELECT PROGRAMS TO INCLUDE (REQUIRED):'
                : 'SELECT SUBJECTS TO INCLUDE (REQUIRED, GROUPED BY PROGRAM):'}
            </span>
            {bundleType === 'subjects' && selectedSubjectIds.size > 0 && (
              <span className="font-mono text-[10px] text-[#F97316] font-bold">
                {selectedSubjectIds.size} Subjects Selected
              </span>
            )}
            {bundleType === 'programs' && selectedProgramIds.size > 0 && (
              <span className="font-mono text-[10px] text-[#F97316] font-bold">
                {selectedProgramIds.size} Programs Selected
              </span>
            )}
            {bundleType === 'global' && selectedSubjectIds.size > 0 && (
              <span className="font-mono text-[10px] text-[#38BDF8] font-bold">
                {selectedSubjectIds.size} Subjects Selected
              </span>
            )}
          </div>

          {/* Bundle Type: Specific Subjects (Grouped by Program) */}
          {(bundleType === 'subjects' || bundleType === 'global') && (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {programData.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-white/[0.1] text-center font-mono text-xs text-[#94A3B8]">
                  No programs or subjects found. Add subjects in Master Config first.
                </div>
              ) : (
                programData.map((prog) => {
                  const isExpanded = expandedProgramIds.has(prog.id);

                  return (
                    <div
                      key={prog.id}
                      className={`
                        rounded-2xl overflow-hidden transition-all duration-300
                        ${
                          isExpanded
                            ? 'border border-[#F97316]/50 bg-[#070A11]/50 shadow-[0_0_20px_rgba(249,115,22,0.12)]'
                            : 'border border-white/[0.08] bg-[#0E121B]/40 hover:border-white/[0.14]'
                        }
                      `}
                    >
                      {/* Program Accordion Bar */}
                      <button
                        type="button"
                        onClick={() => toggleExpandProgram(prog.id)}
                        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#F97316] shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#94A3B8] shrink-0" />
                          )}
                          <span className="font-mono text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wide">
                            {prog.name}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 shrink-0">
                            {prog.subjectCount} {prog.subjectCount === 1 ? 'SUB' : 'SUBS'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                          </span>
                        </div>
                      </button>

                      {/* Accordion Content: 2-Column Grid of Subject Cards */}
                      {isExpanded && (
                        <div className="p-3.5 sm:p-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-3 bg-transparent">
                          {prog.subjectsList.length === 0 ? (
                            <div className="col-span-full py-2 text-center font-mono text-xs text-[#94A3B8]">
                              No subjects in this program.
                            </div>
                          ) : (
                            prog.subjectsList.map((sub) => {
                              const isChecked = selectedSubjectIds.has(sub.id);
                              const isPassed = sub.isPassed;

                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => toggleSubjectSelect(sub)}
                                  className={`
                                    flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none relative group
                                    ${
                                      isPassed
                                        ? 'bg-[#0E121B]/30 border-white/[0.06] opacity-60 cursor-not-allowed'
                                        : isChecked
                                        ? 'bg-[#F97316]/5 border-[#F97316] shadow-[0_0_15px_rgba(249,115,22,0.18)] cursor-pointer'
                                        : 'bg-[#0E121B]/60 hover:bg-[#0E121B]/90 border-white/[0.08] hover:border-white/[0.18] cursor-pointer'
                                    }
                                  `}
                                >
                                  {/* Passed Hover Tooltip */}
                                  {isPassed && (
                                    <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 whitespace-nowrap px-3 py-1 rounded-xl bg-[#0B0F19] border border-white/20 shadow-2xl text-[10px] font-mono text-[#F8FAFC]">
                                      {sub.name} (Passed - cannot be added to pace)
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 flex items-center justify-center">
                                      {isPassed ? (
                                        <div className="h-4 w-4 rounded border border-white/20 bg-white/5 opacity-50" />
                                      ) : isChecked ? (
                                        <div className="h-4 w-4 rounded bg-[#F97316] border border-[#F97316] flex items-center justify-center text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                                          <Check className="h-3 w-3 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="h-4 w-4 rounded border border-white/25 bg-white/5 group-hover:border-white/40 transition-colors" />
                                      )}
                                    </div>
                                    <span 
                                      className={`
                                        font-mono text-xs sm:text-sm font-bold truncate
                                        ${
                                          isPassed 
                                            ? 'text-[#94A3B8] line-through decoration-white/30' 
                                            : isChecked 
                                            ? 'text-[#F8FAFC]' 
                                            : 'text-[#F8FAFC]'
                                        }
                                      `}
                                    >
                                      {sub.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {isPassed && (
                                      <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                                        PASSED
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Bundle Type: Entire Programs */}
          {bundleType === 'programs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {programData.map((prog) => {
                const isChecked = selectedProgramIds.has(prog.id);
                const totalChaptersInProg = prog.subjectsList.reduce((acc, s) => acc + s.totalChapters, 0);

                return (
                  <div
                    key={prog.id}
                    onClick={() => toggleProgramSelect(prog.id)}
                    className={`
                      flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none
                      ${
                        isChecked
                          ? 'bg-[#F97316]/10 border-[#F97316] shadow-[0_0_16px_rgba(249,115,22,0.2)]'
                          : 'bg-[#0E121B]/60 hover:bg-[#0E121B]/90 border-white/[0.08] hover:border-white/[0.16]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        {isChecked ? (
                          <div className="h-4 w-4 rounded bg-[#F97316] border border-[#F97316] flex items-center justify-center text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded border border-white/25 bg-white/5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] block truncate">
                          {prog.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#94A3B8]">
                          {prog.subjectCount} Subjects • {totalChaptersInProg} Chapters
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PART 2: SECONDARY PACE (WHEN BUNDLE TYPE IS GLOBAL) ── */}
          {bundleType === 'global' && (
            <div className="space-y-3.5 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                <div>
                  <span className="font-mono text-[11px] font-black uppercase tracking-widest text-[#38BDF8] block">
                    PART 2: SECONDARY PACE (LINK OTHER PACE TARGETS)
                  </span>
                  <p className="font-mono text-[10px] text-[#94A3B8] mt-0.5">
                    Optionally link custom bundle or program pace targets as secondary paces to be included in this Global Pace
                  </p>
                </div>
                {selectedSecondaryPaceIds.size > 0 && (
                  <span className="font-mono text-[10px] text-[#38BDF8] font-bold shrink-0">
                    {selectedSecondaryPaceIds.size} Secondary {selectedSecondaryPaceIds.size === 1 ? 'Pace' : 'Paces'} Selected
                  </span>
                )}
              </div>

              {availableSecondaryPaces.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-white/[0.1] text-center font-mono text-xs text-[#94A3B8] bg-[#0E121B]/30">
                  No other pace targets created yet. You can create bundle or program pace targets first, or link them later via the Edit button on the Global Pace card.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSecondaryPaces.map((secGoal) => {
                    const isSelected = selectedSecondaryPaceIds.has(secGoal.id);
                    const secStart = formatDisplayDate(secGoal.startDate);
                    const secDeadline = formatDisplayDate(secGoal.deadline);

                    return (
                      <div
                        key={secGoal.id}
                        onClick={() => toggleSecondaryPaceSelect(secGoal.id)}
                        className={`
                          p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3
                          ${
                            isSelected
                              ? 'bg-[#38BDF8]/10 border-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.2)]'
                              : 'bg-[#0E121B]/60 hover:bg-[#0E121B]/90 border-white/[0.08] hover:border-white/[0.16]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="h-4 w-4 rounded bg-[#38BDF8] border border-[#38BDF8] flex items-center justify-center text-black shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded border border-white/25 bg-white/5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] block truncate">
                              {secGoal.target || (secGoal.type === 'programs' ? 'Program Goal' : 'Bundle Goal')}
                            </span>
                            <span className="font-mono text-[10px] text-[#94A3B8] block truncate">
                              {secStart} → {secDeadline}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/30 shrink-0">
                          {secGoal.type === 'programs' ? 'PROGRAM' : 'BUNDLE'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ERROR & SUCCESS ALERTS ── */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-mono text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── CREATE PACE TARGET BUTTON ── */}
        <div className="pt-2 space-y-2">
          {validationHint && (
            <div className="text-center font-mono text-[11px] text-[#94A3B8] flex items-center justify-center gap-1.5 select-none">
              <span className="text-[#F97316] text-[10px]">●</span>
              <span>{validationHint}</span>
            </div>
          )}
          <button
            type="submit"
            id="create-pace-target-submit-btn"
            disabled={!isFormValid}
            className={`w-full py-4 px-6 rounded-2xl font-mono text-sm sm:text-base font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
              isFormValid
                ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] active:scale-[0.99] text-white shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.6)] cursor-pointer'
                : 'bg-white/[0.04] border border-white/[0.08] text-white/30 cursor-not-allowed shadow-none'
            }`}
          >
            CREATE PACE TARGET
          </button>
        </div>
      </form>
    </div>
  );
});

CreatePaceTargetForm.displayName = 'CreatePaceTargetForm';
