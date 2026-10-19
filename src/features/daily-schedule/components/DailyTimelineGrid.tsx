/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import { useDailySchedule } from '../context/DailyScheduleContext';
import { RoutineBlock } from '../types';
import { AddBlockModal } from './modals/AddBlockModal';
import { parseTimeToMinutes } from '../utils';

function formatHourRange(hour: number): string {
  const startPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayStart = hour % 12 === 0 ? 12 : hour % 12;

  const nextHour = (hour + 1) % 24;
  const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const displayEnd = nextHour % 12 === 0 ? 12 : nextHour % 12;

  return `${displayStart}:00 ${startPeriod} - ${displayEnd}:00 ${endPeriod}`;
}

export const DailyTimelineGrid: React.FC = React.memo(() => {
  const {
    activeRoutine,
    nextRoutine,
    prevRoutine,
  } = useDailySchedule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<RoutineBlock | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(2);

  const blocks = activeRoutine?.blocks || [];
  const boxCount = blocks.length;

  // Day Start sorting: strictly arranged hour-after-hour starting from dayStartHour
  const dayStartBlock = blocks.find((b) => b.isDayStart);
  const dayStartHour = dayStartBlock
    ? dayStartBlock.hour
    : blocks.length > 0
    ? Math.min(...blocks.map((b) => b.hour))
    : 6;

  const sortedBlocks = React.useMemo(() => {
    return [...blocks].sort((a, b) => {
      const offsetA = (a.hour - dayStartHour + 24) % 24;
      const offsetB = (b.hour - dayStartHour + 24) % 24;
      if (offsetA !== offsetB) {
        return offsetA - offsetB;
      }
      const startA = parseTimeToMinutes(a.startTime, a.hour);
      const startB = parseTimeToMinutes(b.startTime, b.hour);
      return startA - startB;
    });
  }, [blocks, dayStartHour]);

  // Calculate next contiguous unoccupied or partially occupied hour slot in sequence
  const getNextAvailableHour = (): number => {
    const hourMinutes: Record<number, number> = {};
    for (const b of blocks) {
      const dur = b.durationMinutes ?? (b.durationHours ? Math.round(b.durationHours * 60) : 60);
      hourMinutes[b.hour] = (hourMinutes[b.hour] || 0) + dur;
    }
    for (let i = 0; i < 24; i++) {
      const h = (dayStartHour + i) % 24;
      if ((hourMinutes[h] || 0) < 60) {
        return h;
      }
    }
    return dayStartHour;
  };

  const handleOpenAdd = (h?: number) => {
    const targetHour = h !== undefined ? h : getNextAvailableHour();
    setSelectedBlock(null);
    setSelectedHour(targetHour);
    setIsModalOpen(true);
  };

  const handleEditBlock = (block: RoutineBlock) => {
    setSelectedBlock(block);
    setSelectedHour(block.hour);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        {/* Left Title & Subtitle */}
        <div>
          <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider">
            Daily Timeline Grid
          </h3>
          <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            1-HOUR SEGMENTED BLOCKS OF YOUR ROUTINE
          </p>
        </div>

        {/* Right Controls: Switch (< ROUTINE 1 >) + X Box + + ADD */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* ROUTINE SWITCH (NO BG WITH INSIDE GLOWING STYLE) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3B82F6]/60 bg-transparent text-white font-mono text-[11px] font-bold tracking-wider shadow-[inset_0_0_12px_rgba(59,130,246,0.5),0_0_14px_rgba(37,99,235,0.25)] transition-all">
            <button
              type="button"
              onClick={prevRoutine}
              className="p-0.5 hover:text-[#60A5FA] transition-colors cursor-pointer"
              title="Previous Routine"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-white uppercase tracking-wider">
              {activeRoutine?.name || 'ROUTINE 1'}
            </span>
            <button
              type="button"
              onClick={nextRoutine}
              className="p-0.5 hover:text-[#60A5FA] transition-colors cursor-pointer"
              title="Next Routine"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* BOX COUNT BADGE */}
          <span className="px-2.5 py-1 rounded-xl bg-[#131722] border border-white/[0.1] text-[#94A3B8] text-[11px] font-bold tracking-wider">
            {boxCount} {boxCount === 1 ? 'Box' : 'Boxes'}
          </span>

          {/* + ADD BUTTON */}
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_16px_rgba(37,99,235,0.4)] border border-[#3B82F6] md:hover:scale-[1.02] active:scale-95"
          >
            <span>+ ADD</span>
          </button>
        </div>
      </div>

      {/* ── TIMELINE BLOCKS GRID ── */}
      <div className="mt-6">
        {sortedBlocks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">
              NO ROUTINE BLOCKS IN THIS SCHEDULE
            </p>
            <button
              type="button"
              onClick={() => handleOpenAdd(dayStartHour)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#2563EB]/20 border border-[#3B82F6]/50 text-[#60A5FA] text-xs font-bold hover:bg-[#2563EB]/35 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              <span>+ Add Your First Block</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {sortedBlocks.map((block) => (
              <div
                key={block.id}
                onClick={() => handleEditBlock(block)}
                className="w-full rounded-2xl border border-white/[0.1] bg-[#131722]/80 overflow-hidden cursor-pointer transition-all duration-200 md:hover:scale-[1.02] md:hover:border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.3)] group"
              >
                {/* Top header: Time Range Pill centered */}
                <div className="px-4 py-2.5 flex items-center justify-center bg-[#0B0F19]/90 border-b border-white/[0.06] text-center">
                  <span className="px-3.5 py-1 rounded-full bg-[#181D2B] border border-white/[0.08] text-[10.5px] sm:text-[11px] font-bold text-[#FDA4AF] tracking-wider text-center">
                    {block.startTime && block.endTime ? `${block.startTime} - ${block.endTime}` : formatHourRange(block.hour)}
                    {block.durationMinutes && block.durationMinutes < 60 ? ` (${block.durationMinutes}m)` : ''}
                  </span>
                </div>

                {/* Bottom colored slab with Block Title & Day Start Sun Icon */}
                <div
                  className="relative p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[110px]"
                  style={{
                    backgroundColor: block.color || '#3B82F6',
                  }}
                >
                  {/* Day Start: ONLY the Sun icon in box body left top */}
                  {block.isDayStart && (
                    <span
                      className="absolute top-2.5 left-3 flex items-center justify-center text-amber-300 drop-shadow select-none"
                      title="Day Start"
                      aria-label="Day Start"
                    >
                      <Sun className="h-4 w-4 text-amber-300 fill-amber-300/40" />
                    </span>
                  )}

                  <h4 className="text-base sm:text-lg font-black text-white tracking-wide drop-shadow-sm group-hover:scale-105 transition-transform">
                    {block.title}
                  </h4>
                  {(block.category || block.programName || block.trackName) && (
                    <span className="mt-2 px-2.5 py-0.5 rounded-full bg-black/30 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                      {block.category || block.programName || block.trackName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddBlockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultHour={selectedHour}
          existingBlock={selectedBlock}
        />
      )}
    </div>
  );
});
