/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ChevronDown } from 'lucide-react';
import { useDailySchedule } from '../../context/DailyScheduleContext';
import { RoutineBlock } from '../../types';
import { doTimeSpansOverlap } from '../../utils';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHour?: number;
  existingBlock?: RoutineBlock | null;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue (Selected in reference design)
  '#8B5CF6', // Purple
  '#F43F5E', // Rose / Red
  '#10B981', // Emerald / Green
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#64748B', // Slate / Gray
];

export const ROUTINE_CATEGORIES = [
  { id: 'Study', name: 'Study', icon: '📚', color: '#3B82F6' },
  { id: 'Work', name: 'Work', icon: '💼', color: '#8B5CF6' },
  { id: 'Travel', name: 'Travel', icon: '🚗', color: '#F59E0B' },
  { id: 'Health', name: 'Health / Fitness', icon: '🏋️', color: '#10B981' },
  { id: 'Sleep', name: 'Sleep / Rest', icon: '😴', color: '#6366F1' },
  { id: 'Meal', name: 'Meal / Nutrition', icon: '🍽️', color: '#F97316' },
  { id: 'Personal', name: 'Personal', icon: '👤', color: '#EC4899' },
  { id: 'Mindfulness', name: 'Mindfulness / Prayer', icon: '🧘', color: '#06B6D4' },
  { id: 'General', name: 'General Routine', icon: '📋', color: '#64748B' },
];

export function parseTimeToMinutes(timeStr?: string, defaultHour?: number): number {
  if (!timeStr) return defaultHour !== undefined ? defaultHour * 60 : 0;
  const clean = timeStr.trim().toLowerCase();
  const isPM = clean.includes('pm');
  const isAM = clean.includes('am');
  const sanitized = clean.replace(/am|pm/g, '').trim().replace('.', ':');
  const parts = sanitized.split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return ((h % 24) * 60 + (m % 60));
}

export function formatMinutesTo12(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatMinutesTo24(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface BlockSegment {
  hour: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationHours: number;
}

export function calculateBlockSegments(startMinutes: number, endMinutes: number): BlockSegment[] {
  let adjustedEnd = endMinutes;
  if (adjustedEnd <= startMinutes) {
    adjustedEnd += 1440; // Overnight wrap-around
  }

  const segments: BlockSegment[] = [];
  let current = startMinutes;

  while (current < adjustedEnd) {
    const currentClockHour = Math.floor(current / 60);
    const nextHourBoundary = (currentClockHour + 1) * 60;
    const segmentEnd = Math.min(adjustedEnd, nextHourBoundary);
    const duration = segmentEnd - current;

    if (duration > 0) {
      segments.push({
        hour: currentClockHour % 24,
        startTime: formatMinutesTo12(current),
        endTime: formatMinutesTo12(segmentEnd),
        durationMinutes: duration,
        durationHours: Math.round((duration / 60) * 100) / 100,
      });
    }

    current = segmentEnd;
  }

  return segments;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({
  isOpen,
  onClose,
  defaultHour = 9,
  existingBlock = null,
}) => {
  const {
    activeRoutine,
    groups,
    categories,
    addBlock,
    updateBlock,
    deleteBlock,
    updateSession,
    deleteSession,
  } = useDailySchedule();

  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [startTimeInput, setStartTimeInput] = useState<string>('09:00');
  const [endTimeInput, setEndTimeInput] = useState<string>('10:00');
  const [isDayStart, setIsDayStart] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [hasCustomColor, setHasCustomColor] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'single' | 'all'>('single');

  const prevIsOpenRef = useRef(false);
  const prevBlockIdRef = useRef<string | null>(null);

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return ROUTINE_CATEGORIES;
  }, [categories]);

  // Find all sibling blocks belonging to the same session
  const sessionBlocks = useMemo(() => {
    if (!existingBlock || !activeRoutine || !Array.isArray(activeRoutine.blocks)) return [];
    if (existingBlock.sessionId) {
      return activeRoutine.blocks
        .filter((b) => b.sessionId === existingBlock.sessionId)
        .sort((a, b) => a.hour - b.hour);
    }
    return [existingBlock];
  }, [existingBlock, activeRoutine?.blocks]);

  // Session start/end minutes
  const sessionStartM = useMemo(() => {
    if (sessionBlocks.length === 0) return defaultHour * 60;
    if (existingBlock?.sessionStartTime) {
      return parseTimeToMinutes(existingBlock.sessionStartTime);
    }
    return sessionBlocks[0].hour * 60;
  }, [sessionBlocks, existingBlock, defaultHour]);

  const sessionEndM = useMemo(() => {
    if (sessionBlocks.length === 0) return (defaultHour + 1) * 60;
    if (existingBlock?.sessionEndTime) {
      return parseTimeToMinutes(existingBlock.sessionEndTime);
    }
    const last = sessionBlocks[sessionBlocks.length - 1];
    return (last.hour + 1) * 60;
  }, [sessionBlocks, existingBlock, defaultHour]);

  const singleBlockStartM = useMemo(() => {
    if (!existingBlock) return defaultHour * 60;
    if (existingBlock.startTime) return parseTimeToMinutes(existingBlock.startTime);
    return existingBlock.hour * 60;
  }, [existingBlock, defaultHour]);

  const singleBlockEndM = useMemo(() => {
    if (!existingBlock) return (defaultHour + 1) * 60;
    if (existingBlock.endTime) return parseTimeToMinutes(existingBlock.endTime);
    return (existingBlock.hour + 1) * 60;
  }, [existingBlock, defaultHour]);

  // Synchronize state ONLY when modal opens (false -> true) or the selected block changes
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowOpen = isOpen;
    prevIsOpenRef.current = isOpen;

    const currentBlockId = existingBlock ? existingBlock.id : null;
    const blockChanged = currentBlockId !== prevBlockIdRef.current;
    prevBlockIdRef.current = currentBlockId;

    if (isNowOpen && (!wasOpen || blockChanged)) {
      if (existingBlock) {
        setTitle(existingBlock.title || '');
        setSelectedCategory(existingBlock.category || '');
        setIsDayStart(Boolean(existingBlock.isDayStart));
        setSelectedGroupId(existingBlock.groupId || groups[0]?.id || '');
        const blockColor = existingBlock.color || PRESET_COLORS[0];
        setColor(blockColor);
        setHasCustomColor(Boolean(existingBlock.color));

        // 1 HR is the default edit mode when editing daily slot
        setEditMode('single');
        setStartTimeInput(formatMinutesTo24(singleBlockStartM));
        setEndTimeInput(formatMinutesTo24(singleBlockEndM));
      } else {
        setTitle('');
        setSelectedCategory('');

        // If defaultHour already has a block partially occupying it, default start time after it
        const hourBlocks = (activeRoutine?.blocks || []).filter((b) => b.hour === defaultHour);
        let initialStartM = defaultHour * 60;
        let initialEndM = (defaultHour + 1) * 60;

        if (hourBlocks.length > 0) {
          let maxEndInHour = initialStartM;
          for (const b of hourBlocks) {
            const bEnd = parseTimeToMinutes(b.endTime, (b.hour + 1) % 24);
            if (bEnd > maxEndInHour && bEnd <= initialEndM) {
              maxEndInHour = bEnd;
            }
          }
          if (maxEndInHour > initialStartM && maxEndInHour < initialEndM) {
            initialStartM = maxEndInHour;
          }
        }

        setStartTimeInput(formatMinutesTo24(initialStartM));
        setEndTimeInput(formatMinutesTo24(initialEndM));
        setIsDayStart(false);
        setSelectedGroupId(groups[0]?.id || '');
        setColor(PRESET_COLORS[0]);
        setHasCustomColor(false);
        setEditMode('all');
      }
    }
  }, [isOpen, existingBlock, defaultHour, activeRoutine?.blocks]);

  // Toggle between 1 HR and ALL mode
  const handleToggleEditMode = (mode: 'single' | 'all') => {
    setEditMode(mode);
    if (mode === 'single') {
      setStartTimeInput(formatMinutesTo24(singleBlockStartM));
      setEndTimeInput(formatMinutesTo24(singleBlockEndM));
    } else {
      setStartTimeInput(formatMinutesTo24(sessionStartM));
      setEndTimeInput(formatMinutesTo24(sessionEndM));
    }
  };

  // Handle Escape key to close modal
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

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Compute live segmentation and duration
  const startMins = useMemo(() => parseTimeToMinutes(startTimeInput), [startTimeInput]);
  const endMins = useMemo(() => parseTimeToMinutes(endTimeInput), [endTimeInput]);

  const segments = useMemo(() => {
    return calculateBlockSegments(startMins, endMins);
  }, [startMins, endMins]);

  // Conflict detection: Check actual time interval overlap
  const conflictingBlocks = useMemo(() => {
    if (!activeRoutine || !Array.isArray(activeRoutine.blocks)) return [];
    return activeRoutine.blocks.filter((b) => {
      if (existingBlock) {
        if (editMode === 'all') {
          // In ALL mode: neither sibling session blocks nor the existing block are conflicts
          if (existingBlock.sessionId && b.sessionId === existingBlock.sessionId) return false;
          if (b.id === existingBlock.id) return false;
        } else {
          // In 1 HR mode: the edited block itself is not a conflict
          if (b.id === existingBlock.id) return false;
        }
      }
      return segments.some((seg) => doTimeSpansOverlap(seg, b));
    });
  }, [activeRoutine?.blocks, segments, existingBlock, editMode]);

  const totalDurationMinutes = useMemo(() => {
    let diff = endMins - startMins;
    if (diff <= 0) diff += 1440;
    return diff;
  }, [startMins, endMins]);

  const totalDurationFormatted = useMemo(() => {
    const hrs = Math.floor(totalDurationMinutes / 60);
    const mins = totalDurationMinutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
    if (hrs > 0) return `${hrs} hr`;
    return `${mins} min`;
  }, [totalDurationMinutes]);

  // Check if another block in activeRoutine already has isDayStart set
  const existingDayStartBlock = useMemo(() => {
    return activeRoutine?.blocks.find((b) => b.isDayStart);
  }, [activeRoutine]);

  const isCurrentBlockDayStart = Boolean(
    existingBlock && existingDayStartBlock && (
      existingBlock.id === existingDayStartBlock.id ||
      (existingBlock.sessionId && existingBlock.sessionId === existingDayStartBlock.sessionId)
    )
  );
  const isDayStartLocked = Boolean(existingDayStartBlock && !isCurrentBlockDayStart);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (conflictingBlocks.length > 0) return; // Strict block against collision

    const matchedGroup = groups.find((g) => g.id === selectedGroupId);

    const slotSessionId =
      editMode === 'all' && existingBlock?.sessionId
        ? existingBlock.sessionId
        : `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const slotStartTime = formatMinutesTo12(startMins);
    const slotEndTime = formatMinutesTo12(endMins);

    const basePayload = {
      title: title.trim(),
      category: selectedCategory || undefined,
      sessionId: slotSessionId,
      sessionStartTime: slotStartTime,
      sessionEndTime: slotEndTime,
      groupId: selectedGroupId || undefined,
      groupName: matchedGroup?.name || 'GENERAL',
      color,
    };

    if (existingBlock) {
      if (editMode === 'all' && (existingBlock.sessionId || sessionBlocks.length > 1)) {
        // Replace all blocks in the session with updated segments
        const targetSessionId = existingBlock.sessionId || slotSessionId;
        const updatedSegments = segments.map((seg, idx) => ({
          ...basePayload,
          sessionId: targetSessionId,
          hour: seg.hour,
          startTime: seg.startTime,
          endTime: seg.endTime,
          durationMinutes: seg.durationMinutes,
          durationHours: seg.durationHours,
          isDayStart: idx === 0 && !isDayStartLocked ? isDayStart : false,
        }));

        if (existingBlock.sessionId) {
          await updateSession(existingBlock.sessionId, updatedSegments);
        } else {
          await deleteBlock(existingBlock.id);
          await addBlock(updatedSegments);
        }
      } else {
        // Editing single block (1 HR scope)
        const primarySeg = segments[0] || {
          hour: Math.floor(startMins / 60) % 24,
          startTime: formatMinutesTo12(startMins),
          endTime: formatMinutesTo12(endMins),
          durationMinutes: Math.max(1, totalDurationMinutes),
          durationHours: Math.round((totalDurationMinutes / 60) * 100) / 100,
        };

        await updateBlock(existingBlock.id, {
          ...basePayload,
          hour: primarySeg.hour,
          startTime: primarySeg.startTime,
          endTime: primarySeg.endTime,
          durationMinutes: primarySeg.durationMinutes,
          durationHours: primarySeg.durationHours,
          isDayStart: isDayStartLocked ? false : isDayStart,
        });

        if (segments.length > 1) {
          const remainingSegments = segments.slice(1).map((seg) => ({
            ...basePayload,
            hour: seg.hour,
            startTime: seg.startTime,
            endTime: seg.endTime,
            durationMinutes: seg.durationMinutes,
            durationHours: seg.durationHours,
            isDayStart: false,
          }));
          await addBlock(remainingSegments);
        }
      }
    } else {
      // Adding new block(s)
      const blocksToAdd = segments.map((seg, idx) => ({
        ...basePayload,
        hour: seg.hour,
        startTime: seg.startTime,
        endTime: seg.endTime,
        durationMinutes: seg.durationMinutes,
        durationHours: seg.durationHours,
        isDayStart: idx === 0 && !isDayStartLocked ? isDayStart : false,
      }));
      await addBlock(blocksToAdd);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (existingBlock) {
      if (editMode === 'all' && existingBlock.sessionId && sessionBlocks.length > 1) {
        await deleteSession(existingBlock.sessionId);
      } else {
        await deleteBlock(existingBlock.id);
      }
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-slot-modal-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[28px] border border-white/[0.12] bg-[#0E1320]/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ROW ── */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#18233C] border border-[#2563EB]/40 flex items-center justify-center text-[#3B82F6] shadow-[0_0_14px_rgba(59,130,246,0.25)]">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </div>

            <div>
              <h3
                id="daily-slot-modal-title"
                className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight"
              >
                {existingBlock ? 'Edit Daily Slot' : 'Add Daily Slot'}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-wider uppercase mt-0.5">
                PLAN YOUR DAILY SCHEDULE SLOT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-9 w-9 rounded-xl bg-[#1E2538] hover:bg-[#28324D] border border-white/[0.08] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 2 SYSTEM BUTTON (1 HR vs ALL) WHEN EDITING MULTI-HOUR SLOT ── */}
        {existingBlock && sessionBlocks.length > 1 && (
          <div className="mt-4 flex items-center gap-2 p-1.5 rounded-xl bg-[#141A28] border border-white/[0.08]">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase px-2 shrink-0">
              EDIT SCOPE:
            </span>
            <button
              type="button"
              onClick={() => handleToggleEditMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                editMode === 'single'
                  ? 'bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              1 HR
            </button>
            <button
              type="button"
              onClick={() => handleToggleEditMode('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                editMode === 'all'
                  ? 'bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              ALL ({sessionBlocks.length} HRS)
            </button>
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 1. START TIME & END TIME */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  START TIME:
                </label>
                <input
                  type="time"
                  required
                  value={startTimeInput}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  END TIME:
                </label>
                <input
                  type="time"
                  required
                  value={endTimeInput}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Live Segmentation & Duration Summary with OCCUPIED badge inside */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono">
              <span className="text-[#94A3B8]">
                Span: <strong className="text-[#F8FAFC]">{formatMinutesTo12(startMins)} - {formatMinutesTo12(endMins)}</strong>
              </span>

              {conflictingBlocks.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-[10px] tracking-wider uppercase md:animate-in md:fade-in-0">
                  Occupied
                </span>
              )}

              <span className="text-[#38BDF8] font-bold">
                {totalDurationFormatted} ({segments.length} {segments.length === 1 ? 'block' : 'blocks'})
              </span>
            </div>
          </div>

          {/* 2. WORK NAME */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              WORK NAME:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Study Session"
              className="w-full h-12 px-4 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] placeholder:text-white/20 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none"
              autoFocus
            />
          </div>

          {/* 3. CATEGORY & DAY START SETTING MERGED IN ONE ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 items-start">
            {/* Category Dropdown */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                CATEGORY:
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const catName = e.target.value;
                    setSelectedCategory(catName);
                    const matched = availableCategories.find((c) => c.name === catName);
                    if (matched) {
                      if (!title.trim()) {
                        setTitle(matched.name);
                      }
                      if (matched.color && !hasCustomColor) {
                        setColor(matched.color);
                      }
                    }
                  }}
                  className="w-full h-12 pl-4 pr-10 rounded-xl border border-white/[0.1] bg-[#141A28] font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#0E1320] text-white">None (Optional)</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.name} className="bg-[#0E1320] text-white">
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* Day Start Settings */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                DAY START SETTING:
              </label>
              <label
                className={`w-full h-12 px-3.5 rounded-xl border flex items-center gap-2.5 select-none transition-colors ${
                  isDayStartLocked
                    ? 'border-white/[0.06] bg-[#141A28]/50 opacity-60 cursor-not-allowed'
                    : 'border-white/[0.1] bg-[#141A28] cursor-pointer hover:border-white/[0.18]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDayStart}
                  disabled={isDayStartLocked}
                  onChange={(e) => {
                    if (!isDayStartLocked) {
                      setIsDayStart(e.target.checked);
                    }
                  }}
                  className="w-4 h-4 rounded bg-[#0B0F19] border border-white/20 text-[#2563EB] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#2563EB] disabled:cursor-not-allowed shrink-0"
                />
                <span className="text-[11px] sm:text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5 truncate">
                  <span className="text-sm">🔆</span>
                  <span className="truncate">Start timeline here</span>
                </span>
              </label>
              {isDayStartLocked && (
                <p className="mt-1 text-[9.5px] text-amber-400/90 font-mono leading-tight truncate">
                  ⚠ Already set on "{existingDayStartBlock?.title}". Uncheck first.
                </p>
              )}
            </div>
          </div>

          {/* 4. ROUTINE COLOR */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
              ROUTINE COLOR:
            </label>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              {PRESET_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setHasCustomColor(true);
                    }}
                    className={`h-8 w-8 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-[#0E1320] scale-110 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                );
              })}
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="border-t border-white/[0.08] pt-2" />

          {/* ── ACTION BUTTONS ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            {existingBlock && (
              <button
                type="button"
                onClick={handleDelete}
                className="mr-auto h-11 px-4 rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 hover:bg-[#F43F5E]/30 text-[#F43F5E] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
              >
                {editMode === 'all' && sessionBlocks.length > 1 ? 'DELETE ALL' : 'DELETE'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border border-white/[0.08] bg-[#1E2538] hover:bg-[#28324D] text-[#94A3B8] hover:text-white text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={!title.trim() || conflictingBlocks.length > 0}
              title={
                conflictingBlocks.length > 0
                  ? 'Cannot save: an existing block already occupies this hour'
                  : undefined
              }
              className="h-11 px-7 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#3B82F6]/50 md:hover:scale-[1.01]"
            >
              <span>
                {existingBlock
                  ? editMode === 'all' && sessionBlocks.length > 1
                    ? 'SAVE ALL'
                    : 'SAVE SLOT'
                  : 'ADD SLOT'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
