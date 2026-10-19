/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clock, Calendar, MapPin, Zap, ChevronDown, Radio, AlertCircle } from 'lucide-react';
import { useExamRoutine } from '../context/ExamRoutineContext';

const ExamCountdownBannerComponent: React.FC = () => {
  const { activeExamBanner, allExamSubjects, pinnedSubjectId, setPinnedSubjectId } = useExamRoutine();
  const [isPinDropdownOpen, setIsPinDropdownOpen] = useState(false);

  const status = activeExamBanner?.timeRemaining.status || 'UPCOMING';
  const isLive = status === 'LIVE_IN_PROGRESS';
  const isEnded = status === 'ENDED';

  // 4 dynamic tier units
  const units = activeExamBanner?.timeRemaining.units || [
    { label: 'MONTHS', value: '00' },
    { label: 'DAYS', value: '00' },
    { label: 'HOURS', value: '00' },
    { label: 'MINS', value: '00' },
  ];

  const sessionTag = activeExamBanner?.session?.title || 'GENERAL';

  // Tier badge text
  const tierLabel = activeExamBanner
    ? isLive
      ? 'LIVE IN PROGRESS'
      : isEnded
      ? 'EXAM ENDED'
      : activeExamBanner.timeRemaining.tier === 'LONG_TERM'
      ? 'LONG-TERM TARGET'
      : activeExamBanner.timeRemaining.tier === 'SHORT_TERM'
      ? 'SHORT-TERM FINAL STRETCH'
      : 'TIME REMAINING'
    : 'TIME REMAINING';

  return (
    <div className="w-full rounded-[28px] sm:rounded-[32px] border border-[#F43F5E]/30 bg-gradient-to-r from-[#121622] via-[#221019] to-[#3a0d18] p-5 sm:p-7 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] font-mono select-none relative overflow-hidden">
      {/* Background ambient glow halo on PC */}
      <div 
        className="hidden md:block absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#F43F5E]/15 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* ── LEFT COLUMN: TITLES & META BADGES ── */}
        <div className="space-y-3.5 flex-1 min-w-0">
          {/* Row 1: Badges & Pin Selector */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* LIVE / STATUS Pill */}
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#FCA5A5] shadow-[0_0_16px_rgba(239,68,68,0.4)]">
                <span className="h-2 w-2 rounded-full bg-[#EF4444] md:animate-ping shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                <Radio className="h-3 w-3 stroke-[3] text-[#EF4444]" />
                <span>LIVE / IN PROGRESS NOW</span>
              </span>
            ) : isEnded ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#64748B]/20 border border-[#64748B]/40 text-[#94A3B8]">
                <AlertCircle className="h-3 w-3 text-[#94A3B8]" />
                <span>EXAM ENDED (30M+)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#FDA4AF] shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                <span className="h-2 w-2 rounded-full bg-[#F43F5E] md:animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                <span>LIVE COUNTDOWN</span>
              </span>
            )}

            {/* Session Tag Pill */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#DDD6FE]">
              {sessionTag}
            </span>

            {/* Pin Selection Dropdown (Manual vs Auto Target Selection Rule 1) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPinDropdownOpen(!isPinDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#131722]/90 hover:bg-[#131722] border border-white/[0.12] hover:border-white/25 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <span>PIN:</span>
                <Zap className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-[#F8FAFC] font-black truncate max-w-[150px] sm:max-w-[200px]">
                  {pinnedSubjectId === 'AUTO'
                    ? 'Auto (Nearest Subject Exam)'
                    : activeExamBanner?.subject?.subjectName || 'Pinned Exam'}
                </span>
                <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
              </button>

              {/* Pin Dropdown Menu */}
              {isPinDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-white/[0.12] bg-[#0E1320] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.8)] z-50 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedSubjectId('AUTO');
                      setIsPinDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                      pinnedSubjectId === 'AUTO'
                        ? 'bg-[#F43F5E]/20 text-[#FDA4AF] border border-[#F43F5E]/40'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
                      <span>Auto (Nearest Subject Exam)</span>
                    </span>
                  </button>

                  {allExamSubjects.length > 0 && (
                    <div className="border-t border-white/[0.06] pt-1 space-y-1 max-h-48 overflow-y-auto pr-1">
                      {allExamSubjects.map(({ subject, session }) => (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => {
                            setPinnedSubjectId(subject.id);
                            setIsPinDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                            pinnedSubjectId === subject.id
                              ? 'bg-[#F43F5E]/20 text-[#FDA4AF] font-bold border border-[#F43F5E]/40'
                              : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="truncate">{subject.subjectName}</span>
                          <span className="text-[10px] text-white/40">{session.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Big Subject Title (Matching Screenshot) */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F8FAFC] tracking-tight">
              {activeExamBanner ? activeExamBanner.subject.subjectName : 'NO EXAM SCHEDULED'}
            </h2>
          </div>

          {/* Row 3: Target Subject Exam line */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#94A3B8]">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FDA4AF] shrink-0" />
            <span className="truncate">
              Target Subject Exam:{' '}
              <span className="font-bold text-[#F8FAFC]">
                {activeExamBanner
                  ? `${activeExamBanner.subject.subjectName} (${activeExamBanner.timeRemaining.formattedDateString})`
                  : 'Schedule an exam session below'}
              </span>
            </span>
          </div>

          {/* Row 4: Meta chips (Venue & Date) */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {/* Location chip */}
            <div
              className="h-8 px-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5 text-xs text-[#94A3B8]"
              title={activeExamBanner?.subject?.venue || 'Venue: Main Exam Hall'}
            >
              <MapPin className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-[11px] font-bold truncate max-w-[150px]">
                {activeExamBanner?.subject?.venue || 'Venue: Main Exam Hall'}
              </span>
            </div>

            {/* Date chip */}
            <div className="h-8 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <Calendar className="h-3.5 w-3.5 text-[#FDA4AF]" />
              <span className="text-[11px] font-bold">
                Date: {activeExamBanner ? activeExamBanner.timeRemaining.formattedDateString : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: TIME REMAINING DECK (DYNAMIC 4-UNIT TIERS OR LIVE NOW INDICATOR) ── */}
        <div
          className={`
            rounded-2xl border p-4 sm:p-5 flex flex-col items-center shrink-0 self-start lg:self-center font-mono
            ${
              isLive
                ? 'border-[#EF4444]/60 bg-[#26090e]/90 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
                : 'border-[#F43F5E]/30 bg-[#160B12]/85 backdrop-blur-md shadow-[0_0_24px_rgba(244,63,94,0.18)]'
            }
          `}
        >
          {/* Header label shifts across Long-Term, Medium-Term, Short-Term, Live Now */}
          <div className="flex items-center gap-1.5 mb-3">
            {isLive && <span className="h-2 w-2 rounded-full bg-[#EF4444] md:animate-ping" />}
            <span
              className={`text-[10px] font-black tracking-widest uppercase ${
                isLive ? 'text-[#FCA5A5]' : 'text-[#FDA4AF]'
              }`}
            >
              {tierLabel}
            </span>
          </div>

          {/* 4 Dynamic Units */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {units.map((unit, idx) => {
              const isLastUnit = idx === 3;
              return (
                <div
                  key={`${unit.label}-${idx}`}
                  className={`
                    min-w-[54px] sm:min-w-[66px] h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center
                    ${
                      isLive
                        ? 'bg-[#3b0b14] border border-[#EF4444]/50 shadow-[inset_0_0_12px_rgba(239,68,68,0.4)]'
                        : 'bg-[#240e18] border border-[#F43F5E]/40 shadow-[inset_0_0_12px_rgba(244,63,94,0.3)] md:hover:border-[#F43F5E]/70 md:transition-all'
                    }
                  `}
                >
                  <span
                    className={`
                      text-xl sm:text-3xl font-black tracking-tight
                      ${
                        isLive
                          ? 'text-[#FCA5A5]'
                          : isLastUnit
                          ? 'text-[#F43F5E]'
                          : 'text-[#F8FAFC]'
                      }
                    `}
                  >
                    {unit.value}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-black text-[#94A3B8] tracking-widest uppercase mt-0.5">
                    {unit.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExamCountdownBanner = React.memo(ExamCountdownBannerComponent);
ExamCountdownBanner.displayName = 'ExamCountdownBanner';
