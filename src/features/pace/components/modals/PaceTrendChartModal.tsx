/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp } from 'lucide-react';
import { PaceGoal } from '../../types';
import { usePace } from '../../context/PaceContext';
import { 
  parseLocalDate, 
  formatDisplayDate, 
  formatPaceValue 
} from '../../utils/paceCalculations';

interface PaceTrendChartModalProps {
  goal: PaceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const PaceTrendChartModal: React.FC<PaceTrendChartModalProps> = ({
  goal,
  isOpen,
  onClose,
}) => {
  const { calculateStatsForGoal } = usePace();
  const [isClosing, setIsClosing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    yReq: number;
    yAct: number | null;
    yProj: number | null;
    dateStr: string;
    required: number;
    actual: number | null;
    projected: number | null;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Smooth exit animation handler (PC only; instant on mobile)
  const initiateClose = useCallback(() => {
    if (isClosing) return;
    const isPc = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
    if (!isPc) {
      onClose();
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 190);
  }, [isClosing, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to smoothly close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || !goal || typeof document === 'undefined') return null;

  const stats = calculateStatsForGoal(goal);

  // Timeline & Dates geometry calculation
  const start = parseLocalDate(goal.startDate);
  const deadline = parseLocalDate(goal.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tStart = start.getTime();
  const tDeadline = deadline.getTime();
  const tToday = Math.min(Math.max(today.getTime(), tStart), tDeadline + MS_PER_DAY * 365);
  const tProjected = stats.projectedDate ? stats.projectedDate.getTime() : tDeadline;

  // Chart end date: extend past deadline if projected date is later, but clamp to reasonable upper bound
  const tChartEnd = Math.max(
    tDeadline,
    Math.min(tProjected, tStart + Math.max(MS_PER_DAY * 45, (tDeadline - tStart) * 2.2))
  );

  const totalSpan = Math.max(MS_PER_DAY * 14, tChartEnd - tStart);

  // SVG Geometry Dimensions
  const chartWidth = 840;
  const chartHeight = 320;
  const padding = { top: 25, right: 35, bottom: 45, left: 45 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const bottomY = padding.top + graphHeight;

  const totalUnits = stats.total;
  const completedUnits = stats.completed;

  // Max Y units with subtle headroom
  const maxUnits = Math.max(10, Math.round(totalUnits * 1.12), completedUnits);

  const timeToX = (t: number) => {
    const frac = Math.min(1, Math.max(0, (t - tStart) / totalSpan));
    return padding.left + frac * graphWidth;
  };

  const unitsToY = (u: number) => {
    const frac = Math.min(1, Math.max(0, u / maxUnits));
    return padding.top + graphHeight - frac * graphHeight;
  };

  // Coordinates
  const xStart = timeToX(tStart);
  const xToday = timeToX(tToday);
  const xDeadline = timeToX(tDeadline);
  const xChartEnd = timeToX(tChartEnd);

  const yZero = unitsToY(0);
  const yTarget = unitsToY(totalUnits);
  const yCompleted = unitsToY(completedUnits);

  // 1. Required Target Path (Green dashed)
  // Starts at (xStart, yZero), reaches (xDeadline, yTarget), flatlines afterwards if chartEnd > deadline
  const reqPathD = `M ${xStart} ${yZero} L ${xDeadline} ${yTarget} ${
    tChartEnd > tDeadline ? `L ${xChartEnd} ${yTarget}` : ''
  }`;

  // 2. Actual Progression Path & Area (Purple solid with rich area gradient up to today)
  const actualPathD = `M ${xStart} ${yCompleted} L ${xToday} ${yCompleted}`;
  const actualAreaD = `M ${xStart} ${yCompleted} L ${xToday} ${yCompleted} L ${xToday} ${bottomY} L ${xStart} ${bottomY} Z`;

  // 3. Estimated Trajectory Path & Area (Orange dashed with warm amber gradient starting from today)
  let projPathD = '';
  let projAreaD = '';
  const estFinishTime = stats.projectedDate ? stats.projectedDate.getTime() : tDeadline;
  const xFinish = timeToX(Math.min(estFinishTime, tChartEnd));

  if (stats.curPace > 0 && totalUnits > completedUnits) {
    if (estFinishTime <= tChartEnd) {
      const extraFlat = xFinish < xChartEnd ? `L ${xChartEnd} ${yTarget}` : '';
      projPathD = `M ${xToday} ${yCompleted} L ${xFinish} ${yTarget} ${extraFlat}`;
      projAreaD = `M ${xToday} ${yCompleted} L ${xFinish} ${yTarget} ${extraFlat} L ${xChartEnd} ${bottomY} L ${xToday} ${bottomY} Z`;
    } else {
      // Projected finish extends past chart boundary: project accurately up to boundary
      const daysFromToday = (tChartEnd - tToday) / MS_PER_DAY;
      const projectedAtEnd = Math.min(totalUnits, completedUnits + daysFromToday * stats.curPace);
      const yEnd = unitsToY(projectedAtEnd);
      projPathD = `M ${xToday} ${yCompleted} L ${xChartEnd} ${yEnd}`;
      projAreaD = `M ${xToday} ${yCompleted} L ${xChartEnd} ${yEnd} L ${xChartEnd} ${bottomY} L ${xToday} ${bottomY} Z`;
    }
  } else {
    // If pace is 0 or already completed, extend horizontally into future
    projPathD = `M ${xToday} ${yCompleted} L ${xChartEnd} ${yCompleted}`;
    projAreaD = `M ${xToday} ${yCompleted} L ${xChartEnd} ${yCompleted} L ${xChartEnd} ${bottomY} L ${xToday} ${bottomY} Z`;
  }

  // Y-axis grid tick levels
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
    const val = Math.round(maxUnits * frac);
    const y = unitsToY(val);
    return { val, y };
  });

  // X-axis date milestones
  const xTickCount = 8;
  const xTicks = Array.from({ length: xTickCount }, (_, idx) => {
    const t = tStart + (idx / (xTickCount - 1)) * totalSpan;
    const curDate = new Date(t);
    const dateLabel = curDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const x = timeToX(t);
    return { dateLabel, x, time: t };
  });

  // Target Goal Name
  const goalTitle = goal.type === 'global' ? 'Global Pace' : (goal.target || 'Pace Target');

  // Interactive mouse move for hover crosshair inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartWidth;

    if (svgX < padding.left || svgX > chartWidth - padding.right) {
      setHoveredPoint(null);
      return;
    }

    const frac = (svgX - padding.left) / graphWidth;
    const curTime = tStart + frac * totalSpan;
    const curDate = new Date(curTime);
    const dateStr = curDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // 1. Required Target (Green line: 0 to total at deadline, flat afterwards)
    let reqVal = 0;
    if (tDeadline > tStart) {
      if (curTime <= tStart) {
        reqVal = 0;
      } else if (curTime >= tDeadline) {
        reqVal = totalUnits;
      } else {
        const pFrac = (curTime - tStart) / (tDeadline - tStart);
        reqVal = Math.round(pFrac * totalUnits * 10) / 10;
      }
    }
    const yReq = unitsToY(reqVal);

    // 2. Actual Progression (Purple line: horizontal at completedUnits up to today)
    let actVal: number | null = null;
    let yAct: number | null = null;
    if (curTime <= tToday) {
      actVal = completedUnits;
      yAct = unitsToY(completedUnits);
    }

    // 3. Estimated Trajectory (Orange line: starts at today from completedUnits)
    let projVal: number | null = null;
    let yProj: number | null = null;
    if (curTime > tToday) {
      if (stats.curPace > 0 && totalUnits > completedUnits) {
        if (estFinishTime <= tChartEnd) {
          if (curTime >= estFinishTime) {
            projVal = totalUnits;
            yProj = yTarget;
          } else {
            const prFrac = (curTime - tToday) / (estFinishTime - tToday);
            projVal = Math.round((completedUnits + prFrac * (totalUnits - completedUnits)) * 10) / 10;
            yProj = unitsToY(projVal);
          }
        } else {
          // Trajectory continues into future past chart end
          const daysFromToday = (curTime - tToday) / MS_PER_DAY;
          projVal = Math.min(
            totalUnits,
            Math.round((completedUnits + daysFromToday * stats.curPace) * 10) / 10
          );
          yProj = unitsToY(projVal);
        }
      } else {
        projVal = completedUnits;
        yProj = unitsToY(completedUnits);
      }
    }

    setHoveredPoint({
      x: svgX,
      yReq,
      yAct,
      yProj,
      dateStr,
      required: reqVal,
      actual: actVal,
      projected: projVal,
    });
  };

  return createPortal(
    <div 
      className={`
        fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-4xl rounded-3xl border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl p-5 sm:p-6
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden font-mono relative
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient legacy background glow orbs */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_16px_rgba(99,102,241,0.2)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] font-mono tracking-tight">
                  {goalTitle}
                </h3>
                <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40 font-bold">
                  Burn-Up Trajectory
                </span>
              </div>
              <p className="font-mono text-xs text-[#94A3B8] mt-0.5">
                Timeline: {formatDisplayDate(goal.startDate)} — {formatDisplayDate(goal.deadline)} • Total: {stats.total} Ch
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Chart Canvas & Interactive Inspection */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10">
          
          {/* Chart Header Legend (Clean Monospace matching user demo) */}
          <div className="flex items-center justify-center sm:justify-end gap-6 flex-wrap text-xs font-mono px-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#10B981] inline-block shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              <span className="text-[#F8FAFC] font-bold text-xs tracking-wide">Required Target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#818CF8] shadow-[0_0_10px_rgba(129,140,248,0.7)] inline-block shrink-0" />
              <span className="text-[#F8FAFC] font-bold text-xs tracking-wide">Actual Progression</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.5)] inline-block shrink-0" />
              <span className="text-[#F8FAFC] font-bold text-xs tracking-wide">Estimated Trajectory</span>
            </div>
          </div>

          {/* SVG Canvas Container with Legacy Dark Translucent Theme */}
          <div className="w-full bg-[#070A11]/75 border border-white/[0.08] rounded-2xl p-3 sm:p-5 relative overflow-hidden backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div 
              className="relative w-full cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
              <defs>
                {/* Purple Area Gradient for Actual Progression */}
                <linearGradient id="actualPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#6366F1" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
                </linearGradient>

                {/* Warm Amber Area Gradient for Estimated Trajectory */}
                <linearGradient id="trajectoryAmberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02" />
                </linearGradient>

                {/* Point Glow Filters */}
                <filter id="purpleGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#818CF8" floodOpacity="0.8" />
                </filter>
                <filter id="amberGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* Horizontal Y-Grid Lines */}
              {yTicks.map(({ val, y }, idx) => (
                <g key={`ytick-${idx}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    fill="#64748B"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {val}
                  </text>
                </g>
              ))}

              {/* Today Vertical Seam Marker Line */}
              {xToday >= padding.left && xToday <= chartWidth - padding.right && (
                <g>
                  <line
                    x1={xToday}
                    y1={padding.top}
                    x2={xToday}
                    y2={bottomY}
                    stroke="rgba(255, 255, 255, 0.16)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={xToday}
                    y={padding.top - 6}
                    fill="#94A3B8"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    TODAY
                  </text>
                </g>
              )}

              {/* 1. Actual Progression Shaded Area */}
              {actualAreaD && (
                <path
                  d={actualAreaD}
                  fill="url(#actualPurpleGrad)"
                  className="animate-chart-area"
                />
              )}

              {/* 2. Estimated Trajectory Shaded Area */}
              {projAreaD && (
                <path
                  d={projAreaD}
                  fill="url(#trajectoryAmberGrad)"
                  className="animate-chart-area"
                />
              )}

              {/* 3. Required Target Line (Green Dashed) */}
              {reqPathD && (
                <path
                  d={reqPathD}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="animate-chart-line"
                />
              )}

              {/* Required Deadline Target Marker */}
              {xDeadline <= chartWidth - padding.right && (
                <circle
                  cx={xDeadline}
                  cy={yTarget}
                  r={4.5}
                  fill="#0B0F19"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              )}

              {/* 4. Actual Progression Top Line (Solid Purple) */}
              {actualPathD && (
                <path
                  d={actualPathD}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-chart-line"
                />
              )}

              {/* Marker at Today (where actual meets projected) */}
              <circle
                cx={xToday}
                cy={yCompleted}
                r={5.5}
                fill="#818CF8"
                stroke="#070A11"
                strokeWidth={2}
                filter="url(#purpleGlow)"
              />

              {/* 5. Estimated Trajectory Top Line (Orange Dashed) */}
              {projPathD && (
                <path
                  d={projPathD}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.8"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="animate-chart-line"
                />
              )}

              {/* Projected Finish Milestone Marker (Only when finishing within visible chart) */}
              {stats.curPace > 0 && totalUnits > completedUnits && estFinishTime <= tChartEnd && xFinish <= chartWidth - padding.right && (
                <circle
                  cx={xFinish}
                  cy={yTarget}
                  r={5}
                  fill="#070A11"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  filter="url(#amberGlow)"
                />
              )}

              {/* Interactive Crosshair & Tooltip Indicator */}
              {hoveredPoint && (
                <g className="pointer-events-none">
                  {/* Vertical Crosshair Line */}
                  <line
                    x1={hoveredPoint.x}
                    y1={padding.top}
                    x2={hoveredPoint.x}
                    y2={bottomY}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />

                  {/* Dot on Required Target (Green hollow ring) */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yReq}
                    r={5}
                    fill="#070A11"
                    stroke="#10B981"
                    strokeWidth={2.5}
                  />

                  {/* Dot on Actual Progression (Purple with white center) */}
                  {hoveredPoint.yAct !== null && (
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.yAct}
                      r={5}
                      fill="#FFFFFF"
                      stroke="#818CF8"
                      strokeWidth={2.5}
                    />
                  )}

                  {/* Dot on Estimated Trajectory (Orange with white center) */}
                  {hoveredPoint.yProj !== null && (
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.yProj}
                      r={5}
                      fill="#FFFFFF"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                    />
                  )}
                </g>
              )}

              {/* X-Axis Date Ticks */}
              {xTicks.map(({ dateLabel, x }, idx) => (
                <text
                  key={`xtick-${idx}`}
                  x={x}
                  y={chartHeight - 12}
                  fill="#94A3B8"
                  fontSize="9.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {dateLabel}
                </text>
              ))}
            </svg>

            {/* Hover Tooltip Overlay Box (Floating, exactly matching Image 3 & 4) */}
            {hoveredPoint && (() => {
              const frac = hoveredPoint.x / chartWidth;
              // Horizontal translation: keep line under date string (~35%) unless near edges
              let translateX = '-35%';
              if (frac < 0.20) translateX = '-5%';
              else if (frac > 0.74) translateX = '-92%';

              const minY = Math.min(
                hoveredPoint.yReq, 
                hoveredPoint.yAct ?? 9999, 
                hoveredPoint.yProj ?? 9999
              );

              // In normal cases, tooltip sits cleanly at top (top: 8px) matching Image 3 & 4
              // If data points reach near the top (< 75px), shift horizontally to avoid obscuring
              let topStyle = '8px';
              if (minY < 75) {
                if (frac > 0.5) translateX = '-105%';
                else translateX = '10%';
                topStyle = `${Math.max(6, minY - 15)}px`;
              }

              return (
                <div 
                  className="absolute pointer-events-none z-30 transition-all duration-75 select-none"
                  style={{
                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                    top: topStyle,
                    transform: `translateX(${translateX})`,
                  }}
                >
                  <div className="bg-[#0B0F19]/95 border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.85)] rounded-xl px-3 py-2 backdrop-blur-xl text-left font-mono whitespace-nowrap min-w-[170px]">
                    <div className="text-[11px] font-bold text-[#F8FAFC] border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between">
                      <span>{hoveredPoint.dateStr}</span>
                      <span className="text-[9px] font-bold text-[#94A3B8] tracking-wider uppercase">INSPECT</span>
                    </div>

                    <div className="space-y-1 text-[10.5px]">
                      {/* Target Row (Always Present) */}
                      <div className="flex items-center justify-between gap-3 text-[#10B981]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full border border-[#10B981] inline-block shrink-0" />
                          Target:
                        </span>
                        <span className="font-bold">{hoveredPoint.required} Ch</span>
                      </div>

                      {/* Actual Row (On or before Today) */}
                      {hoveredPoint.actual !== null && (
                        <div className="flex items-center justify-between gap-3 text-[#818CF8]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#818CF8] inline-block shrink-0" />
                            Actual:
                          </span>
                          <span className="font-bold">{hoveredPoint.actual} Ch</span>
                        </div>
                      )}

                      {/* Projected Row (After Today) */}
                      {hoveredPoint.projected !== null && (
                        <div className="flex items-center justify-between gap-3 text-[#F59E0B]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full border border-[#F59E0B] inline-block shrink-0" />
                            Projected:
                          </span>
                          <span className="font-bold">{hoveredPoint.projected} Ch</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          </div>

          {/* Quick Stats Strip (Monospace, Clean, Focused) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Required Pace
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-[#F8FAFC] mt-0.5 block">
                {formatPaceValue(stats.reqPace)} ch/d
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Actual Pace
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-[#10B981] mt-0.5 block drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                {formatPaceValue(stats.curPace)} ch/d
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Est. Finish
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-[#F59E0B] mt-0.5 block drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                {stats.projectedFinishStr}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Status
              </span>
              <span className={`font-mono text-sm sm:text-base font-black mt-0.5 block ${
                stats.isBehind ? 'text-[#F97316]' : 'text-[#10B981]'
              }`}>
                {stats.countdownText}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer with Clean Monospace Close Button */}
        <div className="pt-3 border-t border-white/[0.08] flex justify-end relative z-10">
          <button
            type="button"
            onClick={initiateClose}
            className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono font-bold text-[#F8FAFC] transition-colors cursor-pointer border border-white/[0.08]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
