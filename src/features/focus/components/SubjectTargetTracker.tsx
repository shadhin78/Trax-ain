/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Activity } from 'lucide-react';
import { useFocusTimer } from '../context/FocusTimerContext';
import { AddTargetModal } from './modals/AddTargetModal';
import { EditTargetModal } from './modals/EditTargetModal';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { SubjectTarget } from '../types';

type TargetFilter = 'ALL' | 'REMAIN' | 'DONE';

function formatTargetDuration(minutes: number): string {
  if (minutes <= 0) return '0 hr';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

export const SubjectTargetTracker: React.FC = () => {
  const { 
    targets, 
    addTarget, 
    editTarget,
    deleteTarget,
    selectedSubject,
    status,
    displayElapsedMs,
  } = useFocusTimer();
  const { confirmDelete } = useDeleteConfirmation();

  const [filter, setFilter] = useState<TargetFilter>('REMAIN');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SubjectTarget | null>(null);

  const filteredTargets = React.useMemo(() => {
    return targets.filter((t) => {
      const isTargetDone = t.isCompleted || t.completedMinutes >= t.targetMinutes;
      if (filter === 'REMAIN') return !isTargetDone;
      if (filter === 'DONE') return isTargetDone;
      return true;
    });
  }, [targets, filter]);

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        {/* Left Title & Subtitle */}
        <div>
          <h3 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#F8FAFC]">
            Subject Target Tracker
          </h3>
          <p className="font-mono text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            SET STUDY TARGET AND AUTOMATICALLY TRACK ALL FOCUS SESSIONS
          </p>
        </div>

        {/* Right Controls: Filters & Add Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* REMAIN PILL */}
          <button
            type="button"
            onClick={() => setFilter(filter === 'REMAIN' ? 'ALL' : 'REMAIN')}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer border
              ${
                filter === 'REMAIN'
                  ? 'bg-[#F43F5E]/20 text-[#FDA4AF] border-[#F43F5E] shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#1E1B24]/60 text-[#F43F5E] border-[#F43F5E]/40 hover:border-[#F43F5E]/80'
              }
            `}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E] animate-pulse" />
            <span>REMAIN</span>
          </button>

          {/* DONE PILL */}
          <button
            type="button"
            onClick={() => setFilter(filter === 'DONE' ? 'ALL' : 'DONE')}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer border
              ${
                filter === 'DONE'
                  ? 'bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0E241E]/60 text-[#10B981] border-[#10B981]/40 hover:border-[#10B981]/80'
              }
            `}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span>DONE</span>
          </button>

          {/* ADD TARGET BUTTON (FOLLOWS SITE X-29 THEME) */}
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.4)] border border-[#818CF8] md:hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ADD TARGET</span>
          </button>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="pt-6">
        {filteredTargets.length === 0 ? (
          <div className="py-10 text-center font-mono text-[11px] sm:text-xs font-bold text-[#64748B] tracking-widest uppercase">
            {filter === 'REMAIN'
              ? 'NO REMAINING TARGETS. ALL STUDY TARGETS COMPLETED!'
              : filter === 'DONE'
              ? 'NO COMPLETED TARGETS YET.'
              : 'NO SUBJECT TARGETS SET. CLICK ADD TARGET TO CREATE ONE.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredTargets.map((target) => {
              // Check if currently timing for this target's subject
              const isCurrentlyTiming = (status === 'RUNNING' || status === 'PAUSED') && 
                selectedSubject.trim().toLowerCase() === target.subject.trim().toLowerCase();
              
              const liveActiveMins = isCurrentlyTiming ? Math.floor(displayElapsedMs / 60000) : 0;
              const totalDoneMinutes = target.completedMinutes + liveActiveMins;
              const remainMinutes = Math.max(0, target.targetMinutes - totalDoneMinutes);
              const progressPct = Math.min(
                100,
                Math.round((totalDoneMinutes / Math.max(1, target.targetMinutes)) * 100)
              );
              const isCompleted = target.isCompleted || totalDoneMinutes >= target.targetMinutes;

              return (
                <div
                  key={target.id}
                  className={`
                    p-4 rounded-2xl border transition-all duration-200 bg-[#131722]/80 backdrop-blur-md relative overflow-hidden
                    ${
                      isCompleted
                        ? 'border-[#10B981]/30 hover:border-[#10B981]/60'
                        : isCurrentlyTiming
                        ? 'border-[#818CF8]/50 shadow-[0_0_18px_rgba(99,102,241,0.2)]'
                        : 'border-white/[0.08] hover:border-white/[0.16]'
                    }
                  `}
                >
                  {/* Card Header: Title, Active Badge, Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] truncate">
                        {target.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrentlyTiming && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-[#F59E0B] px-1.5 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 animate-pulse">
                          <Activity className="h-2.5 w-2.5" />
                          <span>+{liveActiveMins}m active</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingTarget(target)}
                        className="p-1 text-[#64748B] hover:text-[#818CF8] transition-colors cursor-pointer"
                        title="Edit target"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          confirmDelete({
                            title: 'Delete Subject Target',
                            itemType: 'Subject Target',
                            itemName: target.subject,
                            message: `Are you sure you want to delete the study target for "${target.subject}"? This action cannot be undone.`,
                            confirmLabel: 'DELETE TARGET',
                            onConfirm: () => deleteTarget(target.id),
                          });
                        }}
                        className="p-1 text-[#64748B] hover:text-[#F43F5E] transition-colors cursor-pointer"
                        title="Delete target"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Metrics Grid: Target X hr | Remain Y hr | Done Z hr */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-center my-3 select-none">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">Target</div>
                      <div className="text-xs sm:text-sm font-black text-[#F8FAFC]">
                        {formatTargetDuration(target.targetMinutes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[#818CF8] font-bold">Remain</div>
                      <div className="text-xs sm:text-sm font-black text-[#A5B4FC]">
                        {formatTargetDuration(remainMinutes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[#10B981] font-bold">Done</div>
                      <div className="text-xs sm:text-sm font-black text-[#34D399]">
                        {formatTargetDuration(totalDoneMinutes)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Sync Date */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                      <span className="text-[#818CF8] font-bold">{progressPct}% completed</span>
                      <span className="flex items-center gap-1 text-[9px] text-[#64748B]">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>Sync from: {target.startDate || target.createdAt.split('T')[0]}</span>
                      </span>
                    </div>

                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-gradient-to-r from-[#6366F1] to-[#818CF8]'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddTargetModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAddTarget={addTarget}
        />
      )}

      {editingTarget && (
        <EditTargetModal
          isOpen={Boolean(editingTarget)}
          target={editingTarget}
          onClose={() => setEditingTarget(null)}
          onSaveTarget={editTarget}
        />
      )}
    </div>
  );
};
