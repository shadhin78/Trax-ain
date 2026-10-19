/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Check, 
  CheckCircle2, 
  FolderTree, 
  Star, 
  X, 
  Layers, 
  Shield, 
  BookOpen, 
  Sparkles, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Trophy,
  Sliders,
  Clock
} from 'lucide-react';
import { AppRoute } from '../../types/navigation';
import { useDailyActions } from './context/DailyActionsContext';
import { 
  useAcademicHierarchy, 
  sortChaptersNumerically, 
  getChapterTopicDisplay 
} from '../../context/AcademicHierarchyContext';
import { Chapter, Subject, Program, Track, ChapterStatus } from '../../types/academic';
import { getMonthWeeks, MonthWeekOption } from './utils/weekUtils';
import { 
  isChapterCanonicallyComplete, 
  resolveTargetChapterId, 
  resolveTargetChapterIds 
} from './utils/chapterTargetSync';

interface MonthlyTargetSetupViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const MonthlyTargetSetupViewComponent: React.FC<MonthlyTargetSetupViewProps> = ({ onNavigate }) => {
  const {
    selectedDate,
    selectedMonthKey,
    isCurrentMonth,
    goToPrevMonth,
    goToCurrentMonth,
    goToNextMonth,
    currentMonthTargets,
    monthlyTargets,
    weeklyTargets,
    bindChapterToWeek,
    unbindChapterFromWeek,
    addMonthlyTarget,
    allocateMonthlyAndWeeklyBatch,
    deleteMonthlyTarget,
    toggleMonthlyTargetComplete,
    updateMonthlyTargetProgress,
  } = useDailyActions();

  const { 
    tracks, 
    programs, 
    subjects, 
    chapters, 
    completionRecords,
    setChapterStatus,
    toggleChapterCompletion 
  } = useAcademicHierarchy();

  // ── Weeks of the currently selected month (Saturday-to-Friday clipped to month) ──
  const currentMonthWeeks = useMemo(() => {
    return getMonthWeeks(selectedDate);
  }, [selectedDate]);

  // Selected Program Tracks in Left Column (starts empty, driven by user selection)
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);

  // Selected Syllabus Subjects in Left Column (starts empty, driven by user selection)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Selected chapters for batch target allocation (Right Column)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(() => new Set());

  // Manual Star Counts (allows user to cycle target count / stars: 1st time = 0, 2nd time = 1 star, 3rd time = 2 stars [2⭐])
  const [manualStarCounts, setManualStarCounts] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('x29_chapter_star_counts');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse stored star counts:', e);
    }
    return {};
  });

  // Notification Toast banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Month navigation labels
  const formattedMonthNameYear = useMemo(() => {
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

  const formattedMonthRange = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return `${monthNames[m]} ${y} (01 ${monthShorts[m]} ${y} - ${String(lastDay).padStart(2, '0')} ${monthShorts[m]} ${y})`;
  }, [selectedDate]);

  // Selected subjects objects list (scoped strictly to selected program tracks)
  const selectedSubjectsList = useMemo(() => {
    if (selectedProgramIds.length === 0) return [];
    const list = subjects.filter(s => selectedSubjectIds.includes(s.id));
    return list.filter(s => selectedProgramIds.includes(s.programId));
  }, [subjects, selectedSubjectIds, selectedProgramIds]);

  // Selected subject names for metric badge
  const selectedSubjectsLabel = useMemo(() => {
    if (selectedSubjectsList.length === 0) return 'None Selected';
    if (selectedSubjectsList.length === 1) return selectedSubjectsList[0].name;
    return selectedSubjectsList.map(s => s.name).join(', ');
  }, [selectedSubjectsList]);

  // Filtered Syllabus Subjects based on selected Program Tracks (empty if no program track is selected)
  const filteredSubjectsForLeftColumn = useMemo(() => {
    if (selectedProgramIds.length === 0) return [];
    return subjects.filter(s => selectedProgramIds.includes(s.programId));
  }, [subjects, selectedProgramIds]);

  // Count of visible subjects that are currently checked
  const selectedVisibleSubjectsCount = useMemo(() => {
    return filteredSubjectsForLeftColumn.filter(s => selectedSubjectIds.includes(s.id)).length;
  }, [filteredSubjectsForLeftColumn, selectedSubjectIds]);

  // Chapters of selected subjects
  const chaptersOfSelectedSubjects = useMemo(() => {
    if (selectedSubjectsList.length === 0) return [];
    const validSubjIds = selectedSubjectsList.map(s => s.id);
    const filtered = chapters.filter(c => validSubjIds.includes(c.subjectId) && !c.isSkipped);
    return sortChaptersNumerically(filtered);
  }, [chapters, selectedSubjectsList]);

  // Chapter completion status - canonical 2-way sync across all pages
  const isChapterCompleted = useCallback((chapter: Chapter): boolean => {
    return isChapterCanonicallyComplete(chapter, completionRecords);
  }, [completionRecords]);

  // Target appearance count calculation:
  // Count matching monthly targets in database
  const getChapterTargetAppearanceCount = useCallback((chapter: Chapter): number => {
    // 1. Manual user override if set
    if (manualStarCounts[chapter.id] !== undefined) {
      return manualStarCounts[chapter.id];
    }

    // 2. Count matching monthly targets in database
    const countInTargets = monthlyTargets.filter(t => {
      if (t.chapterId && t.chapterId === chapter.id) return true;
      const ids = resolveTargetChapterIds(t, chapters, subjects);
      return ids.includes(chapter.id);
    }).length;

    return countInTargets;
  }, [manualStarCounts, monthlyTargets, chapters, subjects]);

  // Star count:
  // 0 targets created previously = 0 stars (no stars)
  // 1st time target set = 0 stars
  // 2nd time target set = 1 star (⭐)
  // 3rd time target set = 2 stars ([ 2⭐ ])
  const getChapterStarCount = useCallback((chapter: Chapter): number => {
    const targetCount = getChapterTargetAppearanceCount(chapter);
    return Math.max(0, targetCount - 1);
  }, [getChapterTargetAppearanceCount]);

  // Total completed chapters in selected subjects
  const completedSelectedChaptersCount = useMemo(() => {
    return chaptersOfSelectedSubjects.filter(c => isChapterCompleted(c)).length;
  }, [chaptersOfSelectedSubjects, isChapterCompleted]);

  // Map of chapter bindings from weeklyTargets
  const chapterBindingsMap = useMemo(() => {
    const map: Record<string, { weekKey: string; targetId: string }> = {};
    weeklyTargets.forEach(t => {
      const chapId = t.chapterId || resolveTargetChapterId(t, chapters, subjects);
      if (chapId) {
        map[chapId] = {
          weekKey: t.weekKey,
          targetId: t.id,
        };
      }
    });
    return map;
  }, [weeklyTargets, chapters, subjects]);

  // ── LEFT COLUMN HANDLERS ──
  const toggleProgramTrack = (progId: string) => {
    const isCurrentlySelected = selectedProgramIds.includes(progId);
    const nextProgramIds = isCurrentlySelected
      ? selectedProgramIds.filter(id => id !== progId)
      : [...selectedProgramIds, progId];

    setSelectedProgramIds(nextProgramIds);

    // If program was deselected, clean up any of its subjects from selection
    if (isCurrentlySelected) {
      const progSubjIds = subjects.filter(s => s.programId === progId).map(s => s.id);
      setSelectedSubjectIds(prev => prev.filter(id => !progSubjIds.includes(id)));

      // Clean up any selected chapters that belonged to deselected program
      const removedChapIds = new Set(
        chapters.filter(c => progSubjIds.includes(c.subjectId)).map(c => c.id)
      );
      setSelectedChapterIds(prev => {
        const next = new Set(prev);
        removedChapIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const selectAllPrograms = () => {
    setSelectedProgramIds(programs.map(p => p.id));
  };

  const clearAllPrograms = () => {
    setSelectedProgramIds([]);
    setSelectedSubjectIds([]);
    setSelectedChapterIds(new Set());
  };

  const toggleSubject = (subjId: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(subjId)) {
        const removedChapIds = new Set(
          chapters.filter(c => c.subjectId === subjId).map(c => c.id)
        );
        setSelectedChapterIds(prevChaps => {
          const next = new Set(prevChaps);
          removedChapIds.forEach(id => next.delete(id));
          return next;
        });
        return prev.filter(id => id !== subjId);
      } else {
        return [...prev, subjId];
      }
    });
  };

  const selectAllSubjects = () => {
    const visibleSubjIds = filteredSubjectsForLeftColumn.map(s => s.id);
    setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...visibleSubjIds])));
  };

  const clearAllSubjects = () => {
    const visibleSubjIds = new Set(filteredSubjectsForLeftColumn.map(s => s.id));
    setSelectedSubjectIds(prev => prev.filter(id => !visibleSubjIds.has(id)));
    const removedChapIds = new Set(
      chapters.filter(c => visibleSubjIds.has(c.subjectId)).map(c => c.id)
    );
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      removedChapIds.forEach(id => next.delete(id));
      return next;
    });
  };

  // ── RIGHT COLUMN CHAPTER HANDLERS ──
  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const selectAllChaptersForSubject = (subjId: string) => {
    const subjChaps = chapters.filter(c => c.subjectId === subjId && !c.isSkipped);
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      subjChaps.forEach(c => next.add(c.id));
      return next;
    });
  };

  const clearChaptersForSubject = (subjId: string) => {
    const subjChaps = chapters.filter(c => c.subjectId === subjId && !c.isSkipped);
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      subjChaps.forEach(c => next.delete(c.id));
      return next;
    });
  };

  const selectAllDisplayedChapters = () => {
    setSelectedChapterIds(new Set(chaptersOfSelectedSubjects.map(c => c.id)));
  };

  const clearAllChapters = () => {
    setSelectedChapterIds(new Set());
  };

  // Toggle chapter completion (updates AcademicHierarchyContext -> synced with Subjects page!)
  const handleToggleChapterCompletion = (chapter: Chapter) => {
    toggleChapterCompletion(chapter.id);
    const willBeCompleted = !isChapterCompleted(chapter);
    setNotification({
      message: willBeCompleted
        ? `✓ Marked Ch ${chapter.chapterNumber} completed! Updated on Subjects page.`
        : `Marked Ch ${chapter.chapterNumber} pending. Updated on Subjects page.`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Cycle star / target appearance count: 1st time (count=1, 0 stars) -> 2nd time (count=2, 1 star) -> 3rd time (count=3, 2 stars [ 2⭐ ]) -> 1st time
  const handleCycleStar = (chapter: Chapter, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCount = getChapterTargetAppearanceCount(chapter);
    let nextCount = 1;
    if (currentCount <= 1) {
      nextCount = 2; // 2nd time -> 1 star
    } else if (currentCount === 2) {
      nextCount = 3; // 3rd time -> 2 stars [ 2⭐ ]
    } else {
      nextCount = 1; // 1st time -> 0 stars
    }

    setManualStarCounts(prev => {
      const next = { ...prev, [chapter.id]: nextCount };
      try {
        localStorage.setItem('x29_chapter_star_counts', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save manual star counts:', err);
      }
      return next;
    });

    const nextStars = Math.max(0, nextCount - 1);
    setNotification({
      message: nextStars === 0
        ? `Ch ${chapter.chapterNumber}: 1st time target set (No stars)`
        : nextStars === 1
          ? `Ch ${chapter.chapterNumber}: 2nd time target set (1 star ⭐)`
          : `Ch ${chapter.chapterNumber}: 3rd time target set (2 stars [ 2⭐ ])`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to format week dropdown label as: W2 [ 3 oct - 9 oct ]
  const formatWeekDropdownLabel = useCallback((week: MonthWeekOption): string => {
    const monthShorts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const m = monthShorts[selectedDate.getMonth()];
    return `W${week.weekIndex} [ ${week.startDay} ${m} - ${week.endDay} ${m} ]`;
  }, [selectedDate]);

  // Single chapter week dropdown change (allows freely changing week at any time)
  const handleSingleChapterWeekChange = (chapter: Chapter, subj: Subject, weekKey: string) => {
    const displayTopic = getChapterTopicDisplay(chapter);

    // Auto-select this chapter so it is included in target allocation
    setSelectedChapterIds(prev => new Set(prev).add(chapter.id));

    if (!weekKey) {
      unbindChapterFromWeek(chapter.id);
      setNotification({
        message: `Ch ${chapter.chapterNumber} unassigned from week.`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const matchedWeek = currentMonthWeeks.find(w => w.id === weekKey);
    const weekLabel = matchedWeek ? formatWeekDropdownLabel(matchedWeek) : weekKey;
    bindChapterToWeek({
      chapterId: chapter.id,
      weekKey,
      title: `${subj.name} Ch ${chapter.chapterNumber}: ${displayTopic}`,
      track: subj.name,
      notes: `Month: ${selectedMonthKey} | ${weekLabel}`
    });

    setNotification({
      message: `✓ Ch ${chapter.chapterNumber} assigned to ${weekLabel}!`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3500);
  };



  // Allocate selected chapters as Monthly (and Weekly if week selected) Targets
  const handleAllocateMonthlyTargets = () => {
    // 1. Determine targeted chapters: explicitly checked chapters or chapters with week assigned in this month
    const targetChapIds = new Set(selectedChapterIds);
    chaptersOfSelectedSubjects.forEach(c => {
      if (chapterBindingsMap[c.id]?.weekKey) {
        targetChapIds.add(c.id);
      }
    });

    const chapsToAllocate = targetChapIds.size > 0
      ? chapters.filter(c => targetChapIds.has(c.id))
      : chaptersOfSelectedSubjects;

    if (chapsToAllocate.length === 0) {
      setNotification({
        message: 'Please check at least 1 chapter or assign a week to set monthly targets.',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // 2. Prepare atomic batch allocation payload for all targeted chapters
    const itemsToAllocate = chapsToAllocate.map(chap => {
      const subj = subjects.find(s => s.id === chap.subjectId);
      const subjName = subj?.name || 'Subject';
      const displayTopic = getChapterTopicDisplay(chap) || chap.topicName || chap.title || `Topic ${chap.chapterNumber}`;
      const boundWeek = chapterBindingsMap[chap.id]?.weekKey;
      const isComplete = isChapterCompleted(chap);
      const title = `${subjName} Ch ${chap.chapterNumber}: ${displayTopic}`;

      const matchedWeek = boundWeek ? currentMonthWeeks.find(w => w.id === boundWeek) : undefined;
      const weekLabel = matchedWeek ? formatWeekDropdownLabel(matchedWeek) : boundWeek;

      return {
        chapterId: chap.id,
        title,
        track: subjName,
        targetCount: 1,
        completedCount: isComplete ? 1 : 0,
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

    // 4. Clear selections
    setSelectedChapterIds(new Set());

    // 5. Instantly close page and take to daily action page monthly target section
    if (onNavigate) {
      onNavigate('/daily-actions/');
    } else {
      window.history.pushState(null, '', '/daily-actions/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    // Smoothly scroll to the Monthly Targets section in Daily Actions
    const scrollToMonthlySection = () => {
      const card = document.getElementById('monthly-targets-setup-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    requestAnimationFrame(scrollToMonthlySection);
    setTimeout(scrollToMonthlySection, 80);
    setTimeout(scrollToMonthlySection, 250);
  };

  return (
    <div className="w-full space-y-4 font-mono pb-16 bg-transparent select-none">

      {/* ── TOP NOTIFICATION TOAST BANNER ── */}
      {notification && (
        <div 
          className={`
            p-3 rounded-xl border flex items-center justify-between gap-3 text-xs
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
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── TOP HEADER ROW: TITLE, BADGE, SUBTITLE & MONTH NAVIGATION CONTROLS ── */}
      {/* ========================================================================= */}
      <div className="w-full rounded-[22px] border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Part: Back Button + Icon + Title + Badge + Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/daily-actions/')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold transition-none md:transition-all cursor-pointer select-none active:scale-95 shrink-0 self-start sm:self-center"
            title="Return to Daily Actions"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Daily Actions</span>
          </button>

          <div className="flex items-center gap-3 min-w-0">
            {/* Purple Square Icon */}
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]">
              <Calendar className="h-5 w-5 stroke-[2.5]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight">
                  Monthly Target Setup
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C7D2FE] bg-[#312E81]/70 border border-[#6366F1]/50 px-2 py-0.5 rounded-md">
                  TARGET SETUP
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                Configure program, subject, chapter breakdown, and weekly/daily target synchronization
              </p>
            </div>
          </div>
        </div>

        {/* Right Part: < Prev | Current | Next > and OCTOBER 2026 */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
          <div className="inline-flex items-center rounded-xl bg-[#090D16] border border-white/[0.08] p-1 shadow-inner">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-none md:transition-all cursor-pointer active:scale-95 select-none"
              title="Previous Month"
            >
              &lt; Prev
            </button>

            <button
              type="button"
              onClick={goToCurrentMonth}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-none md:transition-all cursor-pointer active:scale-95 select-none ${
                isCurrentMonth
                  ? 'bg-[#4F46E5] text-white shadow-[0_0_16px_rgba(99,102,241,0.6)] border border-[#818CF8]/70 ring-1 ring-[#818CF8]/40'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Jump to Current Month"
            >
              Current
            </button>

            <button
              type="button"
              onClick={goToNextMonth}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-none md:transition-all cursor-pointer active:scale-95 select-none"
              title="Next Month"
            >
              Next &gt;
            </button>
          </div>

          {/* Month Indicator Button */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B0F19] border border-white/[0.1] text-xs font-black text-[#F8FAFC] shadow-sm select-none">
            <Calendar className="h-3.5 w-3.5 text-[#818CF8]" />
            <span>{formattedMonthNameYear}</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ── ROW 2: 4 HORIZONTAL METRIC CARDS ── */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: TARGET MONTH RANGE */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-md p-3.5 flex flex-col justify-between gap-1 shadow-md hover:border-white/[0.14] transition-none md:transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            TARGET MONTH RANGE
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] truncate" title={formattedMonthRange}>
            {formattedMonthRange}
          </span>
        </div>

        {/* Card 2: SELECTED SUBJECTS */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-md p-3.5 flex flex-col justify-between gap-1 shadow-md hover:border-white/[0.14] transition-none md:transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            SELECTED SUBJECTS
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] truncate" title={selectedSubjectsLabel}>
            {selectedSubjectsLabel}
          </span>
        </div>

        {/* Card 3: SELECTED TARGETS */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-md p-3.5 flex flex-col justify-between gap-1 shadow-md hover:border-white/[0.14] transition-none md:transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            SELECTED TARGETS
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
            {selectedChapterIds.size} Targets Selected
          </span>
        </div>

        {/* Card 4: COMPLETED CHAPTERS (WITHOUT SIZE BOX) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-md p-3.5 flex flex-col justify-between gap-1 shadow-md hover:border-white/[0.14] transition-none md:transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            COMPLETED CHAPTERS
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#10B981]">
            {chaptersOfSelectedSubjects.length > 0 
              ? `${completedSelectedChaptersCount} / ${chaptersOfSelectedSubjects.length} Completed` 
              : '0 Completed'
            }
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ── MAIN STUDIO GRID: LEFT HIERARCHY + RIGHT SCOPE STUDIO ── */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* ======================================================================= */}
        {/* ── LEFT COLUMN: TARGET HIERARCHY ── */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 rounded-[22px] border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-xl p-4 sm:p-5 flex flex-col gap-4 shadow-[0_12px_36px_rgba(0,0,0,0.4)] h-full">
          
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              <Shield className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase text-[#F8FAFC] tracking-wider">
                TARGET HIERARCHY
              </h2>
              <p className="text-[10px] text-[#94A3B8]">
                Select program track &amp; syllabus subjects
              </p>
            </div>
          </div>

          {/* SUBSECTION 1: PROGRAM TRACKS */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#F8FAFC]">
                  PROGRAM TRACKS
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/30">
                  {selectedProgramIds.length} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllPrograms}
                  className="text-[10px] font-bold text-[#818CF8] hover:text-white transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={clearAllPrograms}
                  className="text-[10px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Program Track list */}
            <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
              {programs.length === 0 ? (
                <div className="py-4 text-center text-xs text-white/40 border border-dashed border-white/[0.08] rounded-xl">
                  No programs found.
                </div>
              ) : (
                programs.map((prog) => {
                  const isSelected = selectedProgramIds.includes(prog.id);
                  const trackObj = tracks.find(t => t.id === prog.trackId);
                  const trackBadge = trackObj?.name?.substring(0, 3)?.toUpperCase() || 'CA';
                  const subCount = subjects.filter(s => s.programId === prog.id).length;

                  return (
                    <div
                      key={prog.id}
                      onClick={() => toggleProgramTrack(prog.id)}
                      className={`
                        flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none
                        transition-none md:transition-all md:duration-150
                        ${isSelected
                          ? 'border-[#6366F1]/40 bg-[#6366F1]/[0.08] shadow-[0_0_12px_rgba(99,102,241,0.15)] md:translate-x-0.5'
                          : 'border-white/[0.06] bg-[#0A0E18]/60 hover:bg-white/[0.04] text-[#94A3B8] md:hover:-translate-y-0.5'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`
                            h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-none md:transition-all
                            ${isSelected
                              ? 'bg-[#06B6D4] border-[#06B6D4] text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                              : 'border-white/30 bg-white/[0.02]'
                            }
                          `}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        {/* Track Tag Badge */}
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-[#94A3B8] border border-white/[0.1] shrink-0">
                          {trackBadge}
                        </span>

                        {/* Program Name */}
                        <span className="text-xs font-bold text-[#F8FAFC] truncate">
                          {prog.name}
                        </span>
                      </div>

                      {/* Right Sub Count Badge */}
                      <span className="text-[10px] font-bold text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06] shrink-0">
                        {subCount} Sub
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SUBSECTION 2: SYLLABUS SUBJECTS */}
          <div className="space-y-2 pt-3 border-t border-white/[0.08] flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#F8FAFC]">
                  SYLLABUS SUBJECTS
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/30">
                  {selectedVisibleSubjectsCount} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllSubjects}
                  className="text-[10px] font-bold text-[#818CF8] hover:text-white transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={clearAllSubjects}
                  className="text-[10px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Syllabus Subject list: Fits 8 subjects cleanly, scrolls on 9+ */}
            <div className="space-y-1.5 min-h-[384px] max-h-[384px] overflow-y-auto pr-1">
              {filteredSubjectsForLeftColumn.length === 0 ? (
                <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]">
                  <BookOpen className="h-7 w-7 text-white/20 mb-2" />
                  <p className="text-xs text-white/40 font-mono font-bold">
                    {selectedProgramIds.length === 0
                      ? 'No program track selected'
                      : 'No subjects in selected program tracks'}
                  </p>
                  <p className="text-[10px] text-white/25 mt-1 max-w-[200px]">
                    {selectedProgramIds.length === 0
                      ? 'Select a program track above to view its syllabus subjects'
                      : 'Try selecting another program track'}
                  </p>
                </div>
              ) : (
                filteredSubjectsForLeftColumn.map((subj) => {
                  const isSelected = selectedSubjectIds.includes(subj.id);
                  const isPassed = subj.name.toLowerCase().includes('(passed)') || subj.name.toLowerCase().includes('passed');
                  const chapCount = chapters.filter(c => c.subjectId === subj.id && !c.isSkipped).length;

                  return (
                    <div
                      key={subj.id}
                      onClick={() => toggleSubject(subj.id)}
                      className={`
                        flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none
                        transition-none md:transition-all md:duration-150
                        ${isSelected
                          ? 'border-[#6366F1]/40 bg-[#6366F1]/[0.08] shadow-[0_0_12px_rgba(99,102,241,0.15)] md:translate-x-0.5'
                          : 'border-white/[0.06] bg-[#0A0E18]/60 hover:bg-white/[0.04] text-[#94A3B8] md:hover:-translate-y-0.5'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`
                            h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-none md:transition-all
                            ${isSelected
                              ? 'bg-[#06B6D4] border-[#06B6D4] text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                              : 'border-white/30 bg-white/[0.02]'
                            }
                          `}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        {/* Dot or Trophy */}
                        {isPassed ? (
                          <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-[#818CF8] shrink-0" />
                        )}

                        {/* Subject Name */}
                        <span className="text-xs font-bold text-[#F8FAFC] truncate">
                          {subj.name}
                        </span>
                      </div>

                      {/* Right Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPassed && (
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                            Passed
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                          {chapCount} Ch
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ======================================================================= */}
        {/* ── RIGHT COLUMN: CHAPTERS & SCOPE STUDIO ── */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 rounded-[22px] border border-white/[0.08] bg-[#0E131F]/80 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] h-full">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
                <BookOpen className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black uppercase text-[#F8FAFC] tracking-wider">
                  CHAPTERS &amp; SCOPE STUDIO
                </h2>
                <p className="text-[10px] text-[#94A3B8]">
                  Select individual chapters with target scope
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllDisplayedChapters}
                className="text-[10px] font-bold text-[#818CF8] hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-white/20">·</span>
              <button
                type="button"
                onClick={clearAllChapters}
                className="text-[10px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* ── CHAPTER LIST SECTION (GROUPED BY SELECTED SUBJECTS) ── */}
          <div className="space-y-4 min-h-[580px] max-h-[580px] overflow-y-auto pr-1 flex-1">
            {selectedSubjectsList.length === 0 ? (
              <div className="h-full min-h-[540px] flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] text-center">
                <BookOpen className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#F8FAFC]">No Subject Selected</p>
                <p className="text-[11px] text-[#94A3B8] mt-1 max-w-xs mx-auto">
                  Select one or more program tracks or syllabus subjects from the left container to inspect and target chapters.
                </p>
              </div>
            ) : (
              selectedSubjectsList.map(subj => {
                const prog = programs.find(p => p.id === subj.programId);
                const progName = prog?.name || 'C1';
                const subjChapters = sortChaptersNumerically(
                  chapters.filter(c => c.subjectId === subj.id && !c.isSkipped)
                );

                return (
                  <div key={subj.id} className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.01] p-2.5">
                    
                    {/* Subject Header Bar */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#818CF8]" />
                        <span className="text-sm font-black text-white">{subj.name}</span>
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                          {progName}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70">
                          {subjChapters.length} Ch
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllChaptersForSubject(subj.id)}
                          className="text-[10px] font-bold text-[#818CF8] hover:text-white cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-white/20">·</span>
                        <button
                          type="button"
                          onClick={() => clearChaptersForSubject(subj.id)}
                          className="text-[10px] font-bold text-white/40 hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Chapter Rows */}
                    <div className="space-y-1.5 pt-1">
                      {subjChapters.length === 0 ? (
                        <div className="py-3 text-center text-xs text-white/40">
                          No chapters available in this subject.
                        </div>
                      ) : (
                        subjChapters.map(chap => {
                          const isSelected = selectedChapterIds.has(chap.id);
                          const isCompleted = isChapterCompleted(chap);
                          const boundWeek = chapterBindingsMap[chap.id]?.weekKey;
                          const topicName = chap.topicName || chap.title || getChapterTopicDisplay(chap) || `Topic ${chap.chapterNumber}`;

                          return (
                            <div
                              key={chap.id}
                              onClick={() => toggleChapterSelection(chap.id)}
                              className={`
                                group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none
                                transition-all duration-150
                                ${isSelected
                                  ? 'border-[#6366F1]/50 bg-[#6366F1]/[0.08] shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                                  : 'border-white/[0.06] bg-[#0A0E18]/60 hover:bg-white/[0.03] text-[#94A3B8] hover:-translate-y-0.5'
                                }
                              `}
                            >
                              {/* Left Part: Checkbox + Ch. No - Topic Name */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                {/* Checkbox */}
                                <div
                                  className={`
                                    h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-all
                                    ${isSelected
                                      ? 'bg-[#06B6D4] border-[#06B6D4] text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                                      : 'border-white/30 bg-white/[0.02]'
                                    }
                                  `}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>

                                {/* Chapter Number */}
                                <span className="text-xs font-bold text-[#F8FAFC] shrink-0 font-mono">
                                  Ch. {chap.chapterNumber}
                                </span>

                                {/* Dash Separator */}
                                <span className="text-white/20 shrink-0 font-bold">-</span>

                                {/* Topic Name */}
                                <span 
                                  className="text-xs font-medium text-white/70 truncate flex-1 hover:text-white transition-colors" 
                                  title={topicName}
                                >
                                  {topicName}
                                </span>
                              </div>

                              {/* Right Part: Fixed Columns for Perfect Alignment across All Rows */}
                              <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                {/* Column 1: Chapter Done or Not (moved a little left, non-clickable) */}
                                <div className="w-8 flex items-center justify-center shrink-0 mr-3 select-none pointer-events-none">
                                  {isCompleted ? (
                                    <div 
                                      className="h-6 w-6 rounded-md flex items-center justify-center bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                                      title="Chapter Done ✔"
                                    >
                                      <Check className="h-3.5 w-3.5 stroke-[3] text-[#10B981]" />
                                    </div>
                                  ) : (
                                    <div 
                                      className="h-6 w-6 rounded-md flex items-center justify-center bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                                      title="Chapter Not Done ❌"
                                    >
                                      <X className="h-3.5 w-3.5 stroke-[2.5] text-[#EF4444]" />
                                    </div>
                                  )}
                                </div>

                                {/* Column 2: Stars (Fixed w-14 width so 0, 1, 2, or 3 stars NEVER shift other columns! Non-clickable) */}
                                <div className="w-14 flex items-center justify-center shrink-0 select-none pointer-events-none mr-3">
                                  {(() => {
                                    const stars = getChapterStarCount(chap);
                                    const targetCount = getChapterTargetAppearanceCount(chap);

                                    if (stars === 0) {
                                      // Empty placeholder occupying exact same space so layout never shifts
                                      return <div className="h-6 w-full" />;
                                    }

                                    if (stars === 1) {
                                      return (
                                        <div 
                                          className="h-6 flex items-center justify-center"
                                          title="2nd time target set (1 star ⭐)"
                                        >
                                          <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                                        </div>
                                      );
                                    }

                                    // 2 stars or more (e.g. 3rd time target set: [ 2⭐ ])
                                    return (
                                      <div 
                                        className="h-6 px-1.5 rounded-md bg-amber-400/15 border border-amber-400/35 text-amber-400 flex items-center gap-1 shrink-0"
                                        title={`${targetCount}rd time target set (${stars}⭐)`}
                                      >
                                        <span className="font-mono text-[11px] font-bold leading-none">{stars}</span>
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Column 3: 0 / 1 badge (Fixed w-7) */}
                                <div className="w-7 flex items-center justify-center shrink-0 select-none mr-2.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/[0.06]">
                                    {boundWeek ? '1' : '0'}
                                  </span>
                                </div>

                                {/* Column 4: Week Dropdown (Fixed width, darkish, format W2 [ 3 oct - 9 oct ]) */}
                                <div className="w-[185px] shrink-0">
                                  <select
                                    value={boundWeek || ''}
                                    onChange={(e) => handleSingleChapterWeekChange(chap, subj, e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className={`
                                      w-full text-xs font-mono font-medium px-2 py-1 rounded-lg border focus:outline-none cursor-pointer truncate transition-colors
                                      ${boundWeek
                                        ? 'bg-[#081326] border-[#06B6D4]/50 text-[#22D3EE] shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                                        : 'bg-[#0A0E18] border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'
                                      }
                                    `}
                                    title="Assign or change week"
                                  >
                                    <option 
                                      value="" 
                                      className="bg-[#0A0E18] text-white/50 py-1"
                                      style={{ backgroundColor: '#0A0E18', color: '#94A3B8' }}
                                    >
                                      -- No Week --
                                    </option>
                                    {currentMonthWeeks.map(w => (
                                      <option 
                                        key={w.id} 
                                        value={w.id} 
                                        className="bg-[#0A0E18] text-white py-1 font-mono text-xs"
                                        style={{ backgroundColor: '#0A0E18', color: '#F1F5F9' }}
                                      >
                                        {formatWeekDropdownLabel(w)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* ── BOTTOM ACTION FOOTER: ADD TO MONTHLY TARGET ── */}
          <div className="mt-auto pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-[#94A3B8]">
              {selectedChapterIds.size > 0 ? (
                <span>
                  <strong className="text-[#F8FAFC]">{selectedChapterIds.size}</strong> chapter(s) selected
                </span>
              ) : (
                <span>Select chapters to add to monthly targets</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAllocateMonthlyTargets}
              className="px-4 py-2 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/40 text-[#10B981] hover:text-white text-xs font-black tracking-wide transition-none md:transition-all cursor-pointer active:scale-95 flex items-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.25)] shrink-0"
              title="Add selected chapters to Monthly Targets"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add to Monthly Target</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export const MonthlyTargetSetupView = React.memo(MonthlyTargetSetupViewComponent);
MonthlyTargetSetupView.displayName = 'MonthlyTargetSetupView';
