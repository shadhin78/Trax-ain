/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Calendar as CalendarIcon, 
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useDailyActions, toIsoDate } from '../context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { DailyActionColor, DailyActionIcon } from '../types';

export const CreateDailyActionTrackerForm: React.FC = React.memo(() => {
  const { addDailyAction } = useDailyActions();
  const { subjects, programs } = useAcademicHierarchy();

  // Form Collapse State: default to collapsed (shrink mode)
  const [isExpanded, setIsExpanded] = useState(false);

  // Form Fields State
  const [actionTitle, setActionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [themeColor, setThemeColor] = useState<DailyActionColor>('indigo');
  const [icon, setIcon] = useState<DailyActionIcon>('list');
  const [track, setTrack] = useState('-- No Track (Optional) --');

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = actionTitle.trim();
    if (!trimmedTitle) {
      setErrorMsg('Please specify an Action Title (e.g. "Problem Solving Drills", "Read 10 pages").');
      return;
    }

    addDailyAction({
      title: trimmedTitle,
      description: description.trim() || undefined,
      startDate: startDate ? startDate : undefined,
      themeColor,
      icon,
      track: track !== '-- No Track (Optional) --' ? track : undefined,
    });

    // Reset fields & show success
    setActionTitle('');
    setDescription('');
    setStartDate('');
    setSuccessMsg(`Action tracker "${trimmedTitle}" created successfully!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div 
      id="create-daily-action-tracker-card"
      className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden font-mono transition-all duration-300"
    >
      {/* Ambient orange glow orb */}
      <div 
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#F97316]/5 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* ── CARD HEADER (COLLAPSIBLE TOGGLE) ── */}
      <div 
        className={`flex items-center justify-between cursor-pointer select-none group transition-all ${
          isExpanded ? 'pb-4 border-b border-white/[0.08]' : 'pb-0'
        }`}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 shadow-[0_0_16px_rgba(249,115,22,0.2)]">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#F8FAFC]">
              Create Daily Action Tracker
            </h2>
            <p className="font-mono text-[10px] sm:text-xs text-[#94A3B8] uppercase tracking-wider mt-0.5">
              CLICK TO CONFIGURE AND ADD NEW DAILY HABITS OR TRACKERS
            </p>
          </div>
        </div>

        {/* Chevron Collapse Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse Form' : 'Expand Form'}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* ── COLLAPSIBLE FORM BODY ── */}
      {isExpanded && (
        <form 
          onSubmit={handleSubmit} 
          className="mt-6 space-y-5 relative z-10 animate-desktop-accordion"
        >
          {/* Inputs Grid: 6 Columns / Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
            
            {/* 1. ACTION TITLE */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-title-input"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                ACTION TITLE
              </label>
              <input
                type="text"
                id="action-title-input"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Action Title"
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all"
              />
            </div>

            {/* 2. QUESTION / DESCRIPTION (OPTIONAL) */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-desc-input"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                QUESTION / DESCRIPTION (OPTIONAL)
              </label>
              <input
                type="text"
                id="action-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (Optional, e.g. Read 10 p"
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all"
              />
            </div>

            {/* 3. START DATE (OPTIONAL) */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-start-date-input"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                START DATE (OPTIONAL)
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="action-start-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* 4. THEME COLOR */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-theme-color-select"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                THEME COLOR
              </label>
              <select
                id="action-theme-color-select"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value as DailyActionColor)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
              >
                <option value="indigo" className="bg-[#0E121B] text-[#F8FAFC]">Indigo</option>
                <option value="emerald" className="bg-[#0E121B] text-[#F8FAFC]">Emerald</option>
                <option value="amber" className="bg-[#0E121B] text-[#F8FAFC]">Amber</option>
                <option value="cyan" className="bg-[#0E121B] text-[#F8FAFC]">Cyan</option>
                <option value="rose" className="bg-[#0E121B] text-[#F8FAFC]">Rose</option>
                <option value="violet" className="bg-[#0E121B] text-[#F8FAFC]">Violet</option>
                <option value="sky" className="bg-[#0E121B] text-[#F8FAFC]">Sky</option>
                <option value="teal" className="bg-[#0E121B] text-[#F8FAFC]">Teal</option>
              </select>
            </div>

            {/* 5. ICON */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-icon-select"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                ICON
              </label>
              <select
                id="action-icon-select"
                value={icon}
                onChange={(e) => setIcon(e.target.value as DailyActionIcon)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
              >
                <option value="list" className="bg-[#0E121B] text-[#F8FAFC]">List / Default</option>
                <option value="check" className="bg-[#0E121B] text-[#F8FAFC]">Check / Task</option>
                <option value="flame" className="bg-[#0E121B] text-[#F8FAFC]">Flame / Habit</option>
                <option value="target" className="bg-[#0E121B] text-[#F8FAFC]">Target / Goal</option>
                <option value="book" className="bg-[#0E121B] text-[#F8FAFC]">Book / Study</option>
                <option value="code" className="bg-[#0E121B] text-[#F8FAFC]">Code / Tech</option>
                <option value="dumbbell" className="bg-[#0E121B] text-[#F8FAFC]">Dumbbell / Fitness</option>
                <option value="brain" className="bg-[#0E121B] text-[#F8FAFC]">Brain / Focus</option>
                <option value="sparkles" className="bg-[#0E121B] text-[#F8FAFC]">Sparkles / Creative</option>
                <option value="zap" className="bg-[#0E121B] text-[#F8FAFC]">Zap / Energy</option>
              </select>
            </div>

            {/* 6. TRACK (OPTIONAL) */}
            <div className="space-y-1.5 lg:col-span-1">
              <label 
                htmlFor="action-track-select"
                className="block font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]"
              >
                TRACK (OPTIONAL)
              </label>
              <select
                id="action-track-select"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.22] rounded-xl px-3.5 py-3 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all cursor-pointer truncate"
              >
                <option value="-- No Track (Optional) --" className="bg-[#0E121B] text-white/50">
                  -- No Track (Optional) --
                </option>
                {subjects.map((s) => {
                  const p = programs.find((prog) => prog.id === s.programId);
                  return (
                    <option key={s.id} value={s.name} className="bg-[#0E121B] text-[#F8FAFC]">
                      {s.name} {p ? `(${p.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Bottom Row: Submit Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              id="create-action-submit-btn"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] text-white font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_24px_rgba(37,99,235,0.4)] hover:shadow-[0_0_32px_rgba(37,99,235,0.6)] md:active:scale-95"
            >
              CREATE ACTION
            </button>
          </div>
        </form>
      )}
    </div>
  );
});
