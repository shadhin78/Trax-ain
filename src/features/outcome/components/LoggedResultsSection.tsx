/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowUpDown, Edit3, Trash2, BarChart2, CheckCircle2, AlertCircle, Award, XCircle } from 'lucide-react';
import { useOutcome } from '../context/OutcomeContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { ProgramResult } from '../types';
import { formatDisplayDate, mapCgpaToGrade, mapGradeToNumeric, calculateSubjectWiseEstimate, evaluatePassFail, isSubjectInputted } from '../utils/outcomeHelpers';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';

const ProgramAnalyticsModal = React.lazy(() =>
  import('./modals/ProgramAnalyticsModal').then((m) => ({
    default: m.ProgramAnalyticsModal,
  }))
);



function getSubjectScoreDisplay(sg: { actualScore: string; actualCgpa?: number; actualGrade?: string; isAttempted?: boolean }) {
  if (!isSubjectInputted(sg)) {
    return {
      primary: 'N/A',
      secondary: '',
    };
  }

  const rawScore = (sg.actualScore ?? '').trim();
  const rawNum = parseFloat(rawScore);
  const numericVal = !isNaN(rawNum)
    ? rawNum
    : (typeof sg.actualCgpa === 'number' && !isNaN(sg.actualCgpa) ? sg.actualCgpa : mapGradeToNumeric(rawScore));

  const gradeVal = sg.actualGrade && sg.actualGrade.trim() !== '' && sg.actualGrade !== '—'
    ? sg.actualGrade
    : (!isNaN(numericVal) ? mapCgpaToGrade(numericVal) : '');

  if (!isNaN(numericVal)) {
    return {
      primary: numericVal.toFixed(2),
      secondary: gradeVal || mapCgpaToGrade(numericVal),
    };
  }

  return {
    primary: rawScore,
    secondary: gradeVal,
  };
}

interface LoggedResultsSectionProps {
  onEditResult: (result: ProgramResult) => void;
}

const LoggedResultsSectionComponent: React.FC<LoggedResultsSectionProps> = ({ onEditResult }) => {
  const { sortedResults, totalLoggedCount, sortBy, setSortBy, deleteResult, selectedProgramFilter, setSelectedProgramFilter } = useOutcome();
  const { subjects } = useAcademicHierarchy();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Modal states for delete confirmation and subject-wise analytics popup
  const [resultToDelete, setResultToDelete] = useState<ProgramResult | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [analyticsResult, setAnalyticsResult] = useState<ProgramResult | null>(null);

  const handleConfirmDelete = async () => {
    if (!resultToDelete) return;
    try {
      setIsDeleting(true);
      await deleteResult(resultToDelete.id);
      setResultToDelete(null);
    } catch (err) {
      console.error('Failed to delete result:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSort = () => {
    if (sortBy === 'NEWEST') setSortBy('OLDEST');
    else if (sortBy === 'OLDEST') setSortBy('CGPA_HIGH');
    else if (sortBy === 'CGPA_HIGH') setSortBy('CGPA_LOW');
    else setSortBy('NEWEST');
  };

  const sortLabels = {
    NEWEST: 'DATE: NEWEST FIRST',
    OLDEST: 'DATE: OLDEST FIRST',
    CGPA_HIGH: 'CGPA: HIGHEST FIRST',
    CGPA_LOW: 'CGPA: LOWEST FIRST',
  };

  return (
    <div className="w-full space-y-4 font-mono select-none">
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        {/* Title + Count */}
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase">
            LOGGED RESULTS
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#131722] border border-white/[0.1] text-[#94A3B8]">
            {totalLoggedCount}
          </span>
        </div>

        {/* Sort Pill */}
        <button
          type="button"
          onClick={toggleSort}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#131722] border border-white/[0.08] hover:border-white/20 text-[#94A3B8] hover:text-[#F8FAFC] text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
        >
          <span>SORT: {sortLabels[sortBy]}</span>
          <ArrowUpDown className="h-3 w-3 text-[#F59E0B]" />
        </button>
      </div>

      {/* ── RESULTS GRID ── */}
      {sortedResults.length === 0 ? (
        <div className="py-12 rounded-[24px] border border-dashed border-white/[0.08] bg-[#0B0F19]/40 text-center">
          <p className="text-xs font-bold text-[#64748B] tracking-wider uppercase">
            NO LOGGED RESULTS YET
          </p>
          <p className="text-[11px] text-white/30 mt-1">
            Logged achievements and program CGPAs will appear here as cards.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {sortedResults.map((result) => {
            const isSelected = selectedCardId === result.id;
            const letterGrade = result.actualGrade || mapCgpaToGrade(result.actualCgpa);
            const isAchievement = result.resultType === 'Achievement';

            // ── ACHIEVEMENT CARD ──
            if (isAchievement) {
              return (
                <div
                  key={result.id}
                  onClick={() => setSelectedCardId(isSelected ? null : result.id)}
                  className={`
                    w-full rounded-[24px] border bg-[#0B0F19]/70 backdrop-blur-xl p-5 sm:p-6 cursor-pointer relative overflow-hidden group
                    ${
                      isSelected
                        ? 'border-[#8B5CF6] shadow-[0_0_24px_rgba(139,92,246,0.3)] ring-1 ring-[#8B5CF6]'
                        : 'border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
                    }
                    md:transition-all md:duration-200 md:hover:-translate-y-1
                  `}
                >
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] text-[9px] font-black tracking-widest uppercase">
                        <Award className="h-3 w-3" />
                        ACHIEVEMENT
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-bold">
                        {formatDisplayDate(result.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEditResult(result)}
                        className="p-1.5 rounded-lg bg-[#131722] hover:bg-white/[0.1] text-[#94A3B8] hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                        title="Edit Result"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultToDelete(result)}
                        className="p-1.5 rounded-lg bg-[#F43F5E]/15 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/30 transition-colors cursor-pointer"
                        title="Delete Result"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1">
                    <h4 className="text-base sm:text-lg font-black tracking-tight text-[#F8FAFC]">
                      {result.achievementTitle || result.programName}
                    </h4>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-[#131722]/80 border border-white/[0.05] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                        MILESTONE STATUS
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#A78BFA]">
                        {result.achievementValue || 'Completed'}
                      </span>
                    </div>

                    {result.achievementGrade && (
                      <div className="text-right">
                        <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                          HONOR / GRADE
                        </span>
                        <span className="text-sm sm:text-base font-black text-[#F59E0B]">
                          {result.achievementGrade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ── PROGRAM CGPA CARD ──
            const progSubjects = (subjects || []).filter((s: { programId?: string }) => s.programId === result.programId);
            const totalProgramSubjects = progSubjects.length > 0 ? progSubjects.length : (result.subjectGrades?.length || 1);

            const estimatedInfo = result.isEstimated
              ? calculateSubjectWiseEstimate(result.subjectGrades || [], result.evaluationOption, totalProgramSubjects)
              : null;

            const displayActualCgpa = result.isEstimated && estimatedInfo && estimatedInfo.hasAnyAttempted
              ? estimatedInfo.estimatedCgpa
              : result.actualCgpa;

            const displayActualGrade = result.isEstimated && estimatedInfo && estimatedInfo.hasAnyAttempted
              ? estimatedInfo.estimatedGrade
              : (result.actualGrade || letterGrade);

            const displayIsPassed = result.isEstimated && estimatedInfo && estimatedInfo.hasAnyAttempted
              ? evaluatePassFail(displayActualCgpa, result.evaluationOption)
              : result.isPassed;

            const isNeutralTarget = Boolean(
              result.targetIsNone ||
              !result.targetCgpa ||
              result.targetCgpa <= 0 ||
              result.targetGrade?.toLowerCase() === 'none'
            );
            const targetGradeStr = result.targetGrade || (result.targetCgpa ? mapCgpaToGrade(result.targetCgpa) : 'None');
            const targetDisplay = isNeutralTarget
              ? 'Target: None'
              : result.evaluationOption === 'Grade-based'
              ? `${targetGradeStr} (${result.targetCgpa.toFixed(2)})`
              : `${result.targetCgpa.toFixed(2)} (${targetGradeStr})`;

            return (
              <div
                key={result.id}
                onClick={() => setSelectedCardId(isSelected ? null : result.id)}
                className={`
                  w-full rounded-[24px] border bg-[#0B0F19]/70 backdrop-blur-xl p-5 sm:p-6 cursor-pointer relative overflow-hidden group
                  ${
                    isSelected
                      ? 'border-[#F59E0B] shadow-[0_0_24px_rgba(245,158,11,0.3)] ring-1 ring-[#F59E0B]'
                      : 'border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
                  }
                  md:transition-all md:duration-200 md:hover:-translate-y-1
                `}
              >
                {/* ── CARD TOP BAR: BADGES & 3 ACTIONS ── */}
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#2563EB]/20 border border-[#3B82F6]/40 text-[#60A5FA] text-[9px] font-black tracking-widest uppercase">
                      PROGRAM CARD
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-bold">
                      {formatDisplayDate(result.date)}
                    </span>
                  </div>

                  {/* 3 Action buttons: Analytics Popup, Edit, Delete with Confirm */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setAnalyticsResult(result)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        analyticsResult?.id === result.id
                          ? 'bg-[#06B6D4]/25 text-[#38BDF8] border-[#06B6D4]/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#131722] hover:bg-white/[0.1] text-[#94A3B8] hover:text-[#38BDF8] border border-white/[0.06]'
                      }`}
                      title="View Subject-wise Performance Analytics"
                    >
                      <BarChart2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditResult(result)}
                      className="p-1.5 rounded-lg bg-[#131722] hover:bg-white/[0.1] text-[#94A3B8] hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                      title="Edit Result"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultToDelete(result)}
                      className="p-1.5 rounded-lg bg-[#F43F5E]/15 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/30 transition-colors cursor-pointer"
                      title="Delete Result"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* ── MIDDLE ROW: TITLE & SUB-BADGES (LEFT) + PASS/FAIL MARK (RIGHT, BELOW ICONS) ── */}
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base sm:text-lg font-black tracking-tight text-[#F8FAFC]">
                      {result.programName}
                    </h4>

                    {/* Sub-badges: Evaluation option + Estimated/Manual + Met/Not Met */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24] text-[9px] font-bold uppercase tracking-wider md:transition-all md:duration-200 md:hover:scale-105">
                        {result.evaluationOption === 'Grade-based' ? 'GRADE-BASED' : 'CGPA-BASED'}
                      </span>

                      {result.isEstimated ? (
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[#94A3B8] text-[9px] font-bold uppercase tracking-wider md:transition-all md:duration-200 md:hover:scale-105">
                          ESTIMATED
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase tracking-wider md:transition-all md:duration-200 md:hover:scale-105"
                          title={result.isManualMatch !== false ? 'Manual matches subject estimate' : 'Manual differs from subject estimate'}
                        >
                          <span>MANUAL</span>
                          {result.isManualMatch !== false ? (
                            <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-[#F43F5E]" />
                          )}
                        </span>
                      )}

                      {/* Met / Not Met Badge (right of estimated/manual as marked) */}
                      {isNeutralTarget ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-white/[0.04] border-white/[0.08] text-[#64748B] md:transition-all md:duration-200 md:hover:scale-105">
                          NO TARGET
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border md:transition-all md:duration-200 md:hover:scale-105 ${
                            result.isMet
                              ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#34D399]'
                              : 'bg-[#F43F5E]/15 border-[#F43F5E]/40 text-[#FDA4AF]'
                          }`}
                        >
                          {result.isMet ? 'MET' : 'NOT MET'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PASS / FAIL MARK: Positioned directly below action icons */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`
                        inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase border
                        ${
                          displayIsPassed
                            ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#34D399] shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                            : 'bg-[#F43F5E]/15 border-[#F43F5E]/40 text-[#FDA4AF] shadow-[0_0_16px_rgba(244,63,94,0.2)]'
                        }
                        md:transition-all md:duration-200 md:hover:scale-105
                      `}
                    >
                      {displayIsPassed ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                          <span>PASS</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-[#F43F5E] shrink-0" />
                          <span>FAIL</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── TARGET VS ACTUAL SCORES ── */}
                <div className="mt-4 p-3.5 rounded-2xl bg-[#131722]/80 border border-white/[0.05] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                      TARGET
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#F8FAFC]">
                      {targetDisplay}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                      ACTUAL
                    </span>
                    <span className={`text-sm sm:text-base font-black ${displayIsPassed ? 'text-[#38BDF8]' : 'text-[#F43F5E]'}`}>
                      {result.evaluationOption === 'Grade-based'
                        ? `Grade: ${displayActualGrade}`
                        : `CGPA: ${displayActualCgpa.toFixed(2)}`}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-bold block">
                      {result.evaluationOption === 'Grade-based'
                        ? `CGPA: ${displayActualCgpa.toFixed(2)}`
                        : `Grades: ${displayActualGrade}`}
                    </span>
                  </div>
                </div>

                {/* ── SUBJECT GRADES (IF PRESENT) ── */}
                {result.subjectGrades && result.subjectGrades.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-black text-[#94A3B8] tracking-wider uppercase block">
                      SUBJECT GRADES
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {result.subjectGrades.map((sg) => {
                        const isInputted = isSubjectInputted(sg);
                        const scoreInfo = getSubjectScoreDisplay(sg);
                        return (
                          <div
                            key={sg.subjectId}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-black/20 border border-white/[0.03] md:transition-all md:hover:bg-white/[0.02]"
                          >
                            <div>
                              <span className="font-bold text-[#F8FAFC] block truncate max-w-[140px] sm:max-w-[200px]">
                                {sg.subjectName}
                              </span>
                              <span className="text-[9px] text-[#94A3B8]">
                                {isNeutralTarget ? 'Target: None' : (sg.targetScore && sg.targetScore !== '—' && sg.targetScore !== 'None' ? sg.targetScore : targetDisplay)}
                              </span>
                            </div>

                            {isInputted ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right font-mono">
                                  <span className={`font-bold block text-xs ${sg.isPassed ? 'text-[#34D399]' : 'text-[#F43F5E]'}`}>
                                    {scoreInfo.primary}
                                  </span>
                                  {scoreInfo.secondary && (
                                    <span className="text-[10px] text-[#94A3B8] font-bold block leading-tight">
                                      ({scoreInfo.secondary})
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono ${
                                    sg.isPassed 
                                      ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30' 
                                      : 'bg-[#F43F5E]/20 text-[#FDA4AF] border border-[#F43F5E]/30'
                                  }`}
                                >
                                  {sg.isPassed ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-white/[0.04] text-[#64748B] border border-white/[0.06]">
                                  N/A
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DELETE CONFIRMATION POPUP MODAL ── */}
      {resultToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(resultToDelete)}
          onClose={() => {
            if (!isDeleting) setResultToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          result={resultToDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* ── SUBJECT-WISE PERFORMANCE ANALYTICS POPUP MODAL ── */}
      {analyticsResult && (
        <React.Suspense fallback={null}>
          <ProgramAnalyticsModal
            isOpen={Boolean(analyticsResult)}
            onClose={() => setAnalyticsResult(null)}
            result={analyticsResult}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export const LoggedResultsSection = React.memo(LoggedResultsSectionComponent);
LoggedResultsSection.displayName = 'LoggedResultsSection';
