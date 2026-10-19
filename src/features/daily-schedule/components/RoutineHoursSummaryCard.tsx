/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useDailySchedule } from '../context/DailyScheduleContext';
import { AddGroupModal } from './modals/AddGroupModal';
import { ROUTINE_CATEGORIES } from './modals/AddBlockModal';

export const RoutineHoursSummaryCard: React.FC = React.memo(() => {
  const { groups, activeRoutine, categories, addGroup, deleteGroup } = useDailySchedule();
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute duration and category breakdown per group
  const groupStats = useMemo(() => {
    return groups.map((g) => {
      const groupCategories = g.categories || [];
      const normCategories = groupCategories.map((c) => c.toLowerCase());

    // Match blocks in activeRoutine by category or direct group assignment
    const blocksInGroup = (activeRoutine?.blocks || []).filter((b) => {
      const matchCat = b.category && normCategories.includes(b.category.toLowerCase());
      const matchId = b.groupId && b.groupId === g.id;
      const matchName = b.groupName && b.groupName.toUpperCase() === g.name.toUpperCase();
      return matchCat || matchId || matchName;
    });

    const duration = blocksInGroup.reduce(
      (acc, b) => acc + (b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1)),
      0
    );

    // Group blocks by category inside this group
    const categoriesInside = groupCategories.map((catName) => {
      const catBlocks = blocksInGroup.filter(
        (b) => b.category?.toLowerCase() === catName.toLowerCase()
      );
      const catDuration = catBlocks.reduce(
        (acc, b) => acc + (b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1)),
        0
      );
      const matchedPreset =
        (categories || []).find((p) => p.name.toLowerCase() === catName.toLowerCase()) ||
        ROUTINE_CATEGORIES.find((p) => p.name.toLowerCase() === catName.toLowerCase());

      return {
        name: catName,
        icon: matchedPreset?.icon || '📌',
        hours: catDuration,
        blocks: catBlocks,
      };
    });

    // Uncategorized blocks assigned directly to this group
    const uncategorizedBlocks = blocksInGroup.filter(
      (b) => !b.category || !normCategories.includes(b.category.toLowerCase())
    );

    return {
      group: g,
      count: blocksInGroup.length,
      duration,
      categoriesInside,
      uncategorizedBlocks,
      blocks: blocksInGroup,
    };
    });
  }, [groups, activeRoutine?.blocks, categories]);

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase">
            ROUTINE HOURS SUMMARY
          </h3>
          <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            SUMMED DURATIONS BY GROUP
          </p>
        </div>

        {/* + GROUP BUTTON */}
        <button
          type="button"
          onClick={() => setIsAddGroupOpen(true)}
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-white/[0.1] bg-[#131722] hover:bg-[#1F2637] text-white text-[10px] font-bold tracking-wider transition-colors cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)] md:hover:scale-[1.02] active:scale-95"
        >
          <span>+ GROUP</span>
        </button>
      </div>

      {/* ── GROUP LIST ── */}
      <div className="mt-4 space-y-2.5">
        {groupStats.length === 0 ? (
          <div className="py-6 text-center text-[11px] font-bold text-[#64748B] tracking-wider">
            NO GROUPS CREATED YET
          </div>
        ) : (
          groupStats.map(({ group, count, duration, categoriesInside, uncategorizedBlocks }) => {
            const isCollapsed = collapsedGroups[group.id];

            return (
              <div
                key={group.id}
                className="w-full rounded-xl border border-white/[0.06] bg-[#131722]/60 p-3 transition-colors hover:border-white/[0.12]"
              >
                {/* Header row (Group dropdown toggle) */}
                <div className="flex items-center justify-between">
                  {/* Left: Chevron + Dot + Group Name (count) */}
                  <div
                    onClick={() => toggleCollapse(group.id)}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                    )}
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: group.color || '#3B82F6' }}
                    />
                    <span className="text-xs font-bold text-[#F8FAFC] tracking-wider truncate max-w-[170px] sm:max-w-[220px]">
                      {group.name} <span className="text-[#94A3B8]">({count})</span>
                    </span>
                  </div>

                  {/* Right: Hours + Actions */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-[#38BDF8]">
                      {duration.toFixed(1)} hr
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteGroup(group.id)}
                      className="p-1 text-[#64748B] hover:text-[#F43F5E] transition-colors cursor-pointer"
                      title="Delete group"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Accordion Body: Shows categories inside the group */}
                {!isCollapsed && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] space-y-2">
                    {categoriesInside.length > 0 ? (
                      categoriesInside.map((cat) => (
                        <div
                          key={cat.name}
                          className="p-2.5 rounded-xl bg-black/25 border border-white/[0.04] space-y-1.5"
                        >
                          {/* Category Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{cat.icon}</span>
                              <span className="text-[11px] font-bold text-[#F8FAFC] tracking-wider">
                                {cat.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-[#38BDF8]">
                              {cat.hours.toFixed(1)} hr
                            </span>
                          </div>

                          {/* Routine slots belonging to this category */}
                          {cat.blocks.length > 0 ? (
                            <div className="space-y-1 pl-3.5 pt-1 border-l border-white/10">
                              {cat.blocks.map((blk) => (
                                <div
                                  key={blk.id}
                                  className="flex items-center justify-between text-[10px]"
                                >
                                  <span className="text-[#CBD5E1] font-medium truncate max-w-[140px] sm:max-w-[190px]">
                                    {blk.title}
                                  </span>
                                  <span className="text-[#94A3B8] font-mono">
                                    {blk.startTime && blk.endTime
                                      ? `${blk.startTime} - ${blk.endTime}`
                                      : `${blk.hour}:00`}
                                    {' '}({(blk.durationHours ?? 1).toFixed(1)}h)
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9.5px] text-[#64748B] italic pl-2">
                              No slots in {cat.name} yet
                            </p>
                          )}
                        </div>
                      ))
                    ) : null}

                    {/* Uncategorized blocks if any */}
                    {uncategorizedBlocks.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/25 border border-white/[0.04] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                            DIRECT SLOTS
                          </span>
                        </div>
                        <div className="space-y-1 pl-3.5 border-l border-white/10">
                          {uncategorizedBlocks.map((blk) => (
                            <div
                              key={blk.id}
                              className="flex items-center justify-between text-[10px]"
                            >
                              <span className="text-[#CBD5E1] font-medium truncate max-w-[140px] sm:max-w-[190px]">
                                {blk.title}
                              </span>
                              <span className="text-[#94A3B8] font-mono">
                                {(blk.durationHours ?? 1).toFixed(1)}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoriesInside.length === 0 && uncategorizedBlocks.length === 0 && (
                      <p className="text-[10px] text-[#64748B] italic py-1 text-center">
                        No categories or routine slots in this group yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isAddGroupOpen && (
        <AddGroupModal
          isOpen={isAddGroupOpen}
          onClose={() => setIsAddGroupOpen(false)}
          onAddGroup={addGroup}
        />
      )}
    </div>
  );
});

RoutineHoursSummaryCard.displayName = 'RoutineHoursSummaryCard';
