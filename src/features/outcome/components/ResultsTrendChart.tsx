/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, BarChart2 } from 'lucide-react';
import { useOutcome } from '../context/OutcomeContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { formatShortDate } from '../utils/outcomeHelpers';

const ResultsTrendChartComponent: React.FC = () => {
  const { filteredResults, selectedProgramFilter, setSelectedProgramFilter, trackAverages } = useOutcome();
  const { programs } = useAcademicHierarchy();

  // Program results only for the CGPA trend chart (filter out standalone achievements)
  const programResults = useMemo(() => {
    return filteredResults.filter((r) => r.resultType !== 'Achievement');
  }, [filteredResults]);

  // Selected summary stats
  const { avgActual, avgTarget, hasAnyTarget } = useMemo(() => {
    if (programResults.length === 0) return { avgActual: 0, avgTarget: 0, hasAnyTarget: false };
    const totAct = programResults.reduce((a, b) => a + (b.actualCgpa || 0), 0);
    const targetResults = programResults.filter((b) => !b.targetIsNone && (b.targetCgpa || 0) > 0);
    const totTar = targetResults.reduce((a, b) => a + (b.targetCgpa || 0), 0);
    return {
      avgActual: Number((totAct / programResults.length).toFixed(2)),
      avgTarget: targetResults.length > 0 ? Number((totTar / targetResults.length).toFixed(2)) : 0,
      hasAnyTarget: targetResults.length > 0,
    };
  }, [programResults]);

  // Y-axis ticks from 0.0 to 4.0
  const yTicks = [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];

  return (
    <div className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none">
      {/* ── HEADER ROW ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <h3 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase">
          RESULTS &amp; PERFORMANCE TREND
        </h3>

        <div className="flex items-center gap-2.5">
          {/* Programs dropdown filter */}
          <div className="relative">
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="appearance-none h-9 pl-3.5 pr-8 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-[11px] font-bold text-[#F8FAFC] hover:border-white/20 focus:border-[#F59E0B] outline-none cursor-pointer transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
            >
              <option value="ALL">ALL PROGRAMS</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── CHART CANVAS AREA ── */}
      <div className="mt-6">
        {programResults.length === 0 ? (
          /* Empty state without fake demo data */
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#94A3B8] mb-3">
              <BarChart2 className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">
              NO RESULTS LOGGED YET
            </p>
            <p className="text-[11px] text-white/30 max-w-sm mt-1">
              Click <span className="text-[#F59E0B] font-bold">+ ADD RESULT</span> to log your target and actual CGPA per program.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto pt-4 pb-4">
            <div className="min-w-[500px] h-72 sm:h-80 flex flex-col justify-between relative pl-8 pr-4">
              {/* Horizontal Gridlines & Y-Axis Labels (Exact plot alignment top-8 h-44 sm:h-52) */}
              <div className="absolute inset-x-0 top-8 h-44 sm:h-52 pointer-events-none">
                {yTicks.map((val) => (
                  <div
                    key={val}
                    className="absolute inset-x-0 flex items-center -translate-y-1/2"
                    style={{ top: `${((4.0 - val) / 4.0) * 100}%` }}
                  >
                    <span className="w-7 text-[10px] text-right font-bold pr-2 select-none text-[#64748B]">
                      {val.toFixed(1)}
                    </span>
                    <div className="flex-1 border-b border-white/[0.05]" />
                  </div>
                ))}
              </div>

              {/* Bar Chart Visualization */}
              <div
                className="flex-1 flex items-start justify-around gap-6 pt-8 pb-1 pl-8 relative z-10 group/row md:transition-opacity md:duration-300"
              >
                {programResults.map((result, idx) => {
                  const actualHeight = Math.min(100, (result.actualCgpa / 4.0) * 100);
                  const targetHeight = Math.min(100, (result.targetCgpa / 4.0) * 100);
                  const showActualBar = result.actualCgpa > 0;

                  return (
                    <div
                      key={result.id}
                      className="flex flex-col items-center flex-1 max-w-[140px] group cursor-pointer relative animate-column-rise md:transition-opacity md:duration-200 md:group-hover/row:opacity-60 md:hover:!opacity-100"
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      {/* Upper Plot Area (h-44 sm:h-52 matching plot height) */}
                      <div className="w-full h-44 sm:h-52 relative flex items-end justify-center">
                        {/* Vertical Hover Guideline */}
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px pointer-events-none transition-all duration-200 bg-white/[0.03] group-hover:bg-white/20" />

                        {/* Floating Tooltip Popover */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-30 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-white/20 text-[9px] font-mono font-bold shadow-[0_8px_24px_rgba(0,0,0,0.6)] whitespace-nowrap">
                            {showActualBar && (
                              <span className="text-[#06B6D4] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shadow-[0_0_6px_#06B6D4]" />
                                ACT: {result.actualCgpa.toFixed(2)}
                              </span>
                            )}
                            {showActualBar && <span className="text-white/20">|</span>}
                            <span className="text-[#F59E0B] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]" />
                              TAR: {!result.targetIsNone && (result.targetCgpa || 0) > 0 ? result.targetCgpa.toFixed(2) : 'None'}
                            </span>
                          </div>
                        </div>

                        {/* Bar Pair */}
                        <div className="w-full flex items-end justify-center gap-2.5 h-full relative z-10">
                          {/* Actual CGPA Bar (Cyan Gradient + Glowing Cap, Down to Up Rise) */}
                          {showActualBar && (
                            <div
                              className="w-9 sm:w-13 rounded-t-xl bg-gradient-to-t from-[#06B6D4]/20 via-[#06B6D4]/70 to-[#06B6D4] border-t-2 border-[#67E8F9] border-x border-[#06B6D4]/30 shadow-[0_0_16px_rgba(6,182,212,0.25)] origin-bottom animate-bar-rise md:transition-all md:duration-300 md:ease-out md:group-hover:-translate-y-1 md:group-hover:shadow-[0_0_28px_rgba(6,182,212,0.55)] md:group-hover:brightness-115 relative"
                              style={{
                                height: `${Math.max(4, actualHeight)}%`,
                                animationDelay: `${idx * 70}ms`,
                              }}
                            >
                              {/* Top cap neon glow highlight */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-0.5 rounded-full bg-white/90 shadow-[0_0_8px_#67E8F9] opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}

                          {/* Target CGPA Bar (Amber Gradient + Glowing Cap, Down to Up Rise) */}
                          {!result.targetIsNone && (result.targetCgpa || 0) > 0 ? (
                            <div
                              className="w-9 sm:w-13 rounded-t-xl bg-gradient-to-t from-[#F59E0B]/20 via-[#F59E0B]/70 to-[#F59E0B] border-t-2 border-[#FDE68A] border-x border-[#F59E0B]/30 shadow-[0_0_16px_rgba(245,158,11,0.25)] origin-bottom animate-bar-rise md:transition-all md:duration-300 md:ease-out md:group-hover:-translate-y-1 md:group-hover:shadow-[0_0_28px_rgba(245,158,11,0.55)] md:group-hover:brightness-115 relative"
                              style={{
                                height: `${Math.max(4, targetHeight)}%`,
                                animationDelay: `${idx * 70 + 40}ms`,
                              }}
                            >
                              {/* Top cap neon glow highlight */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-0.5 rounded-full bg-white/90 shadow-[0_0_8px_#FDE68A] opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ) : (
                            <div className="w-9 sm:w-13 h-1.5 rounded-t bg-white/[0.05] border-t border-white/10" />
                          )}
                        </div>
                      </div>

                      {/* Bar Label below */}
                      <div className="mt-2 text-center">
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors block truncate max-w-[120px]">
                          {result.programName}
                        </span>
                        <span className="text-[9px] text-white/30 block">
                          ({formatShortDate(result.date)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── LEGEND & SUB-METRIC BADGES ROW ── */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col items-center gap-3">
          {/* Main Legend: Actual CGPA & Target CGPA */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-[#06B6D4]/40 text-xs font-bold text-[#F8FAFC]">
              <span className="h-2 w-2 rounded-full bg-[#06B6D4]" />
              <span>ACTUAL CGPA: {avgActual.toFixed(2)}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-[#F59E0B]/40 text-xs font-bold text-[#F8FAFC]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span>TARGET CGPA: {hasAnyTarget ? avgTarget.toFixed(2) : 'None'}</span>
            </span>
          </div>

          {/* Sub-Metric Pills (Track Averages: CA AVG, BBA AVG matching Image 1) */}
          {trackAverages.length > 0 && (
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {trackAverages.map(({ trackId, trackName, avgCgpa, grade }) => (
                <span
                  key={trackId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-white/[0.08] text-[10px] font-bold text-[#94A3B8]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  <span>
                    {trackName} AVG: <span className="text-[#F8FAFC]">{avgCgpa.toFixed(2)}</span>{' '}
                    <span className={grade === 'F' ? 'text-[#F43F5E]' : 'text-[#10B981]'}>
                      ({grade})
                    </span>
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResultsTrendChart = React.memo(ResultsTrendChartComponent);
ResultsTrendChart.displayName = 'ResultsTrendChart';
