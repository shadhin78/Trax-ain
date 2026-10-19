/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Check, 
  Layers, 
  Plus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Target, 
  X, 
  AlertCircle,
  FileText,
  Filter,
  GraduationCap,
  Star,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { 
  useAcademicHierarchy, 
  sortChaptersNumerically, 
  getChapterTopicDisplay 
} from '../../../context/AcademicHierarchyContext';
import { useDailyActions } from '../context/DailyActionsContext';
import { Subject, Program, Chapter } from '../../../types/academic';
import { getMonthWeeksByMonthKey, MonthWeekOption } from '../utils/weekUtils';

interface MonthlyTargetChaptersSectionProps {
  onTargetCreated?: (targetTitle: string) => void;
  onViewChecklist?: () => void;
}

export const MonthlyTargetChaptersSection: React.FC<MonthlyTargetChaptersSectionProps> = ({
  onTargetCreated,
  onViewChecklist
}) => {
  const { programs, subjects, chapters } = useAcademicHierarchy();
  const { 
    selectedMonthKey, 
    addMonthlyTarget, 
    allocateMonthlyAndWeeklyBatch,
    currentMonthTargets,
    weeklyTargets,
    bindChapterToWeek,
    unbindChapterFromWeek
  } = useDailyActions();

  // Saturday-to-Friday week slices clipped to this month
  const currentMonthWeeks = useMemo(() => {
    return getMonthWeeksByMonthKey(selectedMonthKey);
  }, [selectedMonthKey]);

  // Search & Filter state for Left Container (Hierarchy Tree)
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    programs.forEach(p => { init[p.id] = true; });
    return init;
  });

  // Selected subjects state (checkbox selection)
  // By default, select the first subject so the user immediately sees chapters on the right
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(() => {
    return subjects.length > 0 ? [subjects[0].id] : [];
  });

  // Search & Filter state for Right Container (Chapters List)
  const [chapterSearch, setChapterSearch] = useState('');
  
  // Selected chapters for allocation
  const [selectedChapterIdsForTarget, setSelectedChapterIdsForTarget] = useState<Set<string>>(() => new Set());

  // Batch assign week selection
  const [batchWeekKey, setBatchWeekKey] = useState<string>('');

  // Allocation mode: 'grouped' (single target with count) or 'individual' (1 target per chapter)
  const [allocationMode, setAllocationMode] = useState<'grouped' | 'individual'>('grouped');
  
  // Notification banner state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Map of chapter bindings from weeklyTargets
  const chapterBindings = useMemo(() => {
    const map: Record<string, { weekKey: string; targetId: string; size?: string }> = {};
    weeklyTargets.forEach(t => {
      if (t.chapterId) {
        map[t.chapterId] = {
          weekKey: t.weekKey,
          targetId: t.id,
          size: t.size
        };
      }
    });
    return map;
  }, [weeklyTargets]);

  // Toggle Program Expansion
  const toggleProgram = (progId: string) => {
    setExpandedPrograms(prev => ({
      ...prev,
      [progId]: !prev[progId]
    }));
  };

  const expandAllPrograms = () => {
    const next: Record<string, boolean> = {};
    programs.forEach(p => { next[p.id] = true; });
    setExpandedPrograms(next);
  };

  const collapseAllPrograms = () => {
    setExpandedPrograms({});
  };

  // Toggle Subject Checkbox
  const toggleSubjectCheckbox = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  // Select all subjects
  const selectAllSubjects = () => {
    setSelectedSubjectIds(subjects.map(s => s.id));
  };

  // Clear subject selection
  const clearSubjectSelection = () => {
    setSelectedSubjectIds([]);
    setSelectedChapterIdsForTarget(new Set());
  };

  // Select all subjects belonging to a specific program
  const toggleProgramSubjects = (progId: string) => {
    const progSubjIds = subjects.filter(s => s.programId === progId).map(s => s.id);
    const allSelected = progSubjIds.every(id => selectedSubjectIds.includes(id));
    if (allSelected) {
      setSelectedSubjectIds(prev => prev.filter(id => !progSubjIds.includes(id)));
    } else {
      setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...progSubjIds])));
    }
  };

  // Filtered Programs & Subjects based on hierarchy search
  const filteredPrograms = useMemo(() => {
    const q = hierarchySearch.trim().toLowerCase();
    if (!q) return programs;

    return programs.filter(prog => {
      if (prog.name.toLowerCase().includes(q)) return true;
      const progSubjs = subjects.filter(s => s.programId === prog.id);
      return progSubjs.some(s => s.name.toLowerCase().includes(q));
    });
  }, [programs, subjects, hierarchySearch]);

  // Selected subjects objects
  const selectedSubjectsList = useMemo(() => {
    return subjects.filter(s => selectedSubjectIds.includes(s.id));
  }, [subjects, selectedSubjectIds]);

  // Chapters belonging to selected subjects
  const chaptersOfSelectedSubjects = useMemo(() => {
    if (selectedSubjectIds.length === 0) return [];
    const filtered = chapters.filter(chap => selectedSubjectIds.includes(chap.subjectId));
    return sortChaptersNumerically(filtered);
  }, [chapters, selectedSubjectIds]);

  // Filtered chapters for right container
  const displayedChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return chaptersOfSelectedSubjects;

    return chaptersOfSelectedSubjects.filter(chap => {
      const displayTopic = getChapterTopicDisplay(chap).toLowerCase();
      const chNum = String(chap.chapterNumber || '').toLowerCase();
      return displayTopic.includes(q) || chNum.includes(q) || `ch ${chNum}`.includes(q);
    });
  }, [chaptersOfSelectedSubjects, chapterSearch]);

  // Check if a chapter is already allocated to current month
  const isChapterAlreadyTargeted = (chap: Chapter) => {
    const displayTopic = getChapterTopicDisplay(chap);
    const subj = subjects.find(s => s.id === chap.subjectId);
    return currentMonthTargets.some(target => {
      if (target.monthKey !== selectedMonthKey) return false;
      const tLower = target.title.toLowerCase();
      if (tLower.includes(displayTopic.toLowerCase())) return true;
      if (subj && tLower.includes(subj.name.toLowerCase()) && tLower.includes(`ch ${chap.chapterNumber}`)) return true;
      return false;
    });
  };

  // Toggle chapter selection for target allocation
  const toggleChapterForTarget = (chapterId: string) => {
    setSelectedChapterIdsForTarget(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // Select all displayed chapters
  const selectAllDisplayedChapters = () => {
    const next = new Set(selectedChapterIdsForTarget);
    displayedChapters.forEach(c => next.add(c.id));
    setSelectedChapterIdsForTarget(next);
  };

  // Deselect all chapters
  const deselectAllChapters = () => {
    setSelectedChapterIdsForTarget(new Set());
  };

  // Handle single chapter weekly dropdown change
  const handleChapterWeekChange = (chap: Chapter, subj: Subject, weekKey: string) => {
    const displayTopic = getChapterTopicDisplay(chap);

    if (!weekKey) {
      unbindChapterFromWeek(chap.id);
      setNotification({
        message: `Ch ${chap.chapterNumber} unassigned from weekly targets.`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    const matchedWeek = currentMonthWeeks.find(w => w.id === weekKey);
    bindChapterToWeek({
      chapterId: chap.id,
      weekKey,
      title: `${subj.name} Ch ${chap.chapterNumber}: ${displayTopic}`,
      track: subj.name,
      notes: `Month: ${selectedMonthKey} | ${matchedWeek?.shortLabel || weekKey}`
    });

    setNotification({
      message: `✓ Ch ${chap.chapterNumber} bound to ${matchedWeek?.shortLabel || 'Week'}! Sent to Weekly Targets section.`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 4500);
  };

  // Handle Batch Assign to Week
  const handleBatchAssignToWeek = () => {
    if (selectedChapterIdsForTarget.size === 0) {
      setNotification({
        message: 'Please check at least 1 chapter to bind to weekly targets.',
        type: 'error'
      });
      return;
    }

    if (!batchWeekKey) {
      setNotification({
        message: 'Please select a week from the dropdown to assign.',
        type: 'error'
      });
      return;
    }

    const targetedChapters = chapters.filter(c => selectedChapterIdsForTarget.has(c.id));
    const matchedWeek = currentMonthWeeks.find(w => w.id === batchWeekKey);

    targetedChapters.forEach(chap => {
      const subj = subjects.find(s => s.id === chap.subjectId);
      const subjName = subj?.name || 'Curriculum';
      const displayTopic = getChapterTopicDisplay(chap);

      bindChapterToWeek({
        chapterId: chap.id,
        weekKey: batchWeekKey,
        title: `${subjName} Ch ${chap.chapterNumber}: ${displayTopic}`,
        track: subjName,
        notes: `Month: ${selectedMonthKey} | ${matchedWeek?.shortLabel || batchWeekKey}`
      });
    });

    setNotification({
      message: `✓ Successfully bound ${targetedChapters.length} chapter(s) to ${matchedWeek?.shortLabel || 'Week'}! Added to Weekly Targets.`,
      type: 'success'
    });
    setSelectedChapterIdsForTarget(new Set());
    setTimeout(() => setNotification(null), 4500);
  };

  // Handle Monthly Target Allocation Submission
  const handleAllocateSelectedChapters = () => {
    if (selectedChapterIdsForTarget.size === 0) {
      setNotification({
        message: 'Please check at least 1 chapter from the list to allocate.',
        type: 'error'
      });
      return;
    }

    const targetedChapters = chapters.filter(c => selectedChapterIdsForTarget.has(c.id));
    if (targetedChapters.length === 0) return;

    if (allocationMode === 'grouped') {
      // Group by subject
      const chaptersBySubject: Record<string, Chapter[]> = {};
      targetedChapters.forEach(c => {
        if (!chaptersBySubject[c.subjectId]) chaptersBySubject[c.subjectId] = [];
        chaptersBySubject[c.subjectId].push(c);
      });

      let addedCount = 0;
      Object.entries(chaptersBySubject).forEach(([subjId, chaps]) => {
        const subj = subjects.find(s => s.id === subjId);
        const subjName = subj?.name || 'Curriculum';
        const sortedChaps = sortChaptersNumerically(chaps);
        const firstCh = sortedChaps[0]?.chapterNumber;
        const lastCh = sortedChaps[sortedChaps.length - 1]?.chapterNumber;
        
        const titleRange = sortedChaps.length === 1 
          ? `${subjName} Ch ${firstCh}` 
          : `${subjName} Ch ${firstCh}-${lastCh} (${sortedChaps.length} Chapters)`;

        addMonthlyTarget({
          title: titleRange,
          targetCount: sortedChaps.length,
          completedCount: 0,
          unitLabel: 'Chapters',
          track: subjName,
          monthKey: selectedMonthKey,
          chapterId: sortedChaps.length === 1 ? sortedChaps[0].id : undefined,
          notes: `Selected chapters: ${sortedChaps.map(c => `Ch ${c.chapterNumber}: ${getChapterTopicDisplay(c)}`).join(', ')}`
        });
        addedCount++;
      });

      setNotification({
        message: `Successfully allocated ${targetedChapters.length} chapter(s) across ${addedCount} monthly target(s) for ${selectedMonthKey}!`,
        type: 'success'
      });
      if (onTargetCreated) onTargetCreated(`${targetedChapters.length} Chapters`);
      // Individual chapter targets
      const itemsToAllocate = targetedChapters.map(chap => {
        const subj = subjects.find(s => s.id === chap.subjectId);
        const subjName = subj?.name || 'Subject';
        const displayTopic = getChapterTopicDisplay(chap);
        const boundWeek = chapterBindings[chap.id]?.weekKey;

        return {
          chapterId: chap.id,
          title: `${subjName} Ch ${chap.chapterNumber}: ${displayTopic}`,
          targetCount: 1,
          completedCount: 0,
          unitLabel: 'Chapters',
          track: subjName,
          weekKey: boundWeek,
          notes: boundWeek 
            ? `Subject: ${subjName} | Chapter ${chap.chapterNumber} | Week: ${boundWeek}`
            : `Subject: ${subjName} | Chapter ${chap.chapterNumber}`
        };
      });

      allocateMonthlyAndWeeklyBatch({
        monthKey: selectedMonthKey,
        items: itemsToAllocate,
      });

      setNotification({
        message: `Successfully created ${targetedChapters.length} individual chapter monthly target(s) for ${selectedMonthKey}!`,
        type: 'success'
      });
      if (onTargetCreated) onTargetCreated(`${targetedChapters.length} Chapter Targets`);
    }

    // Clear chapter selections
    setSelectedChapterIdsForTarget(new Set());

    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div className="w-full space-y-4 font-mono">

      {/* ── TOP NOTIFICATION BANNER ── */}
      {notification && (
        <div 
          className={`
            p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs
            ${notification.type === 'success' 
              ? 'bg-[#10B981]/15 border-[#10B981]/35 text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
              : 'bg-[#EF4444]/15 border-[#EF4444]/35 text-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            }
          `}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 stroke-[3]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-bold">{notification.message}</span>
          </div>

          <div className="flex items-center gap-2">
            {onViewChecklist && notification.type === 'success' && (
              <button
                type="button"
                onClick={onViewChecklist}
                className="px-2.5 py-1 rounded-lg bg-[#10B981] text-black font-black text-[10px] uppercase hover:bg-white transition-all cursor-pointer"
              >
                View Checklist
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── SPLIT CONTAINER: LEFT TREE HIERARCHY + RIGHT CHAPTERS LIST ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================================= */}
        {/* ── LEFT BOX CONTAINER: PROGRAM & SUBJECT TREE HIERARCHY ── */}
        {/* ========================================================================= */}
        <div 
          id="curriculum-hierarchy-tree-card"
          className="lg:col-span-5 rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] relative overflow-hidden transition-none md:transition-all md:duration-300"
        >
          {/* Ambient glow */}
          <div 
            className="hidden md:block absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#6366F1]/10 blur-2xl pointer-events-none" 
            aria-hidden="true" 
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
                <FolderTree className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black uppercase text-[#F8FAFC] tracking-wide">
                  Program &amp; Subject Tree
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  Select subjects to view chapters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllSubjects}
                className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-bold text-[#818CF8] hover:text-white transition-colors cursor-pointer"
                title="Select all subjects"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearSubjectSelection}
                className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Clear subject selection"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-3 relative z-10">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={hierarchySearch}
                onChange={(e) => setHierarchySearch(e.target.value)}
                placeholder="Search programs & subjects..."
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-white/[0.08] bg-[#0E121B] text-xs text-[#F8FAFC] placeholder-white/30 focus:border-[#6366F1] focus:outline-none transition-all"
              />
              {hierarchySearch && (
                <button
                  type="button"
                  onClick={() => setHierarchySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/40 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Expand / Collapse All */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/50 px-1 relative z-10">
            <span>
              {programs.length} Programs · {subjects.length} Subjects
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllPrograms}
                className="hover:text-[#818CF8] transition-colors cursor-pointer"
              >
                Expand all
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={collapseAllPrograms}
                className="hover:text-[#818CF8] transition-colors cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Programs & Subjects Hierarchy Tree */}
          <div className="mt-3 space-y-2.5 max-h-[500px] overflow-y-auto pr-1 relative z-10">
            {filteredPrograms.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 border border-dashed border-white/[0.08] rounded-xl">
                No matching programs or subjects found.
              </div>
            ) : (
              filteredPrograms.map((prog) => {
                const isExpanded = !!expandedPrograms[prog.id];
                const progSubjs = subjects.filter(s => s.programId === prog.id);
                const selectedCountInProg = progSubjs.filter(s => selectedSubjectIds.includes(s.id)).length;
                const allProgSelected = progSubjs.length > 0 && selectedCountInProg === progSubjs.length;

                return (
                  <div 
                    key={prog.id}
                    className="rounded-2xl border border-white/[0.06] bg-[#0E121B]/50 overflow-hidden transition-all duration-200"
                  >
                    {/* Program Node Header */}
                    <div 
                      className="flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer select-none transition-colors"
                      onClick={() => toggleProgram(prog.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          className="text-white/60 hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProgram(prog.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#818CF8]" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-black uppercase text-[#F8FAFC] tracking-wide block truncate">
                            {prog.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {progSubjs.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProgramSubjects(prog.id);
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                              allProgSelected 
                                ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40' 
                                : selectedCountInProg > 0
                                ? 'bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40'
                                : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white'
                            }`}
                            title={allProgSelected ? 'Deselect all subjects in program' : 'Select all subjects in program'}
                          >
                            {selectedCountInProg}/{progSubjs.length} Sel
                          </button>
                        )}

                        <span className="text-[10px] text-white/30 font-mono">
                          {progSubjs.length} Subj
                        </span>
                      </div>
                    </div>

                    {/* Subjects Children List */}
                    {isExpanded && (
                      <div className="p-2 space-y-1.5 border-t border-white/[0.04] bg-[#070A11]/60">
                        {progSubjs.length === 0 ? (
                          <p className="text-[10px] text-white/30 italic px-2 py-1">
                            No subjects configured in this program.
                          </p>
                        ) : (
                          progSubjs.map((subj) => {
                            const isSelected = selectedSubjectIds.includes(subj.id);
                            const subjChapters = chapters.filter(c => c.subjectId === subj.id);

                            return (
                              <div
                                key={subj.id}
                                onClick={() => toggleSubjectCheckbox(subj.id)}
                                className={`
                                  flex items-center justify-between gap-2.5 p-2 rounded-xl border cursor-pointer select-none
                                  transition-none md:transition-all md:duration-200
                                  ${isSelected
                                    ? 'bg-[#6366F1]/15 border-[#6366F1]/50 text-white shadow-[0_0_14px_rgba(99,102,241,0.2)] md:translate-x-0.5'
                                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.14] text-[#94A3B8] md:hover:-translate-y-0.5'
                                  }
                                `}
                              >
                                {/* Checkbox & Subject Name */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`
                                      h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-all
                                      ${isSelected
                                        ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                                        : 'border-white/30 bg-white/[0.03] hover:border-[#10B981]'
                                      }
                                    `}
                                  >
                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <span className={`text-xs font-bold block truncate ${
                                      isSelected ? 'text-[#F8FAFC]' : 'text-[#E2E8F0]'
                                    }`}>
                                      {subj.name}
                                    </span>
                                  </div>
                                </div>

                                {/* Subject Badges */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {subj.priority && subj.priority !== 'none' && (
                                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                      subj.priority === 'high'
                                        ? 'bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30'
                                        : subj.priority === 'medium'
                                        ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                                        : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                    }`}>
                                      {subj.priority}
                                    </span>
                                  )}

                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isSelected 
                                      ? 'bg-[#6366F1]/30 text-[#A5B4FC]' 
                                      : 'bg-white/[0.04] text-white/50'
                                  }`}>
                                    {subjChapters.length} Ch
                                  </span>
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
        </div>

        {/* ========================================================================= */}
        {/* ── RIGHT BOX CONTAINER: CHAPTER LIST OF SELECTED SUBJECT(S) ── */}
        {/* 1 CHAPTER 1 BAR, IN ONE ROW 2 BARS WILL BE PLACED ── */}
        {/* ========================================================================= */}
        <div 
          id="chapters-list-container-card"
          className="lg:col-span-7 rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] relative overflow-hidden transition-none md:transition-all md:duration-300"
        >
          {/* Ambient desktop glow */}
          <div 
            className="hidden md:block absolute -top-16 -left-16 w-36 h-36 rounded-full bg-[#10B981]/10 blur-2xl pointer-events-none" 
            aria-hidden="true" 
          />

          {/* Right Container Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08] relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                <BookOpen className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase text-[#F8FAFC] tracking-wide">
                    Chapter Curriculum List
                  </h2>
                  {displayedChapters.length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/70">
                      {displayedChapters.length} Chapters{selectedChapterIdsForTarget.size > 0 ? ` (${selectedChapterIdsForTarget.size} Selected)` : ''}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#94A3B8]">
                  {selectedSubjectIds.length === 0
                    ? 'Awaiting subject selection on the left'
                    : `Showing chapters from ${selectedSubjectIds.length} selected subject(s) · 1 chapter 1 bar (2 bars/row)`
                  }
                </p>
              </div>
            </div>

            {/* Selected Subjects Tag Pills */}
            {selectedSubjectsList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 max-w-sm self-start sm:self-center">
                {selectedSubjectsList.map(subj => (
                  <span
                    key={subj.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] text-[9px] font-bold"
                  >
                    <span>{subj.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSubjectCheckbox(subj.id)}
                      className="hover:text-white transition-colors cursor-pointer"
                      title={`Remove ${subj.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── CASE 1: NO SUBJECT SELECTED EMPTY STATE ── */}
          {selectedSubjectIds.length === 0 ? (
            <div className="w-full py-16 px-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.01] flex flex-col items-center justify-center text-center my-4 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3">
                <BookOpen className="h-6 w-6 text-white/30" />
              </div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#F8FAFC]">
                No Subject Selected
              </h3>
              <p className="text-[11px] text-[#94A3B8] max-w-sm mt-1 leading-relaxed">
                Check one or more subjects from the Program &amp; Subject tree hierarchy on the left to inspect and bind chapters to weekly/monthly targets.
              </p>

              {/* Quick Suggestion Chips */}
              {subjects.length > 0 && (
                <div className="mt-5 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">
                    Quick Select from Available Subjects:
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                    {subjects.slice(0, 6).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubjectCheckbox(s.id)}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-[#6366F1]/20 border border-white/[0.08] hover:border-[#6366F1]/40 text-[10px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] transition-all cursor-pointer"
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── CASE 2: SUBJECT(S) SELECTED - RENDER CHAPTER LIST ── */
            <div className="mt-3 space-y-3 relative z-10">
              
              {/* Filter and Selection Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="h-3 w-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="Filter chapters by name or number..."
                    className="w-full pl-7 pr-7 py-1.5 rounded-xl border border-white/[0.08] bg-[#0E121B] text-[11px] text-[#F8FAFC] placeholder-white/20 focus:border-[#10B981] focus:outline-none transition-all"
                  />
                  {chapterSearch && (
                    <button
                      type="button"
                      onClick={() => setChapterSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/40 hover:text-white"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={selectAllDisplayedChapters}
                    className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-bold text-[#818CF8] hover:text-white transition-colors cursor-pointer"
                  >
                    Select All ({displayedChapters.length})
                  </button>

                  {selectedChapterIdsForTarget.size > 0 && (
                    <button
                      type="button"
                      onClick={deselectAllChapters}
                      className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear ({selectedChapterIdsForTarget.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Chapter Items List */}
              {displayedChapters.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                  <p className="text-xs text-[#94A3B8]">
                    {chapterSearch 
                      ? `No chapters found matching "${chapterSearch}"`
                      : 'No chapters found in the selected subject(s).'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {selectedSubjectsList.map(subj => {
                    const subjChaps = displayedChapters.filter(c => c.subjectId === subj.id);
                    if (subjChaps.length === 0) return null;

                    const allSubjChapsSelected = subjChaps.every(c => selectedChapterIdsForTarget.has(c.id));

                    return (
                      <div key={subj.id} className="rounded-2xl border border-white/[0.06] bg-[#0E121B]/40 p-3 space-y-2.5">
                        {/* Subject Section Header */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.05]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black uppercase text-[#38BDF8]">
                              {subj.name}
                            </span>
                            <span className="text-[9px] font-mono text-white/40">
                              ({subjChaps.length} Chapters)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapterIdsForTarget(prev => {
                                const next = new Set(prev);
                                if (allSubjChapsSelected) {
                                  subjChaps.forEach(c => next.delete(c.id));
                                } else {
                                  subjChaps.forEach(c => next.add(c.id));
                                }
                                return next;
                              });
                            }}
                            className="text-[9px] font-bold text-[#818CF8] hover:underline cursor-pointer"
                          >
                            {allSubjChapsSelected ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>

                        {/* ── CHAPTER BARS GRID: 1 CHAPTER 1 BAR, 2 BARS IN ONE ROW ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {subjChaps.map(chap => {
                            const isCheckedForTarget = selectedChapterIdsForTarget.has(chap.id);
                            const alreadyAllocated = isChapterAlreadyTargeted(chap);
                            const binding = chapterBindings[chap.id];
                            const isBoundToWeek = !!binding;
                            const boundWeekKey = binding?.weekKey;
                            const displayTopic = getChapterTopicDisplay(chap);

                            const boundWeekOption = currentMonthWeeks.find(w => w.id === boundWeekKey);

                            return (
                              <div
                                key={chap.id}
                                className={`
                                  p-3 rounded-2xl border flex flex-col justify-between gap-2.5
                                  transition-none md:transition-all md:duration-200 select-none
                                  ${isCheckedForTarget
                                    ? 'bg-[#10B981]/10 border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-[#10B981]/25'
                                    : isBoundToWeek
                                    ? 'bg-[#06B6D4]/[0.08] border-[#06B6D4]/35 shadow-[0_0_12px_rgba(6,182,212,0.12)] md:hover:border-[#06B6D4]/50'
                                    : alreadyAllocated
                                    ? 'bg-[#38BDF8]/[0.05] border-[#38BDF8]/25'
                                    : 'bg-[#0B0F19]/80 border-white/[0.07] md:hover:border-white/[0.18] md:hover:bg-white/[0.02] md:hover:-translate-y-0.5'
                                  }
                                `}
                              >
                                {/* Top Row: Checkbox, Chapter Number, Star/Priority & Title */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {/* Selection Checkbox */}
                                    <button
                                      type="button"
                                      onClick={() => toggleChapterForTarget(chap.id)}
                                      className={`
                                        h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-none md:transition-all cursor-pointer
                                        ${isCheckedForTarget
                                          ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                                          : 'border-white/30 bg-white/[0.03] md:hover:border-[#10B981]'
                                        }
                                      `}
                                      title={isCheckedForTarget ? 'Deselect Chapter' : 'Select Chapter'}
                                    >
                                      {isCheckedForTarget && <Check className="h-3 w-3 stroke-[3]" />}
                                    </button>

                                    {/* Chapter Number Badge */}
                                    <span className="text-[9px] font-black font-mono text-[#818CF8] bg-[#6366F1]/15 border border-[#6366F1]/30 px-1.5 py-0.5 rounded-md shrink-0">
                                      Ch {chap.chapterNumber}
                                    </span>

                                    {/* Star / Priority Indicator */}
                                    {chap.priority === 'high' ? (
                                      <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                                    ) : (
                                      <Star className="h-3 w-3 text-white/20 shrink-0" />
                                    )}

                                    {/* Chapter Topic Name */}
                                    <span className="text-xs font-bold text-[#F8FAFC] truncate" title={displayTopic}>
                                      {displayTopic}
                                    </span>
                                  </div>

                                  {/* Right Badges */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isBoundToWeek && (
                                      <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded bg-[#06B6D4]/20 text-[#22D3EE] border border-[#06B6D4]/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                                        ✓ {boundWeekOption ? boundWeekOption.shortLabel : 'Weekly'}
                                      </span>
                                    )}

                                    {alreadyAllocated && !isBoundToWeek && (
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                                        Monthly
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom Row: Assign to Week of the Month (Sat to Fri cycle) - WITHOUT SIZE */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.05]">
                                  <div className="flex items-center gap-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider shrink-0">
                                    <Calendar className="h-3 w-3 text-[#22D3EE] shrink-0" />
                                    <span className="hidden sm:inline">Week Target:</span>
                                  </div>

                                  <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                                    <select
                                      value={boundWeekKey || ''}
                                      onChange={(e) => handleChapterWeekChange(chap, subj, e.target.value)}
                                      className={`text-[10px] font-bold rounded-lg px-2.5 py-1 border transition-none md:transition-all focus:outline-none cursor-pointer max-w-[190px] sm:max-w-[230px] truncate ${
                                        isBoundToWeek
                                          ? 'bg-[#06B6D4]/15 border-[#06B6D4]/50 text-[#22D3EE] shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                          : 'bg-[#0E121B] border-white/[0.1] md:hover:border-white/[0.25] text-[#94A3B8] md:hover:text-[#F8FAFC]'
                                      }`}
                                      title="Bind chapter to week in Weekly Targets section"
                                    >
                                      <option value="">-- Assign Week --</option>
                                      {currentMonthWeeks.map((w) => (
                                        <option key={w.id} value={w.id}>
                                          {w.label}
                                        </option>
                                      ))}
                                    </select>

                                    {/* Unassign button if bound */}
                                    {isBoundToWeek && (
                                      <button
                                        type="button"
                                        onClick={() => handleChapterWeekChange(chap, subj, '')}
                                        className="p-1 rounded-lg text-white/40 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors cursor-pointer shrink-0"
                                        title="Unbind from weekly targets"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── ALLOCATION FOOTER ACTIONS BAR ── */}
              <div className="pt-3.5 border-t border-white/[0.08] flex flex-col space-y-3">
                
                {/* Batch Action Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
                  {/* Left: Batch Bind to Week */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black text-[#94A3B8] uppercase tracking-wider">
                      Batch Week Bind:
                    </span>
                    <select
                      value={batchWeekKey}
                      onChange={(e) => setBatchWeekKey(e.target.value)}
                      className="bg-[#0E121B] border border-white/[0.12] text-[10px] font-bold text-[#F8FAFC] rounded-lg px-2 py-1 focus:outline-none focus:border-[#06B6D4] max-w-[190px] truncate"
                    >
                      <option value="">Select Week...</option>
                      {currentMonthWeeks.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleBatchAssignToWeek}
                      disabled={selectedChapterIdsForTarget.size === 0 || !batchWeekKey}
                      className="px-2.5 py-1 rounded-lg bg-[#06B6D4]/20 hover:bg-[#06B6D4]/30 border border-[#06B6D4]/40 text-[#22D3EE] text-[10px] font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Bind {selectedChapterIdsForTarget.size} to Week
                    </button>
                  </div>

                  {/* Right: Allocation Format Mode */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <span className="text-[9px] font-bold text-[#94A3B8] uppercase">
                      Monthly Format:
                    </span>
                    <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#0E121B] p-0.5 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAllocationMode('grouped')}
                        className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          allocationMode === 'grouped'
                            ? 'bg-[#6366F1] text-white shadow'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Grouped
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllocationMode('individual')}
                        className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          allocationMode === 'individual'
                            ? 'bg-[#6366F1] text-white shadow'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Individual
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Allocation to Monthly Target Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleAllocateSelectedChapters}
                    disabled={selectedChapterIdsForTarget.size === 0}
                    className={`
                      w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider
                      flex items-center justify-center gap-2 cursor-pointer transition-none md:transition-all active:scale-95
                      ${selectedChapterIdsForTarget.size > 0
                        ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                        : 'bg-white/[0.05] text-white/30 border border-white/[0.08] cursor-not-allowed'
                      }
                    `}
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>
                      Allocate {selectedChapterIdsForTarget.size} Chapter{selectedChapterIdsForTarget.size === 1 ? '' : 's'} as Monthly Target ({selectedMonthKey})
                    </span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
