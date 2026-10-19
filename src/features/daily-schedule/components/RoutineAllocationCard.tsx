/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useDailySchedule } from '../context/DailyScheduleContext';
import { RoutineBlock } from '../types';
import { parseTimeToMinutes } from '../utils';

function formatHourRange(hour: number): string {
  const startPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayStart = hour % 12 === 0 ? 12 : hour % 12;

  const nextHour = (hour + 1) % 24;
  const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const displayEnd = nextHour % 12 === 0 ? 12 : nextHour % 12;

  return `${String(displayStart).padStart(2, '0')}:00 ${startPeriod} - ${String(displayEnd).padStart(2, '0')}:00 ${endPeriod}`;
}

interface AddingAllocationItem {
  id: string;
  title: string;
  category?: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  color: string;
  isDayStart?: boolean;
}

export const RoutineAllocationCard: React.FC = React.memo(() => {
  const { activeRoutine } = useDailySchedule();

  // Group blocks by their added time slot (adding-wise session) rather than 1-hour individual blocks
  const allocations = useMemo(() => {
    const rawBlocks = activeRoutine?.blocks || [];
    if (rawBlocks.length === 0) return [];

    const dayStartBlock = rawBlocks.find((b) => b.isDayStart);
    const dayStartHour = dayStartBlock
      ? dayStartBlock.hour
      : rawBlocks.length > 0
      ? Math.min(...rawBlocks.map((b) => b.hour))
      : 6;

    // Sort blocks chronologically starting from dayStartHour
    const sorted = [...rawBlocks].sort((a, b) => {
      const offsetA = (a.hour - dayStartHour + 24) % 24;
      const offsetB = (b.hour - dayStartHour + 24) % 24;
      if (offsetA !== offsetB) return offsetA - offsetB;
      const startA = parseTimeToMinutes(a.startTime, a.hour);
      const startB = parseTimeToMinutes(b.startTime, b.hour);
      return startA - startB;
    });

    const items: AddingAllocationItem[] = [];
    const processedBlockIds = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const block = sorted[i];
      if (processedBlockIds.has(block.id)) continue;

      // Case 1: Blocks created together with a common sessionId
      if (block.sessionId) {
        const sessionBlocks = sorted.filter((b) => b.sessionId === block.sessionId);
        sessionBlocks.forEach((b) => processedBlockIds.add(b.id));

        const sessionDuration = sessionBlocks.reduce(
          (acc, b) => acc + (b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1)),
          0
        );

        items.push({
          id: block.sessionId,
          title: block.title,
          category: block.category,
          startTime: block.sessionStartTime || block.startTime || formatHourRange(block.hour).split(' - ')[0],
          endTime:
            block.sessionEndTime ||
            sessionBlocks[sessionBlocks.length - 1].endTime ||
            formatHourRange(sessionBlocks[sessionBlocks.length - 1].hour).split(' - ')[1],
          durationHours: Math.round(sessionDuration * 10) / 10,
          color: block.color || '#3B82F6',
          isDayStart: sessionBlocks.some((b) => b.isDayStart),
        });
        continue;
      }

      // Case 2: Legacy blocks without sessionId: merge consecutive blocks with same title, color, and hours
      const group: RoutineBlock[] = [block];
      processedBlockIds.add(block.id);

      let j = i + 1;
      while (j < sorted.length) {
        const next = sorted[j];
        if (
          !processedBlockIds.has(next.id) &&
          !next.sessionId &&
          next.title === block.title &&
          next.color === block.color &&
          (next.hour === sorted[j - 1].hour + 1 ||
            (sorted[j - 1].endTime && next.startTime && sorted[j - 1].endTime === next.startTime))
        ) {
          group.push(next);
          processedBlockIds.add(next.id);
          j++;
        } else {
          break;
        }
      }

      const groupDuration = group.reduce(
        (acc, b) => acc + (b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1)),
        0
      );

      const firstBlock = group[0];
      const lastBlock = group[group.length - 1];

      items.push({
        id: `group_${firstBlock.id}`,
        title: firstBlock.title,
        category: firstBlock.category,
        startTime: firstBlock.startTime || formatHourRange(firstBlock.hour).split(' - ')[0],
        endTime: lastBlock.endTime || formatHourRange(lastBlock.hour).split(' - ')[1],
        durationHours: Math.round(groupDuration * 10) / 10,
        color: firstBlock.color || '#3B82F6',
        isDayStart: group.some((b) => b.isDayStart),
      });
    }

    return items;
  }, [activeRoutine?.blocks]);

  const totalHours = useMemo(() => {
    return allocations.reduce((acc, a) => acc + a.durationHours, 0);
  }, [allocations]);

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase">
            24-HOUR ROUTINE ALLOCATION
          </h3>
          <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            ADDING-WISE TIME HOURS
          </p>
        </div>

        {/* Total Hours Badge */}
        <span className="px-3 py-1 rounded-xl bg-[#2563EB]/20 border border-[#3B82F6]/40 text-[#60A5FA] font-bold text-xs tracking-wider shadow-[0_0_12px_rgba(37,99,235,0.2)]">
          {totalHours.toFixed(1)} hr
        </span>
      </div>

      {/* ── ALLOCATION ITEMS LIST ── */}
      <div className="mt-4 space-y-2.5">
        {allocations.length === 0 ? (
          <div className="py-6 text-center text-[11px] font-bold text-[#64748B] tracking-wider">
            NO ROUTINE TIME ALLOCATED YET
          </div>
        ) : (
          allocations.map((item) => (
            <div
              key={item.id}
              className="w-full rounded-xl border border-white/[0.06] bg-[#131722]/50 p-3 flex items-center justify-between transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Vertical colored bar */}
                <div
                  className="w-1.5 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || '#3B82F6' }}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-tight truncate">
                      {item.title}
                    </h4>
                    {item.category && (
                      <span className="px-2 py-0.2 rounded-md bg-white/[0.06] border border-white/[0.08] text-[9.5px] font-bold text-[#38BDF8]">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#94A3B8] font-medium tracking-wide mt-0.5">
                    {item.startTime} - {item.endTime}
                  </p>
                </div>
              </div>

              <div className="text-xs font-black text-[#F8FAFC] shrink-0 ml-3">
                {item.durationHours.toFixed(1)} hr
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

RoutineAllocationCard.displayName = 'RoutineAllocationCard';
