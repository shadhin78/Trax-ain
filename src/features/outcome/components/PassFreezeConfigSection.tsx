/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useOutcome } from '../context/OutcomeContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';

const PassFreezeConfigSectionComponent: React.FC = () => {
  const { freezeConfig, toggleProgramFreeze, toggleSubjectFreeze } = useOutcome();
  const { tracks, programs, subjects } = useAcademicHierarchy();

  const [isOpen, setIsOpen] = useState(false);
  const [openSubjectProgramId, setOpenSubjectProgramId] = useState<string | null>(null);

  // Group programs by track
  const programsByTrack = useMemo(() => tracks.map((track) => ({
    track,
    programs: programs.filter((p) => p.trackId === track.id),
  })), [tracks, programs]);

  return (
    <div className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300">
      {/* ── COLLAPSIBLE HEADER ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#34D399] shadow-[0_0_14px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight group-hover:text-white">
              Pass / Freeze Configuration
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
              CLICK TO VIEW PROGRAM OR SUBJECT FREEZE SETTINGS
            </p>
          </div>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] group-hover:text-white">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* ── EXPANDED CONTENT ── */}
      {isOpen && (
        <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-6">
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Mark entire programs or specific subjects as &quot;Passed&quot;. This freezes them, compressing their UI in the Task List and instantly satisfying their pacing requirements.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* ── COLUMN 1: PROGRAMS (FREEZE ALL SUBS) ── */}
            <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.06] bg-[#131722]/60">
              <h4 className="text-xs font-black text-[#F8FAFC] tracking-wider uppercase mb-4">
                PROGRAMS (FREEZE ALL SUBS)
              </h4>

              {programsByTrack.length === 0 ? (
                <div className="text-xs text-[#64748B] py-4">No tracks configured yet.</div>
              ) : (
                <div className="space-y-5">
                  {programsByTrack.map(({ track, programs: progs }) => (
                    <div key={track.id} className="space-y-2.5">
                      <div className="pb-1.5 border-b border-white/[0.08]">
                        <span className="text-[10px] font-black text-[#94A3B8] tracking-widest uppercase block">
                          {track.name}
                        </span>
                      </div>

                      <div className="space-y-2 pl-1">
                        {progs.map((program) => {
                          const isFrozen = freezeConfig.frozenProgramIds.includes(program.id);
                          return (
                            <div
                              key={program.id}
                              onClick={() => toggleProgramFreeze(program.id)}
                              className="flex items-center justify-between p-2 rounded-xl bg-transparent hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] text-xs text-[#F8FAFC] font-bold cursor-pointer select-none group transition-all"
                            >
                              <span className="group-hover:text-white transition-colors">{program.name}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isFrozen}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProgramFreeze(program.id);
                                }}
                                className={`
                                  relative inline-flex items-center h-5 w-9 shrink-0 rounded-full bg-transparent p-0.5 transition-all duration-200 cursor-pointer border
                                  ${
                                    isFrozen
                                      ? 'border-[#10B981] shadow-[inset_0_0_10px_rgba(16,185,129,0.65)] ring-1 ring-[#10B981]/40'
                                      : 'border-white/20 hover:border-white/40'
                                  }
                                `}
                              >
                                <span
                                  className={`
                                    inline-block h-3.5 w-3.5 rounded-full transition-transform duration-200
                                    ${
                                      isFrozen
                                        ? 'translate-x-4 bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.95)]'
                                        : 'translate-x-0 bg-white/40'
                                    }
                                  `}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── COLUMN 2: INDIVIDUAL SUBJECTS (MATCHING CANONICAL DESIGN) ── */}
            <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.06] bg-[#131722]/60">
              <h4 className="text-xs font-black text-[#F8FAFC] tracking-wider uppercase mb-4">
                INDIVIDUAL SUBJECTS
              </h4>

              <div className="space-y-2.5">
                {programs.map((program) => {
                  const subsInProg = subjects.filter((s) => s.programId === program.id);
                  const isAccordionOpen = openSubjectProgramId === program.id;

                  return (
                    <div
                      key={program.id}
                      className="rounded-xl border border-white/[0.06] bg-[#0B0F19]/60 overflow-hidden md:hover:border-white/[0.12] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenSubjectProgramId(isAccordionOpen ? null : program.id)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-white/[0.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-[#F8FAFC] uppercase">{program.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                            {subsInProg.length} SUBS
                          </span>
                        </div>
                        {isAccordionOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                        )}
                      </button>

                      {isAccordionOpen && (
                        <div className="p-3 pt-0 border-t border-white/[0.04] space-y-2 mt-2">
                          {subsInProg.length === 0 ? (
                            <p className="text-[10px] text-[#64748B]">No subjects in this program.</p>
                          ) : (
                            subsInProg.map((sub) => {
                              const isSubFrozen = freezeConfig.frozenSubjectIds.includes(sub.id);
                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => toggleSubjectFreeze(sub.id)}
                                  className="flex items-center justify-between p-2 rounded-xl bg-transparent hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer select-none group transition-all"
                                >
                                  <span className="group-hover:text-white transition-colors">{sub.name}</span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isSubFrozen}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubjectFreeze(sub.id);
                                    }}
                                    className={`
                                      relative inline-flex items-center h-4.5 w-8 shrink-0 rounded-full bg-transparent p-0.5 transition-all duration-200 cursor-pointer border
                                      ${
                                        isSubFrozen
                                          ? 'border-[#10B981] shadow-[inset_0_0_8px_rgba(16,185,129,0.65)] ring-1 ring-[#10B981]/40'
                                          : 'border-white/20 hover:border-white/40'
                                      }
                                    `}
                                  >
                                    <span
                                      className={`
                                        inline-block h-3 w-3 rounded-full transition-transform duration-200
                                        ${
                                          isSubFrozen
                                            ? 'translate-x-3.5 bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.95)]'
                                            : 'translate-x-0 bg-white/40'
                                        }
                                      `}
                                    />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PassFreezeConfigSection = React.memo(PassFreezeConfigSectionComponent);
PassFreezeConfigSection.displayName = 'PassFreezeConfigSection';
