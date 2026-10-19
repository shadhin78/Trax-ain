/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useDailySchedule } from '../context/DailyScheduleContext';
import { AddBlockModal } from './modals/AddBlockModal';

export interface GapInterval {
  id: string;
  startHour: number;
  endHour: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationHours: number;
}

export interface HourlySlotGap {
  id: string;
  hour: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isPartial: boolean;
}

function formatHourTo12(hour: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const period = norm >= 12 ? 'PM' : 'AM';
  const displayH = norm % 12 === 0 ? 12 : norm % 12;
  return `${String(displayH).padStart(2, '0')}:00 ${period}`;
}

function formatMinutesTo12(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const mStr = String(m).padStart(2, '0');
  return `${String(displayH).padStart(2, '0')}:${mStr} ${period}`;
}

function parseTimeToMinutes(timeStr?: string, defaultHour?: number): number {
  if (timeStr) {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
  }
  if (defaultHour !== undefined) {
    return defaultHour * 60;
  }
  return 0;
}

function formatDurationReadable(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  if (h === 0) return `${m} min`;
  const decHours = (minutes / 60).toFixed(1).replace(/\.0$/, '');
  return `${decHours} hr (${h}h ${m}m)`;
}

export const DailyGapTimeCard: React.FC = React.memo(() => {
  const { activeRoutine } = useDailySchedule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHourToFill, setSelectedHourToFill] = useState<number>(9);
  const [viewMode, setViewMode] = useState<'windows' | 'hourly'>('windows');

  const blocks = activeRoutine?.blocks || [];

  // Determine starting hour of routine day
  const dayStartBlock = blocks.find((b) => b.isDayStart);
  const dayStartHour = dayStartBlock
    ? dayStartBlock.hour
    : blocks.length > 0
    ? Math.min(...blocks.map((b) => b.hour))
    : 6;

  // Total scheduled duration in minutes across all blocks
  const scheduledMinutes = useMemo(() => {
    return blocks.reduce((acc, b) => {
      if (b.durationMinutes !== undefined && b.durationMinutes > 0) {
        return acc + b.durationMinutes;
      }
      if (b.durationHours !== undefined && b.durationHours > 0) {
        return acc + Math.round(b.durationHours * 60);
      }
      return acc + 60;
    }, 0);
  }, [blocks]);

  // Total gap minutes (24h = 1440 min)
  const totalGapMinutes = Math.max(0, 1440 - scheduledMinutes);
  const totalGapHours = Math.round((totalGapMinutes / 60) * 10) / 10;
  const scheduledHours = Math.round((scheduledMinutes / 60) * 10) / 10;

  const gapPercentage = Math.round((totalGapMinutes / 1440) * 100);
  const scheduledPercentage = 100 - gapPercentage;

  // Exact Contiguous Gap Intervals computation (down to the minute)
  const gapIntervals = useMemo(() => {
    if (blocks.length === 0) {
      return [
        {
          id: `gap_all_day`,
          startHour: dayStartHour,
          endHour: dayStartHour,
          startTime: formatHourTo12(dayStartHour),
          endTime: formatHourTo12(dayStartHour),
          durationMinutes: 1440,
          durationHours: 24,
        },
      ];
    }

    const dayStartMinutes = dayStartHour * 60;
    const occupiedIntervals: { start: number; end: number }[] = [];

    for (const b of blocks) {
      const startM = parseTimeToMinutes(b.startTime, b.hour);
      let endM = parseTimeToMinutes(b.endTime, (b.hour + 1) % 24);
      if (endM <= startM) {
        endM += 1440;
      }
      const duration = b.durationMinutes ?? (endM - startM);

      // Map start relative to dayStartMinutes in range [0, 1440]
      const startRel = (startM - dayStartMinutes + 1440) % 1440;
      const endRel = startRel + duration;

      if (endRel <= 1440) {
        occupiedIntervals.push({ start: startRel, end: endRel });
      } else {
        occupiedIntervals.push({ start: startRel, end: 1440 });
        occupiedIntervals.push({ start: 0, end: endRel - 1440 });
      }
    }

    // Sort and merge overlapping or contiguous occupied spans
    occupiedIntervals.sort((a, b) => a.start - b.start);
    const mergedOccupied: { start: number; end: number }[] = [];
    for (const interval of occupiedIntervals) {
      if (mergedOccupied.length === 0) {
        mergedOccupied.push({ ...interval });
      } else {
        const prev = mergedOccupied[mergedOccupied.length - 1];
        if (interval.start <= prev.end) {
          prev.end = Math.max(prev.end, interval.end);
        } else {
          mergedOccupied.push({ ...interval });
        }
      }
    }

    // Invert occupied spans to find contiguous free spans
    const freeIntervals: { start: number; end: number; duration: number }[] = [];
    let currentCursor = 0;

    for (const occ of mergedOccupied) {
      if (occ.start > currentCursor) {
        freeIntervals.push({
          start: currentCursor,
          end: occ.start,
          duration: occ.start - currentCursor,
        });
      }
      currentCursor = Math.max(currentCursor, occ.end);
    }

    if (currentCursor < 1440) {
      freeIntervals.push({
        start: currentCursor,
        end: 1440,
        duration: 1440 - currentCursor,
      });
    }

    return freeIntervals.map((free, idx) => {
      const absStart = (dayStartMinutes + free.start) % 1440;
      const absEnd = (dayStartMinutes + free.end) % 1440;
      const startHour = Math.floor(absStart / 60);
      const endHour = Math.floor(absEnd / 60);
      return {
        id: `gap_${idx}_${absStart}_${absEnd}`,
        startHour,
        endHour,
        startTime: formatMinutesTo12(absStart),
        endTime: formatMinutesTo12(absEnd),
        durationMinutes: free.duration,
        durationHours: Math.round((free.duration / 60) * 10) / 10,
      };
    });
  }, [blocks, dayStartHour]);

  // Hourly free slots (1-hour slots or partial remaining minutes)
  const hourlyGaps = useMemo(() => {
    const slots: HourlySlotGap[] = [];

    for (let i = 0; i < 24; i++) {
      const h = (dayStartHour + i) % 24;
      const matchingBlock = blocks.find((b) => b.hour === h);

      if (!matchingBlock) {
        slots.push({
          id: `hourly_${h}`,
          hour: h,
          startTime: formatHourTo12(h),
          endTime: formatHourTo12((h + 1) % 24),
          durationMinutes: 60,
          isPartial: false,
        });
      } else {
        const duration =
          matchingBlock.durationMinutes ??
          (matchingBlock.durationHours ? Math.round(matchingBlock.durationHours * 60) : 60);

        if (duration < 60) {
          // Has leftover unallocated time in this hour
          const remainingMin = 60 - duration;
          const blockEndM = parseTimeToMinutes(matchingBlock.endTime, (h * 60 + duration) / 60);
          slots.push({
            id: `hourly_${h}_partial`,
            hour: h,
            startTime: matchingBlock.endTime || formatMinutesTo12(h * 60 + duration),
            endTime: formatHourTo12((h + 1) % 24),
            durationMinutes: remainingMin,
            isPartial: true,
          });
        }
      }
    }

    return slots;
  }, [blocks, dayStartHour]);

  const handleOpenFill = (hour: number) => {
    setSelectedHourToFill(hour);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#141A28] border border-white/[0.1] flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider">
              Gap Time Allocation
            </h3>
            <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
              FREE / UNALLOCATED TIME NOT IN ROUTINE GRID
            </p>
          </div>
        </div>

        {/* Right Badges & Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* View mode toggle (Windows vs Hourly) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#131722] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode('windows')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                viewMode === 'windows'
                  ? 'bg-[#2563EB] text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              WINDOWS
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hourly')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                viewMode === 'hourly'
                  ? 'bg-[#2563EB] text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              1-HR SLOTS
            </button>
          </div>

          {/* Gap Time Badge */}
          <span
            className={`px-3 py-1 rounded-xl border text-xs font-bold tracking-wider shadow-[0_0_12px_rgba(0,0,0,0.2)] ${
              totalGapMinutes === 0
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-[#38BDF8]/15 border-[#38BDF8]/35 text-[#38BDF8]'
            }`}
          >
            {totalGapMinutes === 0
              ? '0 hr Free'
              : totalGapMinutes % 60 === 0
              ? `${totalGapHours} hr Free`
              : `${totalGapHours} hr (${Math.floor(totalGapMinutes / 60)}h ${totalGapMinutes % 60}m) Free`}
          </span>
        </div>
      </div>

      {/* ── 24-HOUR VISUAL COVERAGE TIMELINE BAR ── */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-[10.5px] font-bold">
          <span className="text-[#94A3B8]">
            DAY COVERAGE:{' '}
            <strong className="text-[#F8FAFC]">
              {scheduledMinutes % 60 === 0
                ? `${scheduledHours}h Scheduled`
                : `${scheduledHours}h (${Math.floor(scheduledMinutes / 60)}h ${scheduledMinutes % 60}m) Scheduled`}
            </strong>{' '}
            ({scheduledPercentage}%)
          </span>
          <span className="text-[#38BDF8]">
            {totalGapMinutes % 60 === 0
              ? `${totalGapHours}h Free`
              : `${totalGapHours}h (${Math.floor(totalGapMinutes / 60)}h ${totalGapMinutes % 60}m) Free`}{' '}
            ({gapPercentage}%)
          </span>
        </div>

        {/* Mini 24-Segment Strip */}
        <div className="grid grid-cols-24 gap-1 p-1.5 rounded-xl bg-[#131722]/80 border border-white/[0.06] overflow-x-auto">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = (dayStartHour + i) % 24;
            const matchingBlock = blocks.find((b) => b.hour === h);
            const duration = matchingBlock
              ? matchingBlock.durationMinutes ??
                (matchingBlock.durationHours ? Math.round(matchingBlock.durationHours * 60) : 60)
              : 0;
            const isFullyTaken = duration >= 60;
            const isPartial = duration > 0 && duration < 60;
            const isFree = duration === 0;

            const blockColor = matchingBlock?.color || '#3B82F6';

            return (
              <div
                key={h}
                onClick={() => {
                  if (!isFullyTaken) handleOpenFill(h);
                }}
                title={`${formatHourTo12(h)} - ${formatHourTo12((h + 1) % 24)}: ${
                  isFullyTaken
                    ? `${matchingBlock?.title || 'Scheduled'} (${duration}m)`
                    : isPartial
                    ? `${matchingBlock?.title || 'Scheduled'} (${duration}m) — ${60 - duration}m Free`
                    : 'Free (Click to Fill)'
                }`}
                className={`h-6 rounded-md transition-all duration-150 flex items-center justify-center text-[9px] font-bold select-none ${
                  isFullyTaken
                    ? 'border border-white/20 shadow-sm cursor-default'
                    : isPartial
                    ? 'border border-[#38BDF8]/40 hover:border-[#38BDF8] text-white cursor-pointer shadow-sm'
                    : 'bg-white/[0.04] border border-dashed border-white/20 hover:border-[#38BDF8] hover:bg-[#38BDF8]/20 text-[#64748B] hover:text-[#38BDF8] cursor-pointer'
                }`}
                style={{
                  background: isFullyTaken
                    ? blockColor
                    : isPartial
                    ? `linear-gradient(to right, ${blockColor} ${(duration / 60) * 100}%, rgba(255, 255, 255, 0.05) ${(duration / 60) * 100}%)`
                    : undefined,
                }}
              >
                {isFree && <span className="opacity-60">+</span>}
                {isPartial && <span className="text-[8px] opacity-90 drop-shadow">{duration}m</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GAP CONTENT LIST ── */}
      <div className="mt-6">
        {totalGapMinutes === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
              100% OF 24-HOUR ROUTINE ALLOCATED
            </h4>
            <p className="text-[11px] text-[#94A3B8] tracking-wider mt-1">
              There are no unoccupied gap slots in this schedule.
            </p>
          </div>
        ) : viewMode === 'windows' ? (
          /* WINDOWS VIEW (Contiguous Gap Windows) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {gapIntervals.map((gap) => (
              <div
                key={gap.id}
                onClick={() => handleOpenFill(gap.startHour)}
                className="rounded-2xl border border-white/[0.08] hover:border-[#38BDF8]/40 bg-[#131722]/60 hover:bg-[#131722]/90 p-4 sm:p-4.5 transition-all duration-200 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.25)] group flex flex-col justify-between"
              >
                {/* Header row: Time span pill + duration */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#181D2B] border border-white/[0.08] text-[11px] font-bold text-[#38BDF8] tracking-wider">
                    {gap.startTime} - {gap.endTime}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] text-[10px] font-bold">
                    {formatDurationReadable(gap.durationMinutes)}
                  </span>
                </div>

                {/* Body info */}
                <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <div>
                    <h5 className="text-xs font-bold text-[#F8FAFC] group-hover:text-white transition-colors">
                      Free Window
                    </h5>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      {gap.durationMinutes >= 60
                        ? `${Math.floor(gap.durationMinutes / 60)}h contiguous open time available`
                        : `${gap.durationMinutes} min contiguous open time available`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFill(gap.startHour);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB]/25 hover:bg-[#2563EB] border border-[#3B82F6]/50 text-[#60A5FA] hover:text-white text-[10px] font-bold tracking-wider transition-all cursor-pointer group-hover:scale-105"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>FILL</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* HOURLY VIEW (1-Hour Free Slots & Remaining Partials) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {hourlyGaps.map((slot) => (
              <div
                key={slot.id}
                onClick={() => handleOpenFill(slot.hour)}
                className="rounded-xl border border-white/[0.08] hover:border-[#38BDF8]/40 bg-[#131722]/50 hover:bg-[#131722]/80 p-3 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#F8FAFC]">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <p className="text-[9.5px] text-[#64748B] mt-0.5">
                    {slot.durationMinutes === 60 ? '1 hr Free' : `${slot.durationMinutes} min Free`}
                  </p>
                </div>

                <span className="h-7 w-7 rounded-lg bg-white/[0.04] group-hover:bg-[#2563EB] group-hover:text-white text-[#94A3B8] border border-white/[0.08] flex items-center justify-center transition-all">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for filling gap slot */}
      {isModalOpen && (
        <AddBlockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultHour={selectedHourToFill}
          existingBlock={null}
        />
      )}
    </div>
  );
});

