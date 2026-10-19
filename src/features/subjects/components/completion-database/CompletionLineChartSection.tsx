/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LineChart as ChartIcon } from 'lucide-react';
import { ChapterCompletionRecord } from '../../../../types/academic';
import {
  ChartFilterRange,
  calculateChartData,
} from './completionUtils';

interface CompletionLineChartSectionProps {
  records: ChapterCompletionRecord[];
}

export const CompletionLineChartSection: React.FC<CompletionLineChartSectionProps> = ({ records }) => {
  const [selectedRange, setSelectedRange] = useState<ChartFilterRange>('7days');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const filterOptions: Array<{ id: ChartFilterRange; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: '7 Days' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'lifetime', label: 'Lifetime' },
  ];

  const chartData = useMemo(() => {
    return calculateChartData(records, selectedRange);
  }, [records, selectedRange]);

  const { points, totalCompleted, peakCount } = chartData;

  // Chart Dimensions & Layout coordinates
  const svgWidth = 720;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Y-axis maximum: ensure at least 4 for clean aesthetic ticks
  const yAxisMax = Math.max(peakCount, 4);

  // Compute point coordinates
  const pointCoordinates = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((pt, i) => {
      const x = padLeft + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
      const y = padTop + plotHeight - (pt.count / yAxisMax) * plotHeight;
      return { ...pt, x, y, index: i };
    });
  }, [points, yAxisMax, plotWidth, plotHeight, padLeft, padTop]);

  // Construct SVG paths for line and area fill (Smooth Cubic Bezier Spline)
  const { linePath, areaPath } = useMemo(() => {
    if (pointCoordinates.length === 0) return { linePath: '', areaPath: '' };
    if (pointCoordinates.length === 1) {
      const p = pointCoordinates[0];
      return {
        linePath: `M ${p.x - 24} ${p.y} L ${p.x + 24} ${p.y}`,
        areaPath: `M ${p.x - 24} ${p.y} L ${p.x + 24} ${p.y} L ${p.x + 24} ${padTop + plotHeight} L ${p.x - 24} ${padTop + plotHeight} Z`,
      };
    }

    const first = pointCoordinates[0];
    const last = pointCoordinates[pointCoordinates.length - 1];

    let path = `M ${first.x} ${first.y}`;
    for (let i = 0; i < pointCoordinates.length - 1; i++) {
      const p0 = pointCoordinates[i];
      const p1 = pointCoordinates[i + 1];
      const dx = p1.x - p0.x;
      const cp1x = p0.x + dx * 0.45;
      const cp1y = p0.y;
      const cp2x = p1.x - dx * 0.45;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    const area = `${path} L ${last.x} ${padTop + plotHeight} L ${first.x} ${padTop + plotHeight} Z`;

    return { linePath: path, areaPath: area };
  }, [pointCoordinates, padTop, plotHeight]);

  const activePoint = hoveredPointIndex !== null ? pointCoordinates[hoveredPointIndex] : null;

  // Label sampling for Month & Lifetime range (avoid horizontal label overlap)
  const shouldShowLabel = (index: number, total: number) => {
    if (selectedRange === 'month') {
      if (total <= 10) return true;
      const day = index + 1;
      return day === 1 || day % 5 === 0 || day === total;
    }
    if (selectedRange === 'lifetime') {
      if (total <= 8) return true;
      const step = Math.ceil(total / 6);
      return index % step === 0 || index === total - 1;
    }
    return true;
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#131722]/40 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-4">
      {/* ── HEADER: TITLE + TIME-RANGE FILTER BUTTONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-[#818CF8]" />
          <h3 className="font-mono text-sm sm:text-base font-bold text-[#F8FAFC]">
            Progress
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#A5B4FC] font-semibold">
            {totalCompleted} {totalCompleted === 1 ? 'Chapter' : 'Chapters'}
          </span>
        </div>

        {/* ── TIME-RANGE FILTER PILLS ── */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] overflow-x-auto max-w-full">
          {filterOptions.map((opt) => {
            const isActive = selectedRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedRange(opt.id);
                  setHoveredPointIndex(null);
                }}
                className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#6366F1]/25 text-[#A5B4FC] border border-[#6366F1]/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE SVG LINE CHART ── */}
      <div className="relative w-full rounded-2xl border border-white/[0.06] bg-[#0E121B]/70 p-3 sm:p-4 overflow-hidden">
        <div 
          className="w-full overflow-x-auto focus:outline-none"
          tabIndex={0}
          aria-label="Chapter completion line chart visualization"
        >
          <svg
            className="w-full h-auto min-w-[560px] max-h-[270px] select-none"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Area Gradient */}
              <linearGradient id="completionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.30" />
                <stop offset="85%" stopColor="#6366F1" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>

              {/* Line Glow Filter */}
              <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis values */}
            {[0, Math.round(yAxisMax / 2), yAxisMax].map((tickVal, idx) => {
              const yPos = padTop + plotHeight - (tickVal / yAxisMax) * plotHeight;
              return (
                <g key={`y-grid-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={svgWidth - padRight}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.07)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={yPos + 3.5}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Active Vertical Guideline on Hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + plotHeight}
                stroke="#818CF8"
                strokeOpacity="0.4"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
            )}

            {/* Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#completionAreaGrad)"
                className="transition-all duration-300"
              />
            )}

            {/* Main Glowing Smooth Line Path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#6366F1"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#chartGlow)"
                className="transition-all duration-300"
              />
            )}

            {/* Interactive Data Point Dots */}
            {pointCoordinates.map((pt, idx) => {
              const isHovered = hoveredPointIndex === idx;
              const hasActivity = pt.count > 0;

              return (
                <g
                  key={`pt-${idx}`}
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                  onClick={() => setHoveredPointIndex(isHovered ? null : idx)}
                  className="cursor-pointer group"
                >
                  {/* Invisible enlarged hit target for easy mouse/touch picking */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="14"
                    fill="transparent"
                  />

                  {/* Outer Pulsing Aura when hovered */}
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="rgba(99, 102, 241, 0.25)"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer Border Dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? '6.5' : hasActivity ? '4.5' : '3'}
                    fill={hasActivity ? '#6366F1' : '#1F2637'}
                    stroke={isHovered ? '#FFFFFF' : hasActivity ? '#818CF8' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isHovered ? '2.5' : '1.5'}
                    className="transition-all duration-150"
                  />

                  {/* Active Count Badge over point if hovered or if activity > 0 */}
                  {hasActivity && (
                    <text
                      x={pt.x}
                      y={pt.y - 9}
                      textAnchor="middle"
                      fill={isHovered ? '#F8FAFC' : '#A5B4FC'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {pt.count}
                    </text>
                  )}

                  {/* X-Axis Tick Label */}
                  {shouldShowLabel(idx, pointCoordinates.length) && (
                    <text
                      x={pt.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fill={isHovered ? '#F8FAFC' : '#94A3B8'}
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── EMPTY STATE OVERLAY (When 0 chapters completed in selected range) ── */}
        {totalCompleted === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-center">
            <p className="font-mono text-xs text-[#94A3B8]">
              No activity in this time range
            </p>
          </div>
        )}
      </div>

      {/* ── DYNAMIC TOOLTIP / ACTIVE POINT DETAILS INSPECTOR ── */}
      {activePoint && (
        <div className="p-3 rounded-xl border border-[#6366F1]/30 bg-[#0E121B]/90 backdrop-blur-md text-xs font-mono space-y-1.5 animate-in fade-in duration-150 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-[#818CF8] flex items-center gap-1.5">
              <span className="text-[#6366F1]">●</span> {activePoint.tooltipTitle}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-semibold text-[11px]">
              {activePoint.count} {activePoint.count === 1 ? 'Chapter' : 'Chapters'}
            </span>
          </div>

          {activePoint.records.length > 0 && (
            <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {activePoint.records.map((rec) => (
                <span
                  key={rec.id}
                  className="px-2 py-0.5 rounded bg-black/50 border border-white/[0.08] text-[11px] text-[#F8FAFC]"
                >
                  CH {rec.chapterNumber} • {rec.topicName || rec.chapterTitle}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
