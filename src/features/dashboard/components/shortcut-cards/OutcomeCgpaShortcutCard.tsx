/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../../outcome/context/OutcomeContext';
import { mapCgpaToGrade, calculateSubjectWiseEstimate } from '../../../outcome/utils/outcomeHelpers';
import { EvaluationOption } from '../../../outcome/types';
import { getProgramColor } from '../ProgramCompletionSection';
import { AppRoute } from '../../../../types/navigation';

interface OutcomeCgpaShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

export const OutcomeCgpaShortcutCard: React.FC<OutcomeCgpaShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { programs, subjects } = useAcademicHierarchy();
  const { results, programTargets, programAverages, getProgramTarget } = useOutcome();

  const programRows = useMemo(() => {
    // Sort programs: prioritized by having targets or results, then by order
    const sorted = [...programs].sort((a, b) => {
      const aHas = Boolean(
        (programTargets && (programTargets[a.id] || programTargets[a.name])) ||
        results.some((r) => r.resultType === 'Program CGPA' && (r.programId === a.id || r.programName.toLowerCase() === a.name.toLowerCase()))
      );
      const bHas = Boolean(
        (programTargets && (programTargets[b.id] || programTargets[b.name])) ||
        results.some((r) => r.resultType === 'Program CGPA' && (r.programId === b.id || r.programName.toLowerCase() === b.name.toLowerCase()))
      );
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.order - b.order;
    });

    return sorted.map((prog, idx) => {
      const color = getProgramColor(prog.name, idx);

      // 1. Find matching logged results for this program
      const progResults = results
        .filter(
          (r) =>
            r.resultType === 'Program CGPA' &&
            (r.programId === prog.id || r.programName.toLowerCase() === prog.name.toLowerCase())
        )
        .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      const latestResult = progResults.length > 0 ? progResults[0] : null;

      // 2. Determine Evaluation Option (CGPA-based vs Grade-based)
      const targetConfig = programTargets ? (programTargets[prog.id] || programTargets[prog.name]) : undefined;
      const evaluationOption: EvaluationOption =
        targetConfig?.evaluationOption ||
        latestResult?.evaluationOption ||
        'CGPA-based';

      // 3. Resolve Target exactly matching Logged Results Card logic
      const targetObj = getProgramTarget(prog.id, evaluationOption);
      const isNeutralTarget = Boolean(
        targetObj.isNone ||
        !targetObj.targetCgpa ||
        targetObj.targetCgpa <= 0 ||
        targetObj.targetGrade?.toLowerCase() === 'none'
      );
      const hasTarget = !isNeutralTarget;

      let targetPrimary = '—';
      let targetSecondary = '';

      if (hasTarget) {
        const tCgpa = targetObj.targetCgpa;
        const tGrade = targetObj.targetGrade || mapCgpaToGrade(tCgpa, evaluationOption);

        if (evaluationOption === 'Grade-based') {
          // Grade-based programs show Grade as primary, CGPA as secondary
          targetPrimary = tGrade;
          targetSecondary = tCgpa > 0 ? `CGPA: ${tCgpa.toFixed(2)}` : '';
        } else {
          // CGPA-based programs show CGPA as primary, Grade as secondary
          targetPrimary = tCgpa.toFixed(2);
          targetSecondary = tGrade && tGrade !== '—' && tGrade !== 'None' ? `Grade: ${tGrade}` : '';
        }
      } else {
        targetPrimary = 'NONE';
        targetSecondary = '';
      }

      // 4. Resolve Actual / Result exactly matching Logged Results Card logic
      let actualPrimary = '—';
      let actualSecondary = '';
      let hasActual = false;
      let displayActualCgpa: number | undefined;
      let displayActualGrade: string | undefined;

      if (latestResult) {
        const progSubjects = (subjects || []).filter((s) => s.programId === latestResult.programId);
        const totalProgramSubjects = progSubjects.length > 0 ? progSubjects.length : (latestResult.subjectGrades?.length || 1);

        const estimatedInfo = latestResult.isEstimated
          ? calculateSubjectWiseEstimate(latestResult.subjectGrades || [], latestResult.evaluationOption, totalProgramSubjects)
          : null;

        displayActualCgpa = latestResult.isEstimated && estimatedInfo && estimatedInfo.hasAnyAttempted
          ? estimatedInfo.estimatedCgpa
          : latestResult.actualCgpa;

        const letterGrade = mapCgpaToGrade(displayActualCgpa, latestResult.evaluationOption);

        displayActualGrade = latestResult.isEstimated && estimatedInfo && estimatedInfo.hasAnyAttempted
          ? estimatedInfo.estimatedGrade
          : (latestResult.actualGrade && latestResult.actualGrade !== '—' ? latestResult.actualGrade : letterGrade);

        const hasAnyAttempted = latestResult.isEstimated
          ? Boolean(estimatedInfo?.hasAnyAttempted)
          : Boolean(displayActualCgpa !== undefined && displayActualCgpa > 0);

        if (hasAnyAttempted) {
          hasActual = true;
          if (evaluationOption === 'Grade-based') {
            actualPrimary = displayActualGrade || '—';
            actualSecondary = displayActualCgpa !== undefined ? `CGPA: ${displayActualCgpa.toFixed(2)}` : '';
          } else {
            actualPrimary = displayActualCgpa !== undefined ? displayActualCgpa.toFixed(2) : '—';
            actualSecondary = displayActualGrade && displayActualGrade !== '—' ? `Grade: ${displayActualGrade}` : '';
          }
        } else {
          // No subjects attempted yet
          hasActual = false;
          actualPrimary = '—';
          actualSecondary = 'Pending';
        }
      } else {
        // Fallback to programAverages if available
        const avgObj = programAverages.find((pa) => pa.programId === prog.id);
        if (avgObj && avgObj.avgCgpa > 0) {
          hasActual = true;
          displayActualCgpa = avgObj.avgCgpa;
          displayActualGrade = mapCgpaToGrade(avgObj.avgCgpa, evaluationOption);
          if (evaluationOption === 'Grade-based') {
            actualPrimary = displayActualGrade;
            actualSecondary = `CGPA: ${avgObj.avgCgpa.toFixed(2)}`;
          } else {
            actualPrimary = avgObj.avgCgpa.toFixed(2);
            actualSecondary = `Grade: ${displayActualGrade}`;
          }
        } else {
          hasActual = false;
          actualPrimary = '—';
          actualSecondary = '';
        }
      }

      // 5. Determine Met / Not Met status
      let status: 'MET' | 'NOT MET' | 'IN PROGRESS' = 'IN PROGRESS';
      if (hasTarget && hasActual && displayActualCgpa !== undefined && targetObj.targetCgpa !== undefined) {
        if (typeof latestResult?.isMet === 'boolean') {
          status = latestResult.isMet ? 'MET' : 'NOT MET';
        } else {
          status = displayActualCgpa >= targetObj.targetCgpa ? 'MET' : 'NOT MET';
        }
      } else {
        status = 'IN PROGRESS';
      }

      return {
        id: prog.id,
        name: prog.name,
        color,
        status,
        evaluationOption,
        targetPrimary,
        targetSecondary,
        actualPrimary,
        actualSecondary,
        hasActual,
      };
    });
  }, [programs, subjects, results, programTargets, programAverages, getProgramTarget]);

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/outcome/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/outcome/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Top header status badge
  const evaluatedPrograms = programRows.filter((r) => r.status === 'MET' || r.status === 'NOT MET');
  const allMet = evaluatedPrograms.length > 0 && evaluatedPrograms.every((r) => r.status === 'MET');
  const overallBadgeText = allMet ? 'ALL TARGETS MET' : 'IN PROGRESS';
  const overallBadgeStyle = allMet
    ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    : 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30';

  return (
    <div
      className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden"
    >
      {/* ── TOP HEADER ROW (Only navigation icon navigates) ── */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/[0.06] mb-1 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <Award className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              OUTCOME &amp; CGPA
            </h3>
            <p className="text-[8px] sm:text-[8.5px] font-bold text-[#64748B] tracking-widest uppercase truncate">
              [ NAME · TARGET · ACTUAL ]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full border text-[8px] sm:text-[8.5px] font-bold tracking-tight ${overallBadgeStyle}`}>
            {overallBadgeText}
          </span>
          <button
            type="button"
            onClick={handleNavigation}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            title="Open Outcome"
            aria-label="Open Outcome"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── PROGRAMS LIST (Fits 3 rows cleanly; scrolls if more exist) ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-between space-y-1 sm:space-y-1.5 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
        {programRows.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-center text-xs font-bold text-white/40 uppercase tracking-wider">
            NO ENROLLED PROGRAMS
          </div>
        ) : (
          programRows.slice(0, 3).map((row) => {
            const actualColor =
              row.status === 'MET'
                ? 'text-[#34D399]'
                : row.status === 'NOT MET'
                ? 'text-[#FDA4AF]'
                : 'text-[#94A3B8]';

            return (
              <div
                key={row.id}
                className="px-2 py-1 sm:py-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2 transition-all duration-200 md:hover:bg-white/[0.04] md:hover:border-white/[0.1]"
              >
                {/* Left: Indicator, Program Name, Eval badge, Met status */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: row.color, color: row.color }}
                  />
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-tight truncate max-w-[70px] sm:max-w-[95px]">
                      {row.name}
                    </span>

                    {/* Evaluation Option Tag: CGPA vs GRADE */}
                    <span
                      className={`text-[7px] sm:text-[7.5px] font-bold px-1 py-0.2 rounded border uppercase shrink-0 ${
                        row.evaluationOption === 'Grade-based'
                          ? 'bg-[#A855F7]/15 text-[#C084FC] border-[#A855F7]/30'
                          : 'bg-[#0284C7]/15 text-[#38BDF8] border-[#0284C7]/30'
                      }`}
                      title={row.evaluationOption === 'Grade-based' ? 'Grade-based evaluation' : 'CGPA-based evaluation'}
                    >
                      {row.evaluationOption === 'Grade-based' ? 'GRADE' : 'CGPA'}
                    </span>

                    {/* Met Status Badge */}
                    <span
                      className={`text-[7px] sm:text-[7.5px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        row.status === 'MET'
                          ? 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/30'
                          : row.status === 'NOT MET'
                          ? 'bg-[#F43F5E]/20 text-[#FDA4AF] border-[#F43F5E]/30'
                          : 'bg-white/[0.05] text-[#94A3B8] border-white/10'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>

                {/* Right: Telemetry Display Boxes for Target & Actual */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Target Box */}
                  <div
                    className="rounded-xl bg-[#0F1420]/80 border border-white/[0.06] px-2 py-0.5 sm:py-1 text-center min-w-[58px] sm:min-w-[66px] transition-colors hover:border-white/[0.12]"
                    title={`Target: ${row.targetPrimary} ${row.targetSecondary}`}
                  >
                    <div className="text-[6.5px] sm:text-[7px] font-bold text-[#F59E0B] uppercase tracking-wider">
                      TARGET
                    </div>
                    <div className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-tight leading-tight">
                      {row.targetPrimary}
                    </div>
                    {row.targetSecondary && (
                      <div className="text-[6.5px] sm:text-[7px] font-bold text-[#94A3B8] leading-tight truncate">
                        {row.targetSecondary}
                      </div>
                    )}
                  </div>

                  {/* Actual Box */}
                  <div
                    className="rounded-xl bg-[#0F1420]/80 border border-white/[0.06] px-2 py-0.5 sm:py-1 text-center min-w-[58px] sm:min-w-[66px] transition-colors hover:border-white/[0.12]"
                    title={`Actual: ${row.actualPrimary} ${row.actualSecondary}`}
                  >
                    <div className="text-[6.5px] sm:text-[7px] font-bold text-[#38BDF8] uppercase tracking-wider">
                      ACTUAL
                    </div>
                    <div className={`text-xs sm:text-[13px] font-black tracking-tight leading-tight ${actualColor}`}>
                      {row.actualPrimary}
                    </div>
                    {row.actualSecondary && (
                      <div className="text-[6.5px] sm:text-[7px] font-bold text-[#94A3B8] leading-tight truncate">
                        {row.actualSecondary}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

});

OutcomeCgpaShortcutCard.displayName = 'OutcomeCgpaShortcutCard';

