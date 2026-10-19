/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TimerStatus, TimerMode } from '../types';

interface AnalogClockDialProps {
  secondsAngle: number;
  minutesAngle: number;
  status: TimerStatus;
  mode: TimerMode;
  progressPercent: number;
  displayRemainingMs?: number;
  displayElapsedMs?: number;
}

/**
 * Precision Chronograph Analog Dial Component.
 * Faithfully matches the mechanical dial structure from the reference design:
 * - 60-second perimeter dial with prominent 5-minute numerals (60, 5, 10, ... 55)
 * - 60 high-contrast tick marks (major at 5s, minor at 1s)
 * - Clock hands ALWAYS run CLOCKWISE in all modes (Stopwatch, Timer, Alarm Range)
 * - Numerals and ticks actively act as progress / timer countdown:
 *   - In TIMER mode: numerals and ticks ahead of the clockwise needle remain illuminated
 *     in the active site accent color (#818CF8 / #6366F1) representing the remaining countdown,
 *     while consumed time is dimmed.
 *   - In STOPWATCH mode: numerals and ticks from 0 up to current needle illuminate progressively.
 *   - In ALARM_RANGE mode: numerals and ticks reflect the daily alarm window progress.
 * - 30-minute chronometer sub-dial at the 6 o'clock position with minute needle
 * - High-precision electric accent needle with circular white hub donut
 * - Monospace typography and strict adherence to Project-X color tokens
 * - GPU-accelerated glow/sweep animation on PC only; lightweight and battery-efficient on mobile.
 */
// Dial Geometry Coordinates (320x320 SVG canvas)
const CX = 160;
const CY = 160;
const R_TICKS = 138;
const R_NUMBERS = 114;

// Sub-dial at 6 o'clock
const SUB_CX = 160;
const SUB_CY = 212;
const SUB_RADIUS = 33;

// Precomputed outer ticks geometry
const OUTER_TICKS_STATIC = Array.from({ length: 60 }).map((_, i) => {
  const isMajor = i % 5 === 0;
  const deg = i * 6;
  const rad = (deg - 90) * (Math.PI / 180);
  const rOuter = R_TICKS;
  const rInner = isMajor ? R_TICKS - 10 : R_TICKS - 5;
  return {
    i,
    isMajor,
    x1: CX + rOuter * Math.cos(rad),
    y1: CY + rOuter * Math.sin(rad),
    x2: CX + rInner * Math.cos(rad),
    y2: CY + rInner * Math.sin(rad),
  };
});

// Precomputed outer numbers geometry
const OUTER_NUMBERS_STATIC = [
  { num: '60', deg: 0, sec: 0 },
  { num: '5', deg: 30, sec: 5 },
  { num: '10', deg: 60, sec: 10 },
  { num: '15', deg: 90, sec: 15 },
  { num: '20', deg: 120, sec: 20 },
  { num: '25', deg: 150, sec: 25 },
  { num: '30', deg: 180, sec: 30 },
  { num: '35', deg: 210, sec: 35 },
  { num: '40', deg: 240, sec: 40 },
  { num: '45', deg: 270, sec: 45 },
  { num: '50', deg: 300, sec: 50 },
  { num: '55', deg: 330, sec: 55 },
].map((item) => {
  const rad = (item.deg - 90) * (Math.PI / 180);
  return {
    ...item,
    x: CX + R_NUMBERS * Math.cos(rad),
    y: CY + R_NUMBERS * Math.sin(rad),
  };
});

// Precomputed sub-dial ticks geometry
const SUB_DIAL_TICKS_STATIC = Array.from({ length: 30 }).map((_, i) => {
  const isSubMajor = i % 5 === 0;
  const deg = i * 12;
  const rad = (deg - 90) * (Math.PI / 180);
  const rOuter = SUB_RADIUS - 1.5;
  const rInner = isSubMajor ? SUB_RADIUS - 5.5 : SUB_RADIUS - 3.5;
  return {
    i,
    isSubMajor,
    x1: SUB_CX + rOuter * Math.cos(rad),
    y1: SUB_CY + rOuter * Math.sin(rad),
    x2: SUB_CX + rInner * Math.cos(rad),
    y2: SUB_CY + rInner * Math.sin(rad),
  };
});

// Precomputed sub-dial numbers geometry
const SUB_DIAL_NUMBERS_STATIC = [
  { num: '30', deg: 0, min: 0 },
  { num: '5', deg: 60, min: 5 },
  { num: '10', deg: 120, min: 10 },
  { num: '15', deg: 180, min: 15 },
  { num: '20', deg: 240, min: 20 },
  { num: '25', deg: 300, min: 25 },
].map((item) => {
  const rad = (item.deg - 90) * (Math.PI / 180);
  const rNum = SUB_RADIUS - 9;
  return {
    ...item,
    x: SUB_CX + rNum * Math.cos(rad),
    y: SUB_CY + rNum * Math.sin(rad),
  };
});

export const AnalogClockDial: React.FC<AnalogClockDialProps> = React.memo(({
  secondsAngle,
  minutesAngle,
  status,
  mode,
  progressPercent,
}) => {
  const isRunning = status === 'RUNNING';
  const isCompleted = status === 'COMPLETED';
  const isIdle = status === 'IDLE';

  // Normalize needle angle to 0..359.999°
  const normalizedAngle = ((secondsAngle % 360) + 360) % 360;
  // Current second in the 60-second cycle (0 to 59.999...)
  const currentSecond = normalizedAngle / 6;

  const cx = CX;
  const cy = CY;
  const rTicks = R_TICKS;
  const subCx = SUB_CX;
  const subCy = SUB_CY;
  const subRadius = SUB_RADIUS;

  /**
   * Determine if an outer perimeter tick (index 0..59) is active / illuminated.
   */
  const isTickActive = (i: number): boolean => {
    if (isCompleted) return true;

    if (mode === 'TIMER' || mode === 'ALARM_RANGE') {
      if (isIdle) {
        // In TIMER mode, countdown cycle is ready / illuminated
        // In ALARM_RANGE mode, the clock is OFF until set and started!
        return mode === 'TIMER';
      }
      // Clockwise needle sweeps 0 -> 60. Remaining countdown arc is from needle position to 59
      return i >= Math.floor(currentSecond);
    }

    if (mode === 'STOPWATCH') {
      if (isIdle) {
        return i === 0;
      }
      // Progress sweeps clockwise from 0 up to needle position
      return i <= Math.ceil(currentSecond);
    }

    return false;
  };

  /**
   * Determine if an outer numeral (60, 5, 10, ... 55) is active / illuminated.
   */
  const isNumberActive = (num: string, sec: number): boolean => {
    if (isCompleted) return true;

    if (mode === 'TIMER' || mode === 'ALARM_RANGE') {
      if (isIdle) {
        return mode === 'TIMER';
      }
      // Top numeral 60 is at 0s / 60s
      if (num === '60') {
        return currentSecond < 2.5;
      }
      // The current 5-second interval and all numerals ahead in the countdown are active
      const activeFloor = Math.floor(currentSecond / 5) * 5;
      return sec >= activeFloor;
    }

    if (mode === 'STOPWATCH') {
      if (isIdle) {
        return num === '60';
      }
      if (num === '60') {
        return currentSecond < 5 || currentSecond >= 55;
      }
      const activeCeil = Math.ceil(currentSecond / 5) * 5;
      return sec <= activeCeil;
    }

    return false;
  };

  return (
    <div className="relative flex items-center justify-center w-full max-w-[340px] sm:max-w-[380px] aspect-square mx-auto select-none">
      {/* ── AMBIENT GLOW BACKDROP (PC ONLY ANIMATION) ── */}
      <div
        className={`
          hidden md:block absolute inset-4 rounded-full pointer-events-none transition-all duration-700
          ${
            isRunning
              ? 'bg-[#6366F1]/15 blur-3xl animate-pulse scale-105'
              : 'bg-transparent blur-none'
          }
        `}
        aria-hidden="true"
      />

      {/* ── VECTOR CHRONOGRAPH DIAL ── */}
      <svg
        viewBox="0 0 320 320"
        className="w-full h-full overflow-visible font-mono"
        aria-label="Precision Analog Chronometer Dial"
      >
        <defs>
          {/* PC Specular Glow Filter for Electric Neon Second Hand */}
          <filter id="pcNeedleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── 0. PERIMETER DIAL TRACK CIRCLE (MODERATE WHITE) ── */}
        <circle
          cx={cx}
          cy={cy}
          r={rTicks}
          fill="none"
          stroke="rgba(241, 245, 249, 0.16)"
          strokeWidth="1"
        />

        {/* ── 1. OUTER TICK MARKS (60 SECONDS GRADUATIONS IN MODERATE WHITE) ── */}
        <g id="outer-tick-marks">
          {OUTER_TICKS_STATIC.map(({ i, isMajor, x1, y1, x2, y2 }) => {
            const active = isTickActive(i);

            // Moderate white styling: clear and visible without harsh glare
            let strokeColor = isMajor ? 'rgba(248, 250, 252, 0.70)' : 'rgba(241, 245, 249, 0.38)';
            let strokeWidth = isMajor ? 1.8 : 1.0;

            if (active) {
              strokeColor = '#818CF8';
              strokeWidth = isMajor ? 2.4 : 1.4;
            }

            return (
              <line
                key={`tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={strokeWidth}
                stroke={strokeColor}
                strokeLinecap="round"
                className={`transition-colors duration-150 ${active ? 'md:drop-shadow-[0_0_2px_rgba(99,102,241,0.7)]' : ''}`}
              />
            );
          })}
        </g>

        {/* ── 2. OUTER NUMERALS (60, 5, 10, ... 55 IN MODERATE WHITE) ── */}
        <g id="outer-numerals">
          {OUTER_NUMBERS_STATIC.map(({ num, sec, x, y }) => {
            const active = isNumberActive(num, sec);

            return (
              <text
                key={`num-${num}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={active ? '#818CF8' : 'rgba(241, 245, 249, 0.62)'}
                fontSize="13.5"
                fontFamily="monospace"
                fontWeight="900"
                className={`select-none tracking-tighter transition-colors duration-200 ${
                  active ? 'md:[filter:drop-shadow(0_0_5px_rgba(99,102,241,0.65))]' : ''
                }`}
              >
                {num}
              </text>
            );
          })}
        </g>

        {/* ── 3. 30-MINUTE SUB-DIAL (CHRONOMETER AT 6 O'CLOCK) ── */}
        <g id="chronograph-sub-dial">
          {/* Sub-dial Inset Disc */}
          <circle
            cx={subCx}
            cy={subCy}
            r={subRadius}
            fill="#090D16"
            fillOpacity="0.92"
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth="1.2"
          />

          {/* Sub-dial 30 graduation ticks */}
          {SUB_DIAL_TICKS_STATIC.map(({ i, isSubMajor, x1, y1, x2, y2 }) => (
            <line
              key={`subtick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={isSubMajor ? 1.2 : 0.7}
              stroke={isSubMajor ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.18)'}
              strokeLinecap="round"
            />
          ))}

          {/* Sub-dial numbers: 30, 5, 10, 15, 20, 25 */}
          {SUB_DIAL_NUMBERS_STATIC.map(({ num, x, y }) => (
            <text
              key={`subnum-${num}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(248, 250, 252, 0.75)"
              fontSize="6.8"
              fontFamily="monospace"
              fontWeight="bold"
              className="select-none"
            >
              {num}
            </text>
          ))}

          {/* Sub-dial Minute Needle (Rotates Clockwise) */}
          <g transform={`rotate(${minutesAngle}, ${subCx}, ${subCy})`}>
            {/* Tapered minute hand blade */}
            <polygon
              points={`
                ${subCx - 1.1},${subCy + 2}
                ${subCx + 1.1},${subCy + 2}
                ${subCx + 0.6},${subCy - 17}
                ${subCx},${subCy - 20}
                ${subCx - 0.6},${subCy - 17}
              `}
              fill="#F8FAFC"
            />
            {/* Sub-dial pivot hub */}
            <circle
              cx={subCx}
              cy={subCy}
              r="2.4"
              fill="#6366F1"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
          </g>
        </g>

        {/* ── 4. MAIN SECOND HAND & CENTER PIVOT (ROTATES CLOCKWISE 0 TO 360°) ── */}
        <g
          id="analog-second-hand"
          transform={`rotate(${secondsAngle}, ${cx}, ${cy})`}
        >
          {/* Luminous Neon Aura Beam (PC only, matches electric glow from reference design) */}
          <line
            x1={cx}
            y1={cy - 6}
            x2={cx}
            y2={cy - 132}
            stroke="#6366F1"
            strokeWidth="6"
            strokeLinecap="round"
            className="hidden md:block opacity-75"
            filter="url(#pcNeedleGlow)"
          />

          {/* Primary Tapered Second Hand Blade (Solid Color - 100% Guaranteed Visible in All Browsers) */}
          <polygon
            points={`
              ${cx - 1.8},${cy - 6}
              ${cx + 1.8},${cy - 6}
              ${cx + 1.0},${cy - 128}
              ${cx},${cy - 134}
              ${cx - 1.0},${cy - 128}
            `}
            fill="#818CF8"
            className="md:drop-shadow-[0_0_8px_rgba(99,102,241,0.9)]"
          />

          {/* Specular White Centerline Reflection */}
          <line
            x1={cx}
            y1={cy - 7}
            x2={cx}
            y2={cy - 131}
            stroke="#FFFFFF"
            strokeWidth="1.1"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Center Hub Outer White Donut Ring (Faithfully matching reference design) */}
          <circle
            cx={cx}
            cy={cy}
            r="7.5"
            fill="#0B0D13"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            className="md:drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
          />

          {/* Center Hub Core Accent Dot */}
          <circle
            cx={cx}
            cy={cy}
            r="2.8"
            fill="#818CF8"
          />
        </g>
      </svg>
    </div>
  );
});
