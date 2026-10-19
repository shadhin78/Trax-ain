/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Maximize2, Minimize2, ChevronDown, Clock, Play, Pause } from 'lucide-react';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { FocusSwitch } from './FocusSwitch';
import { AnalogClockDial } from './AnalogClockDial';
import { TimerControls } from './TimerControls';
import { SubjectSelectOptions } from './SubjectSelectOptions';

export const MainTimerDeck: React.FC = () => {
  const {
    mode,
    status,
    selectedSubject,
    targetDuration,
    alarmRangeStart,
    alarmRangeEnd,
    dialSecondsAngle,
    dialMinutesAngle,
    progressPercent,
    displayRemainingMs,
    displayElapsedMs,
    displayHours,
    displayMinutes,
    displaySeconds,
    startTimer,
    pauseTimer,
    setMode,
    setSelectedSubject,
    setAlarmRange,
  } = useFocusTimer();

  const { programs, subjects } = useAcademicHierarchy();
  const deckRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (deckRef.current?.requestFullscreen) {
          await deckRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fallback if browser security blocks programmatic fullscreen
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div
      ref={deckRef}
      className={`
        w-full rounded-[28px] border border-white/[0.08] bg-transparent p-5 sm:p-7 lg:p-8 relative overflow-hidden font-mono select-none transition-all duration-300
        ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none bg-[#0B0D13]/98 backdrop-blur-3xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto min-h-screen'
            : ''
        }
      `}
    >
      {isFullscreen ? (
        /* ── IMMERSIVE FULLSCREEN VIEW ── */
        <div className="flex-1 flex flex-col justify-between w-full h-full min-h-[90vh]">
          {/* Top Bar: Mode / Subject on left, Pause/Resume & Exit buttons on right */}
          <div className="flex items-center justify-between w-full pb-4 border-b border-white/[0.06]">
            {/* Left Tag */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl text-xs font-bold tracking-wider bg-white/[0.06] text-[#A5B4FC] border border-white/[0.08]">
                {mode === 'ALARM_RANGE' ? 'ALARM RANGE' : mode}
              </span>
              <span className="text-xs font-bold text-[#F8FAFC]/80 hidden sm:inline">
                {selectedSubject}
              </span>
            </div>

            {/* Top Right Controls: [PAUSE / RESUME] and [EXIT FULLSCREEN] */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Button 1: Pause / Resume */}
              <button
                type="button"
                onClick={status === 'RUNNING' ? pauseTimer : startTimer}
                className={`
                  inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl font-mono text-xs font-black tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_16px_rgba(0,0,0,0.4)] md:hover:scale-[1.02] active:scale-95
                  ${
                    status === 'RUNNING'
                      ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black border border-[#FBBF24] shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white border border-[#818CF8] shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                  }
                `}
                title={status === 'RUNNING' ? 'Pause Chronometer' : 'Resume Chronometer'}
              >
                {status === 'RUNNING' ? (
                  <>
                    <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                    <span>RESUME</span>
                  </>
                )}
              </button>

              {/* Button 2: Exit Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[0.12] bg-[#131722] hover:bg-[#1F2637] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.2)] active:scale-95"
                title="Exit Fullscreen"
                aria-label="Exit Fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Middle Center: Analog Clock and Digital Clock */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto py-6 sm:py-10">
            {/* Analog Clock Dial */}
            <div className="w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px] aspect-square flex items-center justify-center">
              <AnalogClockDial
                secondsAngle={dialSecondsAngle}
                minutesAngle={dialMinutesAngle}
                status={status}
                mode={mode}
                progressPercent={progressPercent}
                displayRemainingMs={displayRemainingMs}
                displayElapsedMs={displayElapsedMs}
              />
            </div>

            {/* Digital Clock Display */}
            <div className="flex items-baseline justify-center font-mono font-black tracking-tight text-5xl sm:text-6xl lg:text-7xl text-[#F8FAFC] mt-4 sm:mt-6">
              <span>{displayHours}:{displayMinutes}:</span>
              <span className="text-[#818CF8] drop-shadow-[0_0_16px_rgba(99,102,241,0.6)]">
                {displaySeconds}
              </span>
            </div>

            {/* Status Indicator */}
            <div className="mt-1 sm:mt-2 text-center">
              <span
                className={`
                  font-mono text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors duration-300
                  ${
                    status === 'RUNNING'
                      ? 'text-[#818CF8] animate-pulse'
                      : status === 'PAUSED'
                      ? 'text-[#F59E0B]'
                      : status === 'COMPLETED'
                      ? 'text-[#10B981]'
                      : 'text-[#94A3B8]'
                  }
                `}
              >
                {status === 'IDLE' ? 'READY' : status}
              </span>
            </div>
          </div>

          {/* Bottom Branding / Info */}
          <div className="text-center py-2 text-[10px] text-[#64748B] tracking-widest uppercase">
            TraX PRECISION CHRONOMETER
          </div>
        </div>
      ) : (
        /* ── REGULAR DECK VIEW ── */
        <>
          {/* ── TOP HEADER ROW ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            {/* Left: Mode Switch [STOPWATCH] [TIMER] [ALARM RANGE] */}
            <div>
              <FocusSwitch
                currentMode={mode}
                onSelectMode={setMode}
                disabled={status === 'RUNNING'}
              />
            </div>

            {/* Right: Track Time Against + Fullscreen Expand */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#94A3B8] tracking-widest uppercase hidden sm:inline">
                  TRACK TIME AGAINST:
                </span>
                <div className="relative">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="appearance-none h-9 sm:h-10 pl-3.5 pr-8 rounded-xl border border-white/[0.12] bg-[#131722] font-mono text-xs font-bold text-[#F8FAFC] hover:border-white/25 focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none cursor-pointer transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                  >
                    <SubjectSelectOptions programs={programs} subjects={subjects} />
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>

              {/* Fullscreen Expand Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer active:scale-95"
                title="Enter Fullscreen"
                aria-label="Enter Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── CENTER AREA: ANALOG DIAL & COMPACT LEFT ALARM RANGE PANEL ── */}
          <div className="my-2 sm:my-4 relative flex flex-col md:flex-row items-center justify-center min-h-[340px] sm:min-h-[380px]">
            {/* Left Side Compact Alarm Range Section */}
            {mode === 'ALARM_RANGE' && (
              <div className="w-full md:w-auto md:absolute md:left-0 lg:left-2 xl:left-4 md:top-1/2 md:-translate-y-1/2 z-10 mb-4 md:mb-0 flex justify-center">
                <div className="w-full max-w-[280px] md:max-w-[190px] lg:max-w-[210px] p-3.5 sm:p-4 rounded-2xl border border-[#6366F1]/30 bg-black/40 backdrop-blur-md flex flex-col gap-3 font-mono shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-[10px] font-black text-[#A5B4FC] tracking-wider uppercase flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#818CF8]" />
                      ALARM RANGE
                    </span>
                    {status === 'RUNNING' ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#818CF8]/20 text-[#A5B4FC] animate-pulse">
                        LIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/[0.06] text-[#94A3B8]">
                        READY
                      </span>
                    )}
                  </div>

                  {/* START TIME */}
                  <div>
                    <label className="text-[9px] font-bold text-[#94A3B8] tracking-widest uppercase block mb-1">
                      START (NOW)
                    </label>
                    <input
                      type="time"
                      value={alarmRangeStart}
                      onChange={(e) => setAlarmRange(e.target.value, alarmRangeEnd)}
                      disabled={status === 'RUNNING'}
                      className="w-full px-2.5 py-1.5 bg-[#0B0D13] border border-white/10 rounded-xl text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] outline-none disabled:opacity-60 transition-colors"
                    />
                  </div>

                  {/* FINISH TIME */}
                  <div>
                    <label className="text-[9px] font-bold text-[#94A3B8] tracking-widest uppercase block mb-1">
                      FINISH
                    </label>
                    <input
                      type="time"
                      value={alarmRangeEnd}
                      onChange={(e) => setAlarmRange(alarmRangeStart, e.target.value)}
                      disabled={status === 'RUNNING'}
                      className="w-full px-2.5 py-1.5 bg-[#0B0D13] border border-[#6366F1]/50 rounded-xl text-[#F8FAFC] font-mono text-xs focus:border-[#6366F1] outline-none disabled:opacity-60 shadow-[0_0_8px_rgba(99,102,241,0.2)] transition-colors"
                    />
                  </div>

                  {/* SUMMARY FOOTER */}
                  <div className="pt-2 border-t border-white/[0.08]">
                    {status === 'RUNNING' ? (
                      <div>
                        <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                          <span>PROGRESS</span>
                          <span className="font-bold text-[#818CF8]">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#94A3B8] tracking-wider uppercase text-[9px]">TIMER SET</span>
                        <span className="font-bold text-[#F8FAFC]">
                          {Math.max(1, Math.round((targetDuration || 0) / 60))} MIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analog Clock Dial */}
            <AnalogClockDial
              secondsAngle={dialSecondsAngle}
              minutesAngle={dialMinutesAngle}
              status={status}
              mode={mode}
              progressPercent={progressPercent}
              displayRemainingMs={displayRemainingMs}
              displayElapsedMs={displayElapsedMs}
            />
          </div>

          {/* ── BOTTOM: DIGITAL DISPLAY, PRESETS & CONTROLS ── */}
          <TimerControls />
        </>
      )}
    </div>
  );
};
