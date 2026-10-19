/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useCallback } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../../outcome/context/OutcomeContext';
import { AppRoute } from '../../../../types/navigation';

interface PassedSubjectsShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

// Glowing dot palette matching legacy theme aesthetic
const DOT_PALETTE = [
  '#34D399', // Emerald green
  '#2DD4BF', // Teal
  '#38BDF8', // Sky blue
  '#818CF8', // Indigo
  '#A78BFA', // Violet
  '#F472B6', // Pink
  '#FB923C', // Amber
];

export const PassedSubjectsShortcutCard: React.FC<PassedSubjectsShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { subjects, programs, chapters } = useAcademicHierarchy();
  const { freezeConfig } = useOutcome();

  const handleNavigate = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('/outcome/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/outcome/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onNavigate]);

  // Program lookup map for fast O(1) resolution
  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    (programs || []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [programs]);

  // Chapter count map per subject
  const chapterCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (chapters || []).forEach((c) => {
      if (c.subjectId) {
        map.set(c.subjectId, (map.get(c.subjectId) || 0) + 1);
      }
    });
    return map;
  }, [chapters]);

  // Dynamically resolve passed/frozen subjects from real Outcome & Academic data
  const passedSubjects = useMemo(() => {
    const frozenSubjectIds = new Set(freezeConfig?.frozenSubjectIds || []);
    const manualSubjectIds = new Set(freezeConfig?.manualFrozenSubjectIds || []);
    const frozenProgramIds = new Set(freezeConfig?.frozenProgramIds || []);
    const manualProgramIds = new Set(freezeConfig?.manualFrozenProgramIds || []);

    return (subjects || [])
      .filter((sub) => {
        return (
          frozenSubjectIds.has(sub.id) ||
          manualSubjectIds.has(sub.id) ||
          (sub.programId ? frozenProgramIds.has(sub.programId) || manualProgramIds.has(sub.programId) : false)
        );
      })
      .sort((a, b) => {
        // Group by program, then subject order / name
        const progA = programMap.get(a.programId || '') || '';
        const progB = programMap.get(b.programId || '') || '';
        if (progA !== progB) return progA.localeCompare(progB);
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [subjects, freezeConfig, programMap]);

  const passedCount = passedSubjects.length;
  const totalCount = subjects?.length || 0;
  const passPercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] select-none overflow-hidden relative group">
      {/* ── AMBIENT TINT GLOW (LEGACY THEME ACCENT) ── */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-500 bg-[#10B981]"
      />

      {/* ── TOP HEADER ROW: TITLE + % BADGE + COUNT BADGE + NAVIGATION ICON ONLY ── */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/[0.06] mb-1.5 shrink-0 relative z-10">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              PASSED SUBJECTS
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Percentage badge */}
          <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[#34D399] text-[8px] sm:text-[8.5px] font-bold tracking-tight">
            {passPercentage}%
          </span>

          {/* Passed count badge */}
          <span className="px-2 py-0.5 rounded-full border border-[#10B981]/30 bg-[#10B981]/15 text-[#34D399] text-[8px] sm:text-[8.5px] font-bold tracking-tight flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            {passedCount} PASSED
          </span>

          <button
            type="button"
            onClick={handleNavigate}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            title="Open Outcome"
            aria-label="Open Outcome"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── CARD BODY: SCROLLABLE LIST OF PASSED SUBJECTS ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-start space-y-1.5 sm:space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full relative z-10 py-0.5">
        {passedSubjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 my-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] text-[#64748B] mb-2">
              <ShieldCheck className="h-5 w-5 text-[#34D399]/60" />
            </div>
            <p className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">NO PASSED SUBJECTS YET</p>
            <p className="text-[9px] text-[#64748B] mt-0.5 max-w-[200px]">Mark subjects as passed in the Outcome section to freeze them.</p>
            <button
              type="button"
              onClick={handleNavigate}
              className="mt-2 text-[9px] font-bold text-[#34D399] hover:underline uppercase transition-colors"
            >
              Configure in Outcome →
            </button>
          </div>
        ) : (
          passedSubjects.map((sub, idx) => {
            const programName = (programMap.get(sub.programId || '') || 'PROGRAM').toUpperCase();
            const chapterCount = chapterCountMap.get(sub.id) || 0;
            const dotColor = DOT_PALETTE[idx % DOT_PALETTE.length];

            return (
              <div
                key={sub.id}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#10B981]/25 transition-all duration-200 backdrop-blur-md flex items-center justify-between gap-2.5"
              >
                {/* Left Side: Status Dot + Subject Name + Program & Chapters */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: dotColor,
                      boxShadow: `0 0 8px ${dotColor}90`,
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-tight truncate drop-shadow-sm">
                      {sub.name}
                    </h4>
                    <p className="text-[8.5px] sm:text-[9px] font-bold text-[#34D399] tracking-wide uppercase truncate mt-0.5">
                      {programName} • {chapterCount} CH
                    </p>
                  </div>
                </div>

                {/* Right Side: ✓ PASS Pill Badge */}
                <div className="px-2 sm:px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 whitespace-nowrap shadow-[0_0_8px_rgba(16,185,129,0.15)] shrink-0">
                  ✓ PASS
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── CARD FOOTER DYNAMIC TELEMETRY ── */}
      <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px] sm:text-[8.5px] text-[#64748B] shrink-0 font-medium relative z-10">
        <span>CURRICULUM ARCHIVE</span>
        <span className="text-[#34D399] font-bold">
          {passPercentage}% COMPLETED
        </span>
      </div>
    </div>
  );
});

PassedSubjectsShortcutCard.displayName = 'PassedSubjectsShortcutCard';
