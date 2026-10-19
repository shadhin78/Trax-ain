/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Check, Sparkles, FolderEdit, ArrowRight } from 'lucide-react';
import { useDailyActions } from '../../context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { MonthlyTarget, WeeklyTarget } from '../../types';
import { formatChapterTargetDisplay } from '../../utils/targetDisplayUtils';
import { resolveTargetChapterId } from '../../utils/chapterTargetSync';
import { getMonthWeeksByMonthKey, MonthWeekOption } from '../../utils/weekUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface EditTargetAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: MonthlyTarget | WeeklyTarget | null;
  targetType: 'monthly' | 'weekly';
}

export const EditTargetAllocationModal: React.FC<EditTargetAllocationModalProps> = ({
  isOpen,
  onClose,
  target,
  targetType,
}) => {
  const {
    monthlyTargets,
    weeklyTargets,
    updateMonthlyTarget,
    addMonthlyTarget,
    updateWeeklyTarget,
    addWeeklyTarget,
    deleteWeeklyTarget,
    bindChapterToWeek,
    unbindChapterFromWeek,
  } = useDailyActions();

  const { chapters, subjects } = useAcademicHierarchy();

  const [isClosing, setIsClosing] = useState(false);

  // Parse initial Month and Year from target
  const initialDate = useMemo(() => {
    if (!target) return new Date();

    if ('monthKey' in target && target.monthKey) {
      const [y, m] = target.monthKey.split('-');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    }

    if ('weekKey' in target && target.weekKey) {
      // If weekKey is month-week formatted: 'YYYY-MM-Ww'
      const match = target.weekKey.match(/^(\d{4})-(\d{2})-W\d+/);
      if (match) {
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1);
      }

      // Check linked monthly target
      if (target.monthlyTargetId) {
        const mt = monthlyTargets.find(m => m.id === target.monthlyTargetId);
        if (mt?.monthKey) {
          const [y, m] = mt.monthKey.split('-');
          return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        }
      }

      // Check by chapterId
      if (target.chapterId) {
        const mt = monthlyTargets.find(m => m.chapterId === target.chapterId);
        if (mt?.monthKey) {
          const [y, m] = mt.monthKey.split('-');
          return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        }
      }
    }

    return new Date();
  }, [target, monthlyTargets]);

  const [selectedYear, setSelectedYear] = useState<number>(() => initialDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => initialDate.getMonth());

  // Selected Week Key
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('');

  // Synchronize state whenever target changes or modal opens
  useEffect(() => {
    if (!target || !isOpen) return;

    const y = initialDate.getFullYear();
    const m = initialDate.getMonth();
    setSelectedYear(y);
    setSelectedMonthIndex(m);

    // Initial weekKey
    if ('weekKey' in target && target.weekKey) {
      setSelectedWeekKey(target.weekKey);
    } else {
      // Find if chapter already has a weekly target
      const chapId = target.chapterId || resolveTargetChapterId(target, chapters, subjects);
      if (chapId) {
        const wt = weeklyTargets.find(w => w.chapterId === chapId);
        setSelectedWeekKey(wt ? wt.weekKey : '');
      } else {
        const wt = weeklyTargets.find(w => w.monthlyTargetId === target.id);
        setSelectedWeekKey(wt ? wt.weekKey : '');
      }
    }
  }, [target, isOpen, initialDate, chapters, subjects, weeklyTargets]);

  // Derived Month Key (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    return `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
  }, [selectedYear, selectedMonthIndex]);

  // Weeks available for selected month
  const monthWeeks = useMemo(() => {
    return getMonthWeeksByMonthKey(currentMonthKey);
  }, [currentMonthKey]);

  // Helper to format week dropdown label
  const formatWeekOptionLabel = useCallback((week: MonthWeekOption): string => {
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = monthShorts[selectedMonthIndex];
    const sPad = String(week.startDay).padStart(2, '0');
    const ePad = String(week.endDay).padStart(2, '0');
    const dayCountStr = week.daysCount === 1 ? '1 day' : `${week.daysCount} days`;
    return `W${week.weekIndex} [ ${sPad} ${m} - ${ePad} ${m} · ${dayCountStr} ]`;
  }, [selectedMonthIndex]);

  // When month changes, if current selectedWeekKey doesn't belong to new month, map by week index if possible
  const handleMonthOrYearChange = (newYear: number, newMonthIndex: number) => {
    setSelectedYear(newYear);
    setSelectedMonthIndex(newMonthIndex);

    const newMonthKey = `${newYear}-${String(newMonthIndex + 1).padStart(2, '0')}`;
    const newWeeks = getMonthWeeksByMonthKey(newMonthKey);

    if (!selectedWeekKey) {
      // Keep unassigned
      return;
    }

    // Try matching existing week index
    const prevWeekIndexMatch = selectedWeekKey.match(/-W(\d+)$/);
    if (prevWeekIndexMatch) {
      const idx = parseInt(prevWeekIndexMatch[1], 10);
      const matched = newWeeks.find(w => w.weekIndex === idx);
      if (matched) {
        setSelectedWeekKey(matched.id);
        return;
      }
    }

    // Fallback: pick first week of new month
    if (newWeeks.length > 0) {
      setSelectedWeekKey(newWeeks[0].id);
    } else {
      setSelectedWeekKey('');
    }
  };

  // Close animation
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

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') initiateClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || !target || typeof document === 'undefined') return null;

  const displayInfo = formatChapterTargetDisplay(target, chapters, subjects);

  // Available Years (e.g. current year - 1 to current year + 3)
  const currentSystemYear = new Date().getFullYear();
  const availableYears = [
    currentSystemYear - 1,
    currentSystemYear,
    currentSystemYear + 1,
    currentSystemYear + 2,
    currentSystemYear + 3,
  ];

  // Save / Done handler
  const handleDone = (e: React.FormEvent) => {
    e.preventDefault();

    const chapId = target.chapterId || resolveTargetChapterId(target, chapters, subjects);
    const targetTitle = target.title.trim();
    const targetTrack = target.track?.trim();
    const targetSize = target.size;
    const targetUnit = target.unitLabel || 'Chapters';
    const targetCount = target.targetCount || 1;
    const isComplete = target.isCompleted;

    const matchedWeek = monthWeeks.find(w => w.id === selectedWeekKey);
    const weekLabel = matchedWeek ? formatWeekOptionLabel(matchedWeek) : selectedWeekKey;
    const newNotes = selectedWeekKey
      ? `Month: ${currentMonthKey} | ${weekLabel}`
      : `Month: ${currentMonthKey}`;

    if (targetType === 'monthly') {
      // 1. Update Monthly Target
      updateMonthlyTarget(target.id, {
        monthKey: currentMonthKey,
        notes: newNotes,
      });

      // 2. Weekly Target Synchronization
      if (selectedWeekKey) {
        if (chapId) {
          bindChapterToWeek({
            chapterId: chapId,
            weekKey: selectedWeekKey,
            title: targetTitle,
            track: targetTrack,
            size: targetSize,
            notes: newNotes,
          });
        } else {
          // Check if custom target already exists in weekly
          const existingWt = weeklyTargets.find(
            w => w.monthlyTargetId === target.id || w.title.trim().toLowerCase() === targetTitle.toLowerCase()
          );
          if (existingWt) {
            updateWeeklyTarget(existingWt.id, { weekKey: selectedWeekKey, notes: newNotes });
          } else {
            addWeeklyTarget({
              title: targetTitle,
              targetCount,
              unitLabel: targetUnit,
              track: targetTrack,
              weekKey: selectedWeekKey,
              monthlyTargetId: target.id,
              notes: newNotes,
            });
          }
        }
      } else {
        // Unassigned from week: remove from weekly targets
        if (chapId) {
          unbindChapterFromWeek(chapId);
        } else {
          const existingWt = weeklyTargets.find(
            w => w.monthlyTargetId === target.id || w.title.trim().toLowerCase() === targetTitle.toLowerCase()
          );
          if (existingWt) {
            deleteWeeklyTarget(existingWt.id);
          }
        }
      }
    } else {
      // targetType === 'weekly'
      // 1. Weekly Target
      if (selectedWeekKey) {
        updateWeeklyTarget(target.id, {
          weekKey: selectedWeekKey,
          notes: newNotes,
        });
        if (chapId) {
          bindChapterToWeek({
            chapterId: chapId,
            weekKey: selectedWeekKey,
            title: targetTitle,
            track: targetTrack,
            size: targetSize,
            notes: newNotes,
          });
        }
      } else {
        // User selected None: unassign from weekly (remains in monthly only)
        if (chapId) {
          unbindChapterFromWeek(chapId);
        } else {
          unbindChapterFromWeek(target.id);
        }
      }

      // 2. Monthly Target
      const existingMt = monthlyTargets.find(m => {
        if (chapId && (m.chapterId === chapId || resolveTargetChapterId(m, chapters, subjects) === chapId)) {
          return true;
        }
        if ('monthlyTargetId' in target && target.monthlyTargetId && m.id === target.monthlyTargetId) return true;
        if (m.title.trim().toLowerCase() === targetTitle.toLowerCase()) return true;
        return false;
      });

      if (existingMt) {
        updateMonthlyTarget(existingMt.id, {
          monthKey: currentMonthKey,
          notes: newNotes,
        });
      } else {
        addMonthlyTarget({
          title: targetTitle,
          targetCount,
          completedCount: isComplete ? targetCount : 0,
          unitLabel: targetUnit,
          track: targetTrack,
          monthKey: currentMonthKey,
          chapterId: chapId,
          size: targetSize,
          notes: newNotes,
        });
      }
    }

    initiateClose();
  };

  const selectedWeekObj = monthWeeks.find(w => w.id === selectedWeekKey);

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
          w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col font-mono relative overflow-hidden
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glows */}
        <div
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-[#818CF8]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow-[0_0_16px_rgba(56,189,248,0.2)]">
              <FolderEdit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight">
                Edit Target Allocation
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Change assigned month and week schedule
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Details Badge */}
        <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative z-10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              Target Chapter
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
              {targetType === 'monthly' ? 'Monthly Target' : 'Weekly Target'}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 flex-nowrap min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] shrink-0">
              {displayInfo.subjectName}
            </span>
            <span className="text-white/30 text-xs font-mono shrink-0">-</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-[#818CF8] shrink-0">
              {displayInfo.chapterNumber && (String(displayInfo.chapterNumber).trim().toLowerCase().startsWith('ch')
                ? displayInfo.chapterNumber
                : `Ch ${displayInfo.chapterNumber}`)}
            </span>
            {displayInfo.topicName && (
              <>
                <span className="text-white/30 text-xs font-mono shrink-0">-</span>
                <span
                  className="text-xs font-normal text-[#94A3B8] truncate min-w-0"
                  title={displayInfo.topicName}
                >
                  {displayInfo.topicName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Allocation Form */}
        <form onSubmit={handleDone} className="mt-5 space-y-4 relative z-10">
          {/* 1st: Month & Year Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              1. Month & Year <span className="text-[#38BDF8]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Month Dropdown */}
              <div className="relative">
                <select
                  value={selectedMonthIndex}
                  onChange={(e) => handleMonthOrYearChange(selectedYear, parseInt(e.target.value, 10))}
                  className="w-full bg-[#0E121B]/95 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none transition-all cursor-pointer font-bold"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx} className="bg-[#0E121B] text-[#F8FAFC]">
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => handleMonthOrYearChange(parseInt(e.target.value, 10), selectedMonthIndex)}
                  className="w-full bg-[#0E121B]/95 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none transition-all cursor-pointer font-bold"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-[#0E121B] text-[#F8FAFC]">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-white/40">
              Selected Target Month: <span className="text-[#38BDF8] font-bold">{MONTH_NAMES[selectedMonthIndex]} {selectedYear}</span> ({currentMonthKey})
            </p>
          </div>

          {/* 2nd: Weekly Allocation Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              2. Weekly Allocation ({MONTH_NAMES[selectedMonthIndex]})
            </label>
            <select
              value={selectedWeekKey}
              onChange={(e) => setSelectedWeekKey(e.target.value)}
              className="w-full bg-[#0E121B]/95 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none transition-all cursor-pointer"
            >
              <option value="" className="bg-[#0E121B] text-[#94A3B8]">
                None (Monthly Target Only · Unassigned from week)
              </option>
              {monthWeeks.map((w) => (
                <option key={w.id} value={w.id} className="bg-[#0E121B] text-[#F8FAFC]">
                  {formatWeekOptionLabel(w)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-white/40">
              {selectedWeekKey
                ? `Will place this chapter in ${MONTH_NAMES[selectedMonthIndex]}'s ${selectedWeekObj?.label || selectedWeekKey}`
                : `Will assign only to Monthly Targets for ${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`}
            </p>
          </div>

          {/* Summary Preview Banner */}
          <div className="p-3 rounded-xl bg-[#38BDF8]/[0.06] border border-[#38BDF8]/20 flex items-center justify-between text-xs">
            <span className="text-[#94A3B8]">New Schedule:</span>
            <div className="flex items-center gap-1.5 font-bold text-[#38BDF8]">
              <span>{MONTH_NAMES[selectedMonthIndex]} {selectedYear}</span>
              <ArrowRight className="h-3 w-3 text-white/40" />
              <span>{selectedWeekObj ? `W${selectedWeekObj.weekIndex}` : 'Monthly Only'}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={initiateClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-black font-black text-xs shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-all cursor-pointer active:scale-95"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Done</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
