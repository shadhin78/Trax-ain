/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFocusTimer } from '../context/FocusTimerContext';
import { TimerPreset } from '../types';
import { CustomTimerModal } from './modals/CustomTimerModal';
import { ResetConfirmationModal } from './modals/ResetConfirmationModal';

export const TimerControls: React.FC = () => {
  const {
    status,
    preset,
    mode,
    alarmRangeStart,
    displayHours,
    displayMinutes,
    displaySeconds,
    startTimer,
    pauseTimer,
    resetTimer,
    saveCurrentSession,
    setPreset,
    setAlarmRange,
  } = useFocusTimer();

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const isRunning = status === 'RUNNING';

  const presets: { id: TimerPreset; label: string }[] = [
    { id: 'FREE', label: 'FREE' },
    { id: '15', label: '15 MIN' },
    { id: '25', label: '25 MIN' },
    { id: '45', label: '45 MIN' },
    { id: '60', label: '60 MIN' },
    { id: 'CUSTOM', label: 'CUSTOM' },
  ];

  const alarmQuickOffsets = [
    { label: '+15 MIN', minutes: 15 },
    { label: '+30 MIN', minutes: 30 },
    { label: '+45 MIN', minutes: 45 },
    { label: '+60 MIN', minutes: 60 },
    { label: '+90 MIN', minutes: 90 },
    { label: '+2 HR', minutes: 120 },
  ];

  const handlePresetClick = (targetPreset: TimerPreset) => {
    if (isRunning) return;
    if (targetPreset === 'CUSTOM') {
      setIsCustomOpen(true);
    } else {
      setPreset(targetPreset);
    }
  };

  const handleAlarmOffsetClick = (offsetMinutes: number) => {
    if (isRunning) return;
    const now = new Date();
    const finishDate = new Date(now.getTime() + offsetMinutes * 60000);
    const startStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const finishStr = `${String(finishDate.getHours()).padStart(2, '0')}:${String(finishDate.getMinutes()).padStart(2, '0')}`;
    setAlarmRange(startStr, finishStr);
  };

  const handleCustomConfirm = (seconds: number) => {
    setPreset('CUSTOM', seconds);
  };

  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
    await resetTimer();
  };

  return (
    <div className="w-full flex flex-col items-center mt-3 select-none font-mono">
      {/* ── 1. DIGITAL TIME DISPLAY (00:00:XX with Neon Accent Seconds) ── */}
      <div className="flex items-baseline justify-center font-mono font-black tracking-tight text-4xl sm:text-5xl lg:text-6xl text-[#F8FAFC]">
        <span>{displayHours}:{displayMinutes}:</span>
        <span className="text-[#818CF8] md:drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          {displaySeconds}
        </span>
      </div>

      {/* ── 2. STATUS LABEL (READY / RUNNING / PAUSED / COMPLETED) ── */}
      <div className="mt-1 text-center">
        <span
          className={`
            font-mono text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors duration-300
            ${
              status === 'RUNNING'
                ? 'text-[#818CF8] md:animate-pulse'
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

      {/* ── 3. PRESET DURATION PILLS / ALARM RANGE QUICK OFFSETS ── */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 max-w-full px-2">
        {mode === 'ALARM_RANGE'
          ? alarmQuickOffsets.map(({ label, minutes }) => (
              <button
                key={label}
                type="button"
                disabled={isRunning}
                onClick={() => handleAlarmOffsetClick(minutes)}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-mono font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent text-[#94A3B8] border border-white/[0.08] hover:text-[#F8FAFC] hover:border-[#6366F1]/50 md:hover:bg-white/[0.04]"
                title={`Set finish time to current time + ${minutes} min`}
              >
                {label}
              </button>
            ))
          : presets.map(({ id, label }) => {
              const isSelected = preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => handlePresetClick(id)}
                  className={`
                    px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-mono font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                    ${
                      isSelected
                        ? 'bg-[#6366F1] text-white shadow-[0_0_16px_rgba(99,102,241,0.45)] border border-[#818CF8]'
                        : 'bg-transparent text-[#94A3B8] border border-white/[0.08] hover:text-[#F8FAFC] hover:border-white/20 md:hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
      </div>

      {/* ── 4. PRIMARY CONTROLS ROW: RESET | START/PAUSE | SAVE ── */}
      <div className="mt-6 sm:mt-7 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-sm px-2">
        {/* RESET BUTTON */}
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="flex-1 h-11 sm:h-12 rounded-2xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white font-mono text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer md:hover:scale-[1.02] active:scale-95 flex items-center justify-center"
        >
          RESET
        </button>

        {/* START / PAUSE BUTTON */}
        <button
          type="button"
          onClick={isRunning ? pauseTimer : startTimer}
          className={`
            flex-1 h-11 sm:h-12 rounded-2xl font-mono text-xs sm:text-sm font-black tracking-wider transition-all duration-200 cursor-pointer md:hover:scale-[1.02] active:scale-95 flex items-center justify-center
            ${
              isRunning
                ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-[#FBBF24]'
                : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[0_0_24px_rgba(99,102,241,0.45)] border border-[#818CF8]'
            }
          `}
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>

        {/* SAVE BUTTON */}
        <button
          type="button"
          onClick={saveCurrentSession}
          className="flex-1 h-11 sm:h-12 rounded-2xl border border-[#10B981]/30 bg-[#064E3B]/80 hover:bg-[#065F46] text-[#34D399] hover:text-[#6EE7B7] font-mono text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer md:hover:scale-[1.02] active:scale-95 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.15)]"
        >
          SAVE
        </button>
      </div>

      {/* Custom Duration Dialog */}
      {isCustomOpen && (
        <CustomTimerModal
          isOpen={isCustomOpen}
          onClose={() => setIsCustomOpen(false)}
          onConfirm={handleCustomConfirm}
        />
      )}

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <ResetConfirmationModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={handleConfirmReset}
          mode={mode}
          timeDisplay={`${displayHours}:${displayMinutes}:${displaySeconds}`}
          status={status}
        />
      )}
    </div>
  );
};
