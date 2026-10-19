/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, BarChart2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ProgramResult } from '../../types';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { parseSubjectScore, isSubjectInputted, formatDisplayDate, mapCgpaToGrade } from '../../utils/outcomeHelpers';

interface ProgramAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProgramResult | null;
}

interface ParsedSubjectItem {
  id: string;
  name: string;
  actualNumeric: number;
  actualGrade: string;
  targetNumeric: number;
  targetGrade: string;
  targetDisplay: string;
  hasValidTarget: boolean;
  isAttempted: boolean;
  status: 'MET' | 'NEAR' | 'BELOW' | 'N/A';
  isPassed: boolean;
}

export const ProgramAnalyticsModal: React.FC<ProgramAnalyticsModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const { subjects } = useAcademicHierarchy();

  // Mode switcher: 'bar' | 'line'
  const [chartMode, setChartMode] = useState<'bar' | 'line'>(() => {
    try {
      const saved = localStorage.getItem('x29_outcome_subj_chart_mode');
      return saved === 'line' ? 'line' : 'bar';
    } catch {
      return 'bar';
    }
  });

  const handleModeChange = (mode: 'bar' | 'line') => {
    setChartMode(mode);
    try {
      localStorage.setItem('x29_outcome_subj_chart_mode', mode);
    } catch {}
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all subjects for this program
  const subjectItems: ParsedSubjectItem[] = useMemo(() => {
    if (!result) return [];

    const progSubjects = (subjects || []).filter((s) => s.programId === result.programId);
    const loggedMap = new Map<string, (typeof result.subjectGrades)[0]>();

    if (result.subjectGrades && result.subjectGrades.length > 0) {
      result.subjectGrades.forEach((sg) => {
        loggedMap.set(sg.subjectId, sg);
      });
    }

    const isProgramTargetNeutral = Boolean(
      result.targetIsNone ||
      !result.targetCgpa ||
      result.targetCgpa <= 0 ||
      result.targetGrade?.toLowerCase() === 'none'
    );

    // Merge: start with logged grades, supplement with hierarchy subjects if missing
    const combinedIds = new Set<string>();
    const list: ParsedSubjectItem[] = [];

    // 1. Process logged subject grades
    if (result.subjectGrades && result.subjectGrades.length > 0) {
      result.subjectGrades.forEach((sg) => {
        combinedIds.add(sg.subjectId);
        const attempted = isSubjectInputted(sg);
        const actInfo = parseSubjectScore(
          sg.actualScore ?? sg.actualCgpa,
          result.evaluationOption
        );
        const tarInfo = parseSubjectScore(
          sg.targetScore,
          result.evaluationOption
        );

        const actualNumeric = attempted ? actInfo.numeric : 0;
        const actualGrade = attempted ? (sg.actualGrade || actInfo.grade) : '—';

        // Check if subject or program has a real inputted target
        let targetNumeric = 0;
        let targetGrade = 'None';
        let targetDisplay = 'None';
        let hasValidTarget = false;

        if (tarInfo.isInputted && tarInfo.numeric > 0) {
          hasValidTarget = true;
          targetNumeric = tarInfo.numeric;
          targetGrade = tarInfo.grade;
          targetDisplay = `${targetNumeric.toFixed(2)} (${targetGrade})`;
        } else if (!isProgramTargetNeutral && (result.targetCgpa || 0) > 0) {
          hasValidTarget = true;
          targetNumeric = result.targetCgpa;
          targetGrade = result.targetGrade || mapCgpaToGrade(result.targetCgpa, result.evaluationOption);
          targetDisplay = `${targetNumeric.toFixed(2)} (${targetGrade})`;
        }

        let status: 'MET' | 'NEAR' | 'BELOW' | 'N/A' = 'N/A';
        if (hasValidTarget && attempted && actualNumeric > 0) {
          if (actualNumeric >= targetNumeric) status = 'MET';
          else if (actualNumeric >= targetNumeric - 0.35) status = 'NEAR';
          else status = 'BELOW';
        }

        list.push({
          id: sg.subjectId,
          name: sg.subjectName,
          actualNumeric,
          actualGrade,
          targetNumeric,
          targetGrade,
          targetDisplay,
          hasValidTarget,
          isAttempted: attempted,
          status,
          isPassed: sg.isPassed ?? (actualNumeric >= 2.0),
        });
      });
    }

    // 2. Add any hierarchy subjects not already logged (marked as N/A)
    progSubjects.forEach((ps) => {
      if (!combinedIds.has(ps.id)) {
        combinedIds.add(ps.id);
        let targetNumeric = 0;
        let targetGrade = 'None';
        let targetDisplay = 'None';
        let hasValidTarget = false;

        if (!isProgramTargetNeutral && (result.targetCgpa || 0) > 0) {
          hasValidTarget = true;
          targetNumeric = result.targetCgpa;
          targetGrade = result.targetGrade || mapCgpaToGrade(result.targetCgpa, result.evaluationOption);
          targetDisplay = `${targetNumeric.toFixed(2)} (${targetGrade})`;
        }

        list.push({
          id: ps.id,
          name: ps.name,
          actualNumeric: 0,
          actualGrade: '—',
          targetNumeric,
          targetGrade,
          targetDisplay,
          hasValidTarget,
          isAttempted: false,
          status: 'N/A',
          isPassed: false,
        });
      }
    });

    return list;
  }, [result, subjects]);

  // Aggregate stats
  const { attemptedCount, totalCount, avgActual, avgTarget, hasAnyTarget, passedCount } = useMemo(() => {
    const total = subjectItems.length;
    const attempted = subjectItems.filter((s) => s.isAttempted && s.actualNumeric > 0);
    const passed = subjectItems.filter((s) => s.isPassed && s.isAttempted);
    const targetItems = subjectItems.filter((s) => s.hasValidTarget && s.targetNumeric > 0);

    const sumAct = attempted.reduce((acc, s) => acc + s.actualNumeric, 0);
    const sumTar = targetItems.reduce((acc, s) => acc + s.targetNumeric, 0);

    return {
      totalCount: total,
      attemptedCount: attempted.length,
      passedCount: passed.length,
      avgActual: attempted.length > 0 ? Number((sumAct / attempted.length).toFixed(2)) : 0,
      avgTarget: targetItems.length > 0 ? Number((sumTar / targetItems.length).toFixed(2)) : 0,
      hasAnyTarget: targetItems.length > 0,
    };
  }, [subjectItems]);

  // Y-axis ticks from 4.0 to 0.0
  const yTicks = [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];

  // Measurements & Line SVG coordinate state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutState, setLayoutState] = useState<{
    width: number;
    height: number;
    centers: Record<string, number>;
  }>({
    width: 0,
    height: 0,
    centers: {},
  });

  const updateMeasurements = useCallback(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;

    const centers: Record<string, number> = {};
    for (const item of subjectItems) {
      const el = columnRefs.current.get(item.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        centers[item.id] = rect.left + rect.width / 2 - svgRect.left;
      }
    }

    setLayoutState({ width, height, centers });
  }, [subjectItems]);

  useLayoutEffect(() => {
    if (!isOpen || chartMode !== 'line') return;
    updateMeasurements();

    if (typeof window === 'undefined' || !svgRef.current) return;
    const observer = new ResizeObserver(() => updateMeasurements());
    observer.observe(svgRef.current);
    window.addEventListener('resize', updateMeasurements);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [isOpen, chartMode, updateMeasurements]);

  const plotH = layoutState.height > 0 ? layoutState.height : 208;
  const plotW = layoutState.width > 0 ? layoutState.width : 500;
  const originX = 0;
  const originY = plotH;

  // Build target and actual points for line chart
  const { targetPoints, actualPoints } = useMemo(() => {
    const total = subjectItems.length;
    const { centers } = layoutState;

    // Target curve starts at (0, 0.0) baseline ONLY if valid targets exist
    const tPts: Array<{ id: string; x: number; y: number; val: number; grade: string; name: string }> = [];
    const validTargetSubjects = subjectItems.filter((s) => s.hasValidTarget && s.targetNumeric > 0);

    if (validTargetSubjects.length > 0) {
      tPts.push({ id: '__origin_target__', x: originX, y: originY, val: 0.0, grade: '', name: 'Origin' });
      validTargetSubjects.forEach((s) => {
        const idx = subjectItems.indexOf(s);
        const x =
          centers[s.id] !== undefined
            ? centers[s.id]
            : total <= 1
            ? plotW / 2
            : ((idx + 0.5) / total) * plotW;

        const clampedTar = Math.max(0, Math.min(4.0, s.targetNumeric));
        const targetY = originY - (clampedTar / 4.0) * plotH;
        tPts.push({ id: s.id, x, y: targetY, val: s.targetNumeric, grade: s.targetGrade, name: s.name });
      });
    }

    // Actual curve starts at (0, 0.0) baseline
    const aPts: Array<{ id: string; x: number; y: number; val: number; grade: string; name: string }> = [
      { id: '__origin_actual__', x: originX, y: originY, val: 0.0, grade: '', name: 'Origin' },
    ];

    subjectItems.forEach((s, idx) => {
      if (s.isAttempted && s.actualNumeric > 0) {
        const x =
          centers[s.id] !== undefined
            ? centers[s.id]
            : total <= 1
            ? plotW / 2
            : ((idx + 0.5) / total) * plotW;

        const clampedAct = Math.max(0, Math.min(4.0, s.actualNumeric));
        const actualY = originY - (clampedAct / 4.0) * plotH;
        aPts.push({ id: s.id, x, y: actualY, val: s.actualNumeric, grade: s.actualGrade, name: s.name });
      }
    });

    return { targetPoints: tPts, actualPoints: aPts };
  }, [subjectItems, layoutState, originX, originY, plotH, plotW]);

  // Construct smooth cubic bezier curve paths
  const linePaths = useMemo(() => {
    const buildPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length < 2) return { line: '', area: '' };

      let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      const n = pts.length;

      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];

        const pPrev = i > 0 ? pts[i - 1] : { x: p0.x - (p1.x - p0.x), y: p0.y + (p0.y - p1.y) };
        const pNext = i + 2 < n ? pts[i + 2] : { x: p1.x + (p1.x - p0.x), y: p1.y - (p0.y - p1.y) };

        const smoothing = 0.2;
        const cp1x = p0.x + (p1.x - pPrev.x) * smoothing;
        const cp1y = p0.y + (p1.y - pPrev.y) * smoothing;
        const cp2x = p1.x - (pNext.x - p0.x) * smoothing;
        const cp2y = p1.y - (pNext.y - p0.y) * smoothing;

        line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }

      const last = pts[n - 1];
      const area = `${line} L ${last.x.toFixed(1)} ${originY.toFixed(1)} L ${originX.toFixed(1)} ${originY.toFixed(1)} Z`;
      return { line, area };
    };

    return {
      target: buildPath(targetPoints),
      actual: buildPath(actualPoints),
    };
  }, [targetPoints, actualPoints, originX, originY]);

  if (!isOpen || !result) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-modal-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[28px] border border-white/[0.12] bg-[#0B0F19]/90 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_32px_rgba(6,182,212,0.12)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL TOP HEADER ── */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-[#38BDF8] shadow-[0_0_16px_rgba(6,182,212,0.25)] shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2
                id="analytics-modal-title"
                className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight truncate uppercase"
              >
                {result.programName} Progression
              </h2>
              <p className="text-[11px] text-[#94A3B8] font-bold mt-0.5 truncate">
                Historical Actual vs Target CGPA comparison.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics modal"
            className="p-2 rounded-xl bg-[#131722] hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 2. SCROLLABLE CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ── SUB-HEADER: SECTION TITLE & NO-BG INSIDE GLOWING SWITCH ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Subject-Wise Result Section Indicator (No Overall Result section per user instruction) */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[11px] font-black text-[#38BDF8] tracking-wider uppercase">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>SUBJECT-WISE RESULT</span>
            </div>

            {/* BAR / LINE Switcher: "no bg with inside glowing style" */}
            <div
              role="group"
              aria-label="Chart mode"
              className="flex items-center p-1 rounded-xl border border-white/[0.12] bg-transparent shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
            >
              <button
                type="button"
                onClick={() => handleModeChange('bar')}
                aria-pressed={chartMode === 'bar'}
                aria-label="Bar Chart"
                className={`px-3.5 py-1 text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                  chartMode === 'bar'
                    ? 'rounded-lg text-white bg-transparent border border-[#06B6D4]/70 shadow-[inset_0_0_12px_rgba(6,182,212,0.5),0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
                }`}
              >
                BAR
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('line')}
                aria-pressed={chartMode === 'line'}
                aria-label="Line Chart"
                className={`px-3.5 py-1 text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                  chartMode === 'line'
                    ? 'rounded-lg text-white bg-transparent border border-[#06B6D4]/70 shadow-[inset_0_0_12px_rgba(6,182,212,0.5),0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
                }`}
              >
                LINE
              </button>
            </div>
          </div>

          {/* ── 3. CHART CANVAS CONTAINER ── */}
          {subjectItems.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                NO SUBJECTS RECORDED FOR THIS PROGRAM
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                Edit the result to log subject-wise target and actual grades.
              </p>
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto pt-2 pb-2">
              <div className="min-w-[520px] h-64 sm:h-72 flex flex-col justify-between relative pl-8 pr-4">
                {/* Horizontal Gridlines & Y-Axis Labels */}
                <div className="absolute inset-x-0 top-6 h-40 sm:h-48 pointer-events-none">
                  {yTicks.map((val) => (
                    <div
                      key={val}
                      className="absolute inset-x-0 flex items-center -translate-y-1/2"
                      style={{ top: `${((4.0 - val) / 4.0) * 100}%` }}
                    >
                      <span
                        className={`w-7 text-[10px] text-right font-bold pr-2 select-none ${
                          chartMode === 'line' && val === 0 ? 'text-[#06B6D4]' : 'text-[#64748B]'
                        }`}
                      >
                        {val.toFixed(1)}
                      </span>
                      <div className="flex-1 border-b border-white/[0.05]" />
                    </div>
                  ))}
                </div>

                {/* MODE 1: BAR CHART (Exact layout matching Results Trend Dual-Bar) */}
                {chartMode === 'bar' ? (
                  <div
                    key="subject-bar-mode"
                    className="flex-1 flex items-start justify-around gap-4 pt-6 pb-1 pl-8 relative z-10 group/row md:transition-opacity md:duration-300"
                  >
                    {subjectItems.map((subj, idx) => {
                      const actualHeight = Math.min(100, (subj.actualNumeric / 4.0) * 100);
                      const targetHeight = Math.min(100, (subj.targetNumeric / 4.0) * 100);
                      const showActualBar = subj.isAttempted && subj.actualNumeric > 0;

                      return (
                        <div
                          key={subj.id}
                          className="flex flex-col items-center flex-1 max-w-[120px] group cursor-pointer relative md:animate-column-rise md:transition-opacity md:duration-200 md:group-hover/row:opacity-60 md:hover:!opacity-100"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          {/* Upper Plot Area */}
                          <div className="w-full h-40 sm:h-48 relative flex items-end justify-center">
                            {/* Vertical Hover Guideline */}
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px pointer-events-none transition-all duration-200 bg-white/[0.03] group-hover:bg-white/20" />

                            {/* Floating Tooltip Popover (Matching Line Chart Style) */}
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-30 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-white/20 text-[9px] font-mono font-bold shadow-[0_8px_24px_rgba(0,0,0,0.6)] whitespace-nowrap">
                                {showActualBar ? (
                                  <span className="text-[#06B6D4] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shadow-[0_0_6px_#06B6D4]" />
                                    ACT: {subj.actualNumeric.toFixed(2)} ({subj.actualGrade})
                                  </span>
                                ) : (
                                  <span className="text-[#64748B]">ACT: N/A</span>
                                )}
                                <span className="text-white/20">|</span>
                                <span className="text-[#F59E0B] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]" />
                                  TAR: {subj.hasValidTarget && subj.targetNumeric > 0 ? `${subj.targetNumeric.toFixed(2)} (${subj.targetGrade})` : 'None'}
                                </span>
                              </div>
                            </div>

                            {/* Bar Pair: Actual (Cyan) + Target (Amber) */}
                            <div className="w-full flex items-end justify-center gap-2 h-full relative z-10">
                              {/* Actual Score Bar */}
                              {showActualBar ? (
                                <div
                                  className="w-7 sm:w-10 rounded-t-xl bg-gradient-to-t from-[#06B6D4]/20 via-[#06B6D4]/70 to-[#06B6D4] border-t-2 border-[#67E8F9] border-x border-[#06B6D4]/30 shadow-[0_0_16px_rgba(6,182,212,0.25)] origin-bottom md:animate-bar-rise md:transition-all md:duration-300 md:ease-out md:group-hover:-translate-y-1 md:group-hover:shadow-[0_0_28px_rgba(6,182,212,0.55)] md:group-hover:brightness-115 relative"
                                  style={{
                                    height: `${Math.max(4, actualHeight)}%`,
                                    animationDelay: `${idx * 60}ms`,
                                  }}
                                >
                                  {/* Neon glow top cap */}
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-0.5 rounded-full bg-white/90 shadow-[0_0_8px_#67E8F9] opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ) : (
                                <div className="w-7 sm:w-10 h-1.5 rounded-t bg-white/[0.05] border-t border-white/10" />
                              )}

                              {/* Target Score Bar */}
                              {subj.hasValidTarget && subj.targetNumeric > 0 ? (
                                <div
                                  className="w-7 sm:w-10 rounded-t-xl bg-gradient-to-t from-[#F59E0B]/20 via-[#F59E0B]/70 to-[#F59E0B] border-t-2 border-[#FDE68A] border-x border-[#F59E0B]/30 shadow-[0_0_16px_rgba(245,158,11,0.25)] origin-bottom md:animate-bar-rise md:transition-all md:duration-300 md:ease-out md:group-hover:-translate-y-1 md:group-hover:shadow-[0_0_28px_rgba(245,158,11,0.55)] md:group-hover:brightness-115 relative"
                                  style={{
                                    height: `${Math.max(4, targetHeight)}%`,
                                    animationDelay: `${idx * 60 + 30}ms`,
                                  }}
                                >
                                  {/* Neon glow top cap */}
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-0.5 rounded-full bg-white/90 shadow-[0_0_8px_#FDE68A] opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ) : (
                                <div className="w-7 sm:w-10 h-1.5 rounded-t bg-white/[0.05] border-t border-white/10" />
                              )}
                            </div>
                          </div>

                          {/* Subject Name Label Below Column */}
                          <div className="mt-2 text-center w-full px-1">
                            <span
                              className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors block truncate max-w-[100px] mx-auto"
                              title={subj.name}
                            >
                              {subj.name}
                            </span>
                            <span className="text-[9px] text-white/30 block">
                              {showActualBar ? `${subj.actualNumeric.toFixed(2)} (${subj.actualGrade})` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* MODE 2: LINE CHART (Exact smooth bezier curves matching Image 3) */
                  <div
                    key="subject-line-mode"
                    className="flex-1 flex flex-col justify-between pt-6 pb-1 pl-8 relative z-10 w-full"
                  >
                    {/* Measurement Columns Grid */}
                    <div className="w-full h-40 sm:h-48 flex justify-around relative">
                      {subjectItems.map((subj) => (
                        <div
                          key={subj.id}
                          ref={(el) => {
                            if (el) columnRefs.current.set(subj.id, el);
                            else columnRefs.current.delete(subj.id);
                          }}
                          className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative"
                        >
                          {/* Hover Guideline */}
                          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px pointer-events-none transition-all duration-200 bg-white/[0.03] group-hover:bg-white/20" />

                          {/* Hover Popover Tooltip */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-30 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-white/20 text-[9px] font-mono font-bold shadow-[0_8px_24px_rgba(0,0,0,0.6)] whitespace-nowrap">
                              {subj.isAttempted && subj.actualNumeric > 0 ? (
                                <span className="text-[#06B6D4] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shadow-[0_0_6px_#06B6D4]" />
                                  ACT: {subj.actualNumeric.toFixed(2)} ({subj.actualGrade})
                                </span>
                              ) : (
                                <span className="text-[#64748B]">ACT: N/A</span>
                              )}
                              <span className="text-white/20">|</span>
                              <span className="text-[#F59E0B] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]" />
                                TAR: {subj.targetNumeric.toFixed(2)} ({subj.targetGrade})
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* SVG Canvas overlaying precisely */}
                      <svg
                        ref={svgRef}
                        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible md:animate-chart-sweep-lr"
                      >
                        <defs>
                          {/* Cyan actual area gradient */}
                          <linearGradient id="subjActualGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.32" />
                            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                          </linearGradient>

                          {/* Amber target area gradient */}
                          <linearGradient id="subjTargetGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                            <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.06" />
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                          </linearGradient>

                          {/* Filter glows */}
                          <filter id="subjCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#06B6D4" floodOpacity="0.8" />
                          </filter>
                          <filter id="subjAmberGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#F59E0B" floodOpacity="0.8" />
                          </filter>
                        </defs>

                        {/* 1. Target Curve Area & Line */}
                        {linePaths.target.area && (
                          <path d={linePaths.target.area} fill="url(#subjTargetGradient)" />
                        )}
                        {linePaths.target.line && (
                          <path
                            d={linePaths.target.line}
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#subjAmberGlow)"
                          />
                        )}

                        {/* 2. Actual Curve Area & Line */}
                        {linePaths.actual.area && (
                          <path d={linePaths.actual.area} fill="url(#subjActualGradient)" />
                        )}
                        {linePaths.actual.line && (
                          <path
                            d={linePaths.actual.line}
                            fill="none"
                            stroke="#06B6D4"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#subjCyanGlow)"
                          />
                        )}

                        {/* 3. Circular Points: Target Points */}
                        {targetPoints.map((pt) => (
                          <g key={`tar-pt-${pt.id}`}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="7"
                              fill="#0B0F19"
                              stroke="#F59E0B"
                              strokeWidth="2.5"
                              filter="url(#subjAmberGlow)"
                            />
                            <circle cx={pt.x} cy={pt.y} r="2.5" fill="#FDE68A" />
                          </g>
                        ))}

                        {/* 4. Circular Points: Actual Points */}
                        {actualPoints.map((pt) => (
                          <g key={`act-pt-${pt.id}`}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="7"
                              fill="#0B0F19"
                              stroke="#06B6D4"
                              strokeWidth="2.5"
                              filter="url(#subjCyanGlow)"
                            />
                            <circle cx={pt.x} cy={pt.y} r="2.5" fill="#67E8F9" />
                          </g>
                        ))}
                      </svg>
                    </div>

                    {/* X-Axis Subject Labels for Line Mode */}
                    <div className="w-full flex justify-around mt-2">
                      {subjectItems.map((subj) => (
                        <div key={subj.id} className="text-center w-full px-1">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] block truncate max-w-[100px] mx-auto"
                            title={subj.name}
                          >
                            {subj.name}
                          </span>
                          <span className="text-[9px] text-white/30 block">
                            {subj.isAttempted && subj.actualNumeric > 0
                              ? `${subj.actualNumeric.toFixed(2)} (${subj.actualGrade})`
                              : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. LEGEND & STATS ROW (Matching Image 2 & 3/4) ── */}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col items-center gap-3">
            {/* Status & Bar Legend Badges */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center text-[10px] font-bold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-[#10B981]/40 text-[#34D399]">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>ACTUAL (MET TARGET)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-[#F59E0B]/40 text-[#FBBF24]">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span>ACTUAL (NEAR TARGET)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-[#F43F5E]/40 text-[#FDA4AF]">
                <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
                <span>ACTUAL (BELOW TARGET)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131722] border border-white/20 text-[#94A3B8]">
                <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                <span>SUBJECT TARGET BAR</span>
              </span>
            </div>

            {/* Performance Summary Statistics */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center text-[10px] font-bold text-[#94A3B8]">
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                COMPLETED: <span className="text-white">{attemptedCount}</span> / {totalCount}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                AVG ACTUAL: <span className="text-[#38BDF8]">{avgActual.toFixed(2)}</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                AVG TARGET: <span className="text-[#FBBF24]">{hasAnyTarget ? avgTarget.toFixed(2) : 'None'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                PASSED: <span className="text-[#34D399]">{passedCount}</span>
              </span>
            </div>
          </div>

          {/* ── 5. SUBJECT-WISE BREAKDOWN TABLE (Matching Image 2 Bottom) ── */}
          <div className="pt-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/80 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-black text-[#94A3B8] uppercase tracking-wider">
                <span className="col-span-5 sm:col-span-4">SUBJECT NAME</span>
                <span className="col-span-2 text-center">ACTUAL</span>
                <span className="col-span-2 text-center">GRADE</span>
                <span className="col-span-3 sm:col-span-2 text-center">TARGET</span>
                <span className="hidden sm:inline-block sm:col-span-2 text-right pr-2">STATUS</span>
              </div>

              {/* Rows List */}
              <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto">
                {subjectItems.map((subj) => {
                  return (
                    <div
                      key={subj.id}
                      className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs md:transition-colors md:hover:bg-white/[0.03]"
                    >
                      {/* 1. Subject Name */}
                      <div className="col-span-5 sm:col-span-4 min-w-0">
                        <span className="font-bold text-[#F8FAFC] truncate block text-xs" title={subj.name}>
                          {subj.name}
                        </span>
                      </div>

                      {/* 2. Actual Numeric Score (Cyan) */}
                      <div className="col-span-2 text-center font-mono font-bold">
                        {subj.isAttempted && subj.actualNumeric > 0 ? (
                          <span className="text-[#06B6D4] text-xs sm:text-sm">
                            {subj.actualNumeric.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-xs">N/A</span>
                        )}
                      </div>

                      {/* 3. Actual Grade (Amber) */}
                      <div className="col-span-2 text-center font-mono font-bold">
                        {subj.isAttempted && subj.actualGrade !== '—' ? (
                          <span className="text-[#F59E0B] text-xs sm:text-sm">
                            {subj.actualGrade}
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-xs">—</span>
                        )}
                      </div>

                      {/* 4. Target Score & Grade */}
                      <div className="col-span-3 sm:col-span-2 text-center font-mono text-[11px] text-[#94A3B8] truncate">
                        {subj.targetDisplay}
                      </div>

                      {/* 5. Status Pill (Met / Near / Below / N/A) */}
                      <div className="hidden sm:flex sm:col-span-2 justify-end pr-2">
                        {subj.status === 'MET' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 border border-[#10B981]/30 text-[#34D399]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                            <span>Met</span>
                          </span>
                        )}
                        {subj.status === 'NEAR' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            <span>Near</span>
                          </span>
                        )}
                        {subj.status === 'BELOW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
                            <span>Below</span>
                          </span>
                        )}
                        {subj.status === 'N/A' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.04] border border-white/[0.08] text-[#64748B]">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
