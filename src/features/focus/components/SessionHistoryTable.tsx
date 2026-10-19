/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Clock, Plus, BarChart3, Trash2, Edit2 } from 'lucide-react';
import { useFocusTimer, compareSessionsDesc } from '../context/FocusTimerContext';
import { AddSessionModal } from './modals/AddSessionModal';
import { EditSessionModal } from './modals/EditSessionModal';
import { AppRoute } from '../../../types/navigation';
import { useDeleteConfirmation } from '../../../context/DeleteConfirmationContext';
import { FocusSession } from '../types';

type HistoryFilter = 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

interface SessionHistoryTableProps {
  onNavigate?: (route: AppRoute) => void;
}

function formatSessionDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  }
  return `${s}s`;
}

function getSessionModeBadgeStyles(mode: string): string {
  switch (mode) {
    case 'TIMER':
      return 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
    case 'STOPWATCH':
      return 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
    case 'ADDED':
      return 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
    case 'ALARM_RANGE':
    case 'ALARM':
      return 'bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/30 shadow-[0_0_8px_rgba(100,116,139,0.15)]';
    default:
      return 'bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/30';
  }
}

export const SessionHistoryTable: React.FC<SessionHistoryTableProps> = ({ onNavigate }) => {
  const { sessions, editSession, deleteSession, addManualSession } = useFocusTimer();
  const { confirmDelete } = useDeleteConfirmation();
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null);

  const handleOpenAnalyticsHeatmap = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/analytics/#focus-matrix-heatmap');
    }
    if (onNavigate) {
      onNavigate('/analytics/');
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setTimeout(() => {
      const el = document.getElementById('focus-matrix-heatmap');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Compute filtered sessions based on active time scope (always sorted newest date first)
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const list = sessions.filter((s) => {
      if (filter === 'ALL') return true;

      const dateStr = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      const sDate = new Date(`${dateStr}T12:00:00`);

      if (filter === 'DAY') {
        return dateStr === todayStr;
      }
      if (filter === 'WEEK') {
        // Saturday - Friday week range
        const dayOfWeek = (now.getDay() + 1) % 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return sDate >= startOfWeek;
      }
      if (filter === 'MONTH') {
        return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
      }
      if (filter === 'YEAR') {
        return sDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    return [...list].sort(compareSessionsDesc);
  }, [sessions, filter]);

  // Total session statistics
  const totalSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  }, [filteredSessions]);

  const totalMinutes = Math.round(totalSeconds / 60);

  const filterTabs: { id: HistoryFilter; label: string }[] = [
    { id: 'ALL', label: 'ALL' },
    { id: 'DAY', label: 'DAY' },
    { id: 'WEEK', label: 'WEEK' },
    { id: 'MONTH', label: 'MONTH' },
    { id: 'YEAR', label: 'YEAR' },
  ];

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        {/* Title, Badges & Subtitle */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-mono text-sm sm:text-base font-black tracking-wider text-[#F8FAFC]">
              Session History
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider bg-[#1E293B]/70 text-[#94A3B8] border border-white/[0.08]">
              {filteredSessions.length} SESSIONS
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider bg-[#064E3B]/40 text-[#34D399] border border-[#10B981]/40">
              <Clock className="h-2.5 w-2.5" />
              <span>TOTAL: {totalMinutes} MIN</span>
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            LIST OF RECORDED STUDY SESSIONS
          </p>
        </div>

        {/* Right Controls: Filter Pills & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Time Filter Pills */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#131722]/80 border border-white/[0.08] rounded-xl">
            {filterTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`
                  px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all duration-150 cursor-pointer
                  ${
                    filter === id
                      ? 'bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ANALYTICS BUTTON */}
          <button
            type="button"
            onClick={handleOpenAnalyticsHeatmap}
            title="Open Focus Matrix Heatmap on Analytics Page"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_14px_rgba(79,70,229,0.35)] border border-[#6366F1] md:hover:scale-[1.02] active:scale-95"
          >
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>ANALYTICS</span>
          </button>

          {/* ADD SESSION BUTTON */}
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_14px_rgba(16,185,129,0.35)] border border-[#10B981] md:hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>ADD SESSION</span>
          </button>
        </div>
      </div>

      {/* ── TABLE AREA ── */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] sm:text-[11px] font-black text-[#94A3B8] tracking-wider uppercase">
              <th className="py-3 px-3">DATE & TIME</th>
              <th className="py-3 px-3">SUBJECT</th>
              <th className="py-3 px-3">DURATION</th>
              <th className="py-3 px-3">MODE</th>
              <th className="py-3 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[11px] font-bold text-[#64748B] tracking-widest uppercase">
                  NO FOCUS SESSIONS RECORDED YET
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] text-xs font-mono transition-colors"
                >
                  <td className="py-3 px-3 text-[#F8FAFC]">
                    <span className="font-semibold">{session.date}</span>
                    <span className="text-white/40 ml-2 text-[10px]">{session.time}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#60A5FA]">
                    {session.subject}
                  </td>
                  <td className="py-3 px-3 text-[#10B981] font-bold">
                    {formatSessionDuration(session.durationSeconds)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider border font-mono inline-block ${getSessionModeBadgeStyles(
                        session.mode
                      )}`}
                    >
                      {session.mode === 'ALARM_RANGE' ? 'ALARM' : session.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingSession(session)}
                        className="p-1.5 text-[#64748B] hover:text-[#818CF8] rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Edit recorded session"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          confirmDelete({
                            title: 'Delete Study Session',
                            itemType: 'Study Session',
                            itemName: `${session.subject} (${formatSessionDuration(session.durationSeconds)})`,
                            message: `Are you sure you want to delete this recorded session for "${session.subject}"? This action cannot be undone.`,
                            confirmLabel: 'DELETE SESSION',
                            onConfirm: () => deleteSession(session.id),
                          });
                        }}
                        className="p-1.5 text-[#64748B] hover:text-[#F43F5E] rounded-lg hover:bg-[#F43F5E]/10 transition-colors cursor-pointer"
                        title="Delete recorded session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <AddSessionModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAddSession={addManualSession}
        />
      )}

      {editingSession && (
        <EditSessionModal
          isOpen={Boolean(editingSession)}
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSaveSession={editSession}
        />
      )}
    </div>
  );
};
