/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, Calendar, ChevronDown, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useOutcome } from '../../context/OutcomeContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { ProgramResult, SubjectGradeEntry, ResultType, EvaluationOption } from '../../types';
import { 
  mapGradeToNumeric, 
  mapCgpaToGrade, 
  calculateSubjectWiseEstimate, 
  compareManualAndEstimated, 
  evaluatePassFail, 
  evaluateGoalMet, 
  formatSubjectTargetDisplay,
  GRADE_TO_NUMERIC_MAP 
} from '../../utils/outcomeHelpers';

interface AddResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingResult?: ProgramResult | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
      }
    }
  } catch {}
  return dateStr;
}

function formatCompactDate(dateStr?: string): string {
  if (!dateStr || dateStr === '—' || dateStr === '-') return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
      }
    }
  } catch {}
  return dateStr;
}

function formatToTwoDecimals(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '';
  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;
  return num.toFixed(2);
}

export const AddResultModal: React.FC<AddResultModalProps> = ({
  isOpen,
  onClose,
  editingResult = null,
}) => {
  const { results, addResult, updateResult, setProgramTarget } = useOutcome();
  const { programs, subjects, tracks } = useAcademicHierarchy();

  // Set of program IDs that already have a logged Program CGPA result card (excluding current editing result)
  const lockedProgramIds = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.resultType === 'Program CGPA') {
        if (editingResult && r.id === editingResult.id) return;
        if (r.programId) set.add(r.programId);
        const matchingProg = programs.find((p) => p.name.toLowerCase() === r.programName?.toLowerCase());
        if (matchingProg) set.add(matchingProg.id);
      }
    });
    return set;
  }, [results, editingResult, programs]);

  // ── 1. FORM STATE ──
  const [resultType, setResultType] = useState<ResultType>(
    editingResult?.resultType || 'Program CGPA'
  );

  // Achievement fields
  const [achievementTitle, setAchievementTitle] = useState<string>(
    editingResult?.achievementTitle || ''
  );
  const [achievementValue, setAchievementValue] = useState<string>(
    editingResult?.achievementValue || ''
  );
  const [achievementGrade, setAchievementGrade] = useState<string>(
    editingResult?.achievementGrade || ''
  );

  // Program CGPA fields
  const [targetProgramId, setTargetProgramId] = useState<string>(
    editingResult?.programId || programs.find((p) => !lockedProgramIds.has(p.id))?.id || programs[0]?.id || ''
  );

  const isEditing = Boolean(editingResult);

  const isCurrentProgramLocked = useMemo(() => {
    if (isEditing) return false;
    if (resultType !== 'Program CGPA') return false;
    return lockedProgramIds.has(targetProgramId);
  }, [isEditing, resultType, targetProgramId, lockedProgramIds]);
  const [evaluationOption, setEvaluationOption] = useState<EvaluationOption>(
    editingResult?.evaluationOption || 'CGPA-based'
  );

  // Target inputs
  const [targetGradeInput, setTargetGradeInput] = useState<string>('NONE');
  const [targetCgpaInput, setTargetCgpaInput] = useState<string>('');
  const [isTargetCleared, setIsTargetCleared] = useState<boolean>(true);

  // Overall inputs
  const [overallGradeInput, setOverallGradeInput] = useState<string>(''); // empty by default
  const [overallCgpaInput, setOverallCgpaInput] = useState<string>(''); // empty by default
  const [isManualOverall, setIsManualOverall] = useState<boolean>(false);

  // Date
  const [date, setDate] = useState<string>(
    editingResult?.date || new Date().toISOString().split('T')[0]
  );
  const [isClosing, setIsClosing] = useState(false);

  // Subjects in selected program
  const subjectsInSelectedProgram = useMemo(() => {
    return subjects.filter((s) => s.programId === targetProgramId);
  }, [subjects, targetProgramId]);

  // Subject scores map: subjectId -> { target, actual, isPassed, date }
  const [subjectScores, setSubjectScores] = useState<Record<string, { 
    target: string; 
    actual: string; 
    isPassed: boolean; 
    date?: string;
  }>>({});

  // ── 2. INITIALIZE FORM STATE ──
  useEffect(() => {
    if (!isOpen) return;

    if (editingResult) {
      setResultType(editingResult.resultType || 'Program CGPA');
      setAchievementTitle(editingResult.achievementTitle || '');
      setAchievementValue(editingResult.achievementValue || '');
      setAchievementGrade(editingResult.achievementGrade || '');
      setTargetProgramId(editingResult.programId || programs[0]?.id || '');
      setEvaluationOption(editingResult.evaluationOption || 'CGPA-based');
      setDate(editingResult.date || new Date().toISOString().split('T')[0]);

      if (
        editingResult.targetIsNone ||
        !editingResult.targetCgpa ||
        editingResult.targetCgpa <= 0 ||
        editingResult.targetGrade?.toLowerCase() === 'none'
      ) {
        setIsTargetCleared(true);
        setTargetGradeInput('NONE');
        setTargetCgpaInput('');
      } else {
        setIsTargetCleared(false);
        const tGrade = editingResult.targetGrade || mapCgpaToGrade(editingResult.targetCgpa, editingResult.evaluationOption);
        setTargetGradeInput(tGrade || '');
        setTargetCgpaInput(editingResult.targetCgpa.toFixed(2));
      }

      if (!editingResult.isEstimated) {
        setIsManualOverall(true);
        setOverallGradeInput(editingResult.actualGrade || mapCgpaToGrade(editingResult.actualCgpa, editingResult.evaluationOption));
        setOverallCgpaInput(editingResult.actualCgpa ? editingResult.actualCgpa.toFixed(2) : '');
      } else {
        setIsManualOverall(false);
        setOverallCgpaInput('');
        setOverallGradeInput('');
      }

      if (editingResult.subjectGrades && editingResult.subjectGrades.length > 0) {
        const isTargetNeutral = Boolean(
          editingResult.targetIsNone ||
          !editingResult.targetCgpa ||
          editingResult.targetCgpa <= 0 ||
          editingResult.targetGrade?.toLowerCase() === 'none'
        );
        const map: Record<string, { target: string; actual: string; isPassed: boolean; date?: string }> = {};
        editingResult.subjectGrades.forEach((sg) => {
          map[sg.subjectId] = {
            target: isTargetNeutral ? 'Target: None' : sg.targetScore,
            actual: sg.actualScore === 'N/A' || sg.actualScore === '—' ? '' : sg.actualScore,
            isPassed: sg.isPassed,
            date: sg.date || editingResult.date || '',
          };
        });
        setSubjectScores(map);
      }
    } else {
      // New Result Initialization - no presets, starts empty matching screenshot expectations
      setResultType('Program CGPA');
      setAchievementTitle('');
      setAchievementValue('');
      setAchievementGrade('');

      const available = programs.find((p) => !lockedProgramIds.has(p.id));
      setTargetProgramId(available ? available.id : (programs[0]?.id || ''));
      setEvaluationOption('CGPA-based');
      setDate(new Date().toISOString().split('T')[0]);

      setIsTargetCleared(true);
      setTargetGradeInput('NONE');
      setTargetCgpaInput('');

      setIsManualOverall(false);
      setOverallCgpaInput('');
      setOverallGradeInput('');

      // All subject rows start empty without any presets
      const initialMap: Record<string, { target: string; actual: string; isPassed: boolean; date?: string }> = {};
      subjectsInSelectedProgram.forEach((s) => {
        initialMap[s.id] = {
          target: '—',
          actual: '',
          isPassed: true,
          date: '',
        };
      });
      setSubjectScores(initialMap);
    }
  }, [isOpen, editingResult, programs, lockedProgramIds]);

  // Resolved dynamic target string for subject rows
  const currentTargetDisplay = useMemo(() => {
    if (isTargetCleared) {
      return 'Target: None';
    }
    if (evaluationOption === 'Grade-based') {
      if (targetGradeInput && targetGradeInput !== 'NONE' && targetGradeInput.trim() !== '') {
        const num = GRADE_TO_NUMERIC_MAP[targetGradeInput] ?? 4.00;
        return formatSubjectTargetDisplay(
          { targetCgpa: num, targetGrade: targetGradeInput, isNone: false },
          'Grade-based'
        );
      }
      return 'Target: None';
    }
    // CGPA-based
    if (targetCgpaInput && targetCgpaInput.trim() !== '') {
      const num = parseFloat(targetCgpaInput);
      if (!isNaN(num) && num > 0) {
        const tGrade = mapCgpaToGrade(num, 'CGPA-based');
        return formatSubjectTargetDisplay(
          { targetCgpa: num, targetGrade: tGrade, isNone: false },
          'CGPA-based'
        );
      }
    }
    return 'Target: None';
  }, [isTargetCleared, evaluationOption, targetGradeInput, targetCgpaInput]);

  // Target score & grade badge display helpers for Box 2 (Target CGPA & Grade)
  const targetDisplayScore = useMemo(() => {
    if (isTargetCleared) return '—';
    if (evaluationOption === 'Grade-based') {
      return targetGradeInput && targetGradeInput !== 'NONE' && targetGradeInput.trim() !== ''
        ? targetGradeInput
        : '—';
    }
    if (targetCgpaInput && targetCgpaInput.trim() !== '') {
      const num = parseFloat(targetCgpaInput);
      if (!isNaN(num) && num > 0) return num.toFixed(2);
    }
    return '—';
  }, [isTargetCleared, evaluationOption, targetGradeInput, targetCgpaInput]);

  const targetDisplayBadge = useMemo(() => {
    if (isTargetCleared) return 'None';
    if (evaluationOption === 'Grade-based') {
      if (targetGradeInput && targetGradeInput !== 'NONE' && targetGradeInput.trim() !== '') {
        const num = GRADE_TO_NUMERIC_MAP[targetGradeInput] ?? 4.00;
        return num.toFixed(2);
      }
      return 'None';
    }
    if (targetCgpaInput && targetCgpaInput.trim() !== '') {
      const num = parseFloat(targetCgpaInput);
      if (!isNaN(num) && num > 0) return mapCgpaToGrade(num, 'CGPA-based');
    }
    return 'None';
  }, [isTargetCleared, evaluationOption, targetGradeInput, targetCgpaInput]);

  // Propagate updated target to all subject rows
  useEffect(() => {
    setSubjectScores((prev) => {
      const updated = { ...prev };
      let changed = false;
      subjectsInSelectedProgram.forEach((s) => {
        if (!updated[s.id] || updated[s.id].target !== currentTargetDisplay) {
          updated[s.id] = {
            target: currentTargetDisplay,
            actual: updated[s.id]?.actual ?? '',
            isPassed: updated[s.id]?.isPassed ?? true,
            date: updated[s.id]?.date ?? '',
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [currentTargetDisplay, subjectsInSelectedProgram]);

  // ── 3. ESTIMATE CALCULATION ──
  const estimateResult = useMemo(() => {
    const allProgramSubjectScores = subjectsInSelectedProgram.map((s) => ({
      actualScore: subjectScores[s.id]?.actual ?? '',
      isAttempted: Boolean(
        subjectScores[s.id]?.actual &&
        subjectScores[s.id].actual.trim() !== '' &&
        subjectScores[s.id].actual !== '—' &&
        subjectScores[s.id].actual.toUpperCase() !== 'N/A'
      ),
    }));
    return calculateSubjectWiseEstimate(
      allProgramSubjectScores,
      evaluationOption,
      subjectsInSelectedProgram.length
    );
  }, [subjectsInSelectedProgram, subjectScores, evaluationOption]);

  // Resolved overall score
  const resolvedOverallCgpa = useMemo(() => {
    if (evaluationOption === 'Grade-based') {
      if (overallGradeInput && overallGradeInput.trim() !== '') {
        const g = overallGradeInput.toUpperCase();
        return GRADE_TO_NUMERIC_MAP[g] ?? estimateResult.estimatedCgpa;
      }
      return estimateResult.estimatedCgpa;
    }
    if (isManualOverall && overallCgpaInput.trim() !== '') {
      const num = parseFloat(overallCgpaInput);
      return !isNaN(num) ? num : estimateResult.estimatedCgpa;
    }
    return estimateResult.estimatedCgpa;
  }, [evaluationOption, overallGradeInput, isManualOverall, overallCgpaInput, estimateResult.estimatedCgpa]);

  const resolvedOverallGrade = useMemo(() => {
    if (evaluationOption === 'Grade-based') {
      if (overallGradeInput && overallGradeInput.trim() !== '') {
        return overallGradeInput;
      }
      return estimateResult.hasAnyAttempted ? estimateResult.estimatedGrade : '—';
    }
    if (resolvedOverallCgpa > 0) {
      return mapCgpaToGrade(resolvedOverallCgpa, evaluationOption);
    }
    return '—';
  }, [evaluationOption, overallGradeInput, resolvedOverallCgpa, estimateResult.hasAnyAttempted, estimateResult.estimatedGrade]);

  // Manual vs Estimate match verification
  const verification = useMemo(() => {
    const isManualEntered = evaluationOption === 'Grade-based'
      ? overallGradeInput.trim() !== ''
      : isManualOverall && overallCgpaInput.trim() !== '';

    if (!isManualEntered) {
      return { isManual: false, isMatch: true, diff: 0 };
    }
    return compareManualAndEstimated(
      evaluationOption === 'Grade-based' ? overallGradeInput : overallCgpaInput,
      estimateResult.estimatedCgpa,
      evaluationOption
    );
  }, [isManualOverall, overallGradeInput, overallCgpaInput, estimateResult.estimatedCgpa, evaluationOption]);

  // Exit animation
  const initiateClose = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (isDesktop) {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        onClose();
      }, 200);
    } else {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') initiateClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen) return null;

  // Handlers for subject score & target changes
  const handleSubjectGradeSelect = (subjectId: string, grade: string) => {
    const current = subjectScores[subjectId] || { target: '—', actual: '', isPassed: true };
    const autoPass = evaluatePassFail(grade, 'Grade-based');
    const todayStr = new Date().toISOString().split('T')[0];
    setSubjectScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...current,
        actual: grade,
        isPassed: autoPass,
        date: grade ? todayStr : (current.date || ''),
      },
    }));
  };

  const handleSubjectCgpaChange = (subjectId: string, val: string) => {
    const current = subjectScores[subjectId] || { target: '—', actual: '', isPassed: true };
    const autoPass = evaluatePassFail(val, 'CGPA-based');
    const todayStr = new Date().toISOString().split('T')[0];
    setSubjectScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...current,
        actual: val,
        isPassed: autoPass,
        date: val.trim() !== '' ? todayStr : (current.date || ''),
      },
    }));
  };

  const handleSubjectDateChange = (subjectId: string, newDate: string) => {
    setSubjectScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { target: currentTargetDisplay, actual: '', isPassed: true }),
        date: newDate,
      },
    }));
  };

  const handleSubjectCgpaBlur = (subjectId: string) => {
    const current = subjectScores[subjectId];
    if (!current || !current.actual || current.actual.trim() === '') return;
    const formatted = formatToTwoDecimals(current.actual);
    if (formatted && formatted !== current.actual) {
      setSubjectScores((prev) => ({
        ...prev,
        [subjectId]: {
          ...(prev[subjectId] || current),
          actual: formatted,
        },
      }));
    }
  };

  const handleTargetGradeChange = (val: string) => {
    if (!val || val === 'NONE' || val.trim() === '') {
      setIsTargetCleared(true);
      setTargetGradeInput('NONE');
      setTargetCgpaInput('');
    } else {
      setIsTargetCleared(false);
      setTargetGradeInput(val);
      const num = GRADE_TO_NUMERIC_MAP[val] ?? 4.00;
      setTargetCgpaInput(num.toFixed(2));
    }
  };

  // ── 4. SUBMIT FORM ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resultType === 'Achievement') {
      const title = achievementTitle.trim() || 'Achievement';
      const val = achievementValue.trim() || 'Completed';
      const gr = achievementGrade.trim();

      if (editingResult) {
        await updateResult(editingResult.id, {
          resultType: 'Achievement',
          achievementTitle: title,
          achievementValue: val,
          achievementGrade: gr,
          isPassed: true,
          isMet: true,
          date,
        });
      } else {
        await addResult({
          resultType: 'Achievement',
          achievementTitle: title,
          achievementValue: val,
          achievementGrade: gr,
          programId: '',
          programName: title,
          evaluationOption: 'CGPA-based',
          targetCgpa: 4.0,
          actualCgpa: 4.0,
          isMet: true,
          isPassed: true,
          isEstimated: false,
          subjectGrades: [],
          date,
        });
      }
      initiateClose();
      return;
    }

    // Prevent duplicate program result cards
    if (resultType === 'Program CGPA' && isCurrentProgramLocked) {
      return;
    }

    const prog = programs.find((p) => p.id === targetProgramId) || programs[0];
    if (!prog) return;

    const track = tracks.find((t) => t.id === prog.trackId);
    const hasTargetInput = !isTargetCleared && (
      (evaluationOption === 'Grade-based' && targetGradeInput && targetGradeInput !== 'NONE' && targetGradeInput.trim() !== '') ||
      (evaluationOption === 'CGPA-based' && targetCgpaInput.trim() !== '' && !isNaN(parseFloat(targetCgpaInput)) && parseFloat(targetCgpaInput) > 0)
    );

    const tarCgpaNum = hasTargetInput
      ? (evaluationOption === 'Grade-based'
          ? (GRADE_TO_NUMERIC_MAP[targetGradeInput] ?? 0)
          : parseFloat(targetCgpaInput) || 0)
      : 0;

    const tarGradeVal = hasTargetInput
      ? (evaluationOption === 'Grade-based'
          ? targetGradeInput
          : mapCgpaToGrade(tarCgpaNum, evaluationOption))
      : 'None';

    const targetIsNoneVal = !hasTargetInput;
    const actCgpaNum = resolvedOverallCgpa;

    const gradesList: SubjectGradeEntry[] = subjectsInSelectedProgram.map((s) => {
      const sc = subjectScores[s.id] || { target: currentTargetDisplay, actual: '', isPassed: true };
      const num = mapGradeToNumeric(sc.actual, evaluationOption);
      const isAttempted = !isNaN(num) && sc.actual.trim() !== '' && sc.actual !== '—' && sc.actual.toUpperCase() !== 'N/A';
      const formattedActual = isAttempted && evaluationOption === 'CGPA-based' && sc.actual.trim() !== ''
        ? num.toFixed(2)
        : (isAttempted ? sc.actual : '');
      return {
        subjectId: s.id,
        subjectName: s.name,
        targetScore: sc.target || currentTargetDisplay,
        actualScore: formattedActual,
        actualCgpa: isNaN(num) ? 0 : num,
        actualGrade: isAttempted ? (evaluationOption === 'Grade-based' ? sc.actual : mapCgpaToGrade(num, evaluationOption)) : '',
        isPassed: isAttempted ? sc.isPassed : false,
        isAttempted,
        date: sc.date || date,
      };
    });

    const isPassed = evaluatePassFail(actCgpaNum, evaluationOption);
    const goalMetResult = evaluateGoalMet({
      allCurriculumSubjects: subjectsInSelectedProgram.map((s) => ({ id: s.id, name: s.name })),
      subjectGrades: gradesList,
      actualCgpa: actCgpaNum,
      targetCgpa: tarCgpaNum,
      actualGrade: resolvedOverallGrade,
      targetGrade: tarGradeVal,
      evalType: evaluationOption,
      targetIsNone: targetIsNoneVal,
    });

    if (hasTargetInput) {
      await setProgramTarget(prog.id, {
        targetCgpa: tarCgpaNum,
        targetGrade: tarGradeVal,
        isNone: false,
        evaluationOption,
      });
    } else {
      await setProgramTarget(prog.id, {
        targetCgpa: 0,
        targetGrade: 'None',
        isNone: true,
        evaluationOption,
      });
    }

    const resultPayload = {
      resultType: 'Program CGPA' as ResultType,
      programId: prog.id,
      programName: prog.name,
      trackId: track?.id,
      trackName: track?.name,
      evaluationOption,
      targetCgpa: tarCgpaNum,
      actualCgpa: actCgpaNum,
      targetGrade: tarGradeVal,
      actualGrade: resolvedOverallGrade,
      targetIsNone: targetIsNoneVal,
      isMet: goalMetResult.isMet,
      isPassed,
      isEstimated: evaluationOption === 'Grade-based' ? overallGradeInput.trim() === '' : (!isManualOverall || overallCgpaInput.trim() === ''),
      isManualMatch: verification.isMatch,
      estimatedCgpa: estimateResult.estimatedCgpa,
      estimatedGrade: estimateResult.estimatedGrade,
      subjectGrades: gradesList,
      date,
    };

    if (editingResult) {
      await updateResult(editingResult.id, resultPayload);
    } else {
      await addResult(resultPayload);
    }

    initiateClose();
  };

  return createPortal(
    <div 
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md select-none font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      role="dialog"
      aria-modal="true"
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-[28px] border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] relative max-h-[92vh] overflow-hidden flex flex-col font-mono
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Legacy Background Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none" aria-hidden="true">
          <div className="hidden md:block absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
          <div className="hidden md:block absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#3B82F6]/10 blur-3xl pointer-events-none" />
        </div>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wider uppercase font-mono">
                {editingResult ? 'Edit Result' : 'Add New Result'}
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5 hidden sm:block">
                {editingResult ? 'Modify logged outcome data and scores' : 'Log program outcome or achievement certificate'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-[#94A3B8] hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── FORM ── */}
        <form 
          onSubmit={handleSubmit} 
          className="mt-4 space-y-4 relative z-10 overflow-y-auto pr-1 flex-1 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]"
        >
          {/* ── TOP CONTROLS: RESULT TYPE, TARGET PROGRAM, EVALUATION OPTION ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 font-mono">
            {/* RESULT TYPE */}
            <div>
              <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 font-mono">
                RESULT TYPE
              </label>
              <div className="relative">
                <select
                  disabled={isEditing}
                  value={resultType}
                  onChange={(e) => {
                    if (isEditing) return;
                    setResultType(e.target.value as ResultType);
                  }}
                  className={`w-full h-10 pl-3.5 pr-8 rounded-xl border font-mono text-xs font-bold outline-none appearance-none transition-colors ${
                    isEditing
                      ? 'border-white/[0.08] bg-[#0E121B]/50 text-[#94A3B8] cursor-not-allowed select-none'
                      : 'border-white/[0.12] bg-[#0E121B]/80 text-white focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 cursor-pointer'
                  }`}
                >
                  <option value="Program CGPA" className="bg-[#0E121B] text-white">Program CGPA</option>
                  <option value="Achievement" className="bg-[#0E121B] text-white">Achievement</option>
                </select>
                {isEditing ? (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/80 pointer-events-none" />
                ) : (
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                )}
              </div>
            </div>

            {/* TARGET PROGRAM */}
            {resultType === 'Program CGPA' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider font-mono">
                    TARGET PROGRAM
                  </label>
                  {!isEditing && isCurrentProgramLocked && (
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                      Locked
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    disabled={isEditing}
                    value={targetProgramId}
                    onChange={(e) => {
                      if (isEditing) return;
                      setTargetProgramId(e.target.value);
                    }}
                    className={`w-full h-10 pl-3.5 pr-8 rounded-xl border font-mono text-xs font-bold outline-none appearance-none transition-colors ${
                      isEditing
                        ? 'border-white/[0.08] bg-[#0E121B]/50 text-[#94A3B8] cursor-not-allowed select-none'
                        : isCurrentProgramLocked
                        ? 'border-amber-500/50 bg-[#0E121B]/80 text-amber-200 focus:border-amber-500 cursor-pointer'
                        : 'border-white/[0.12] bg-[#0E121B]/80 text-white focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 cursor-pointer'
                    }`}
                  >
                    {programs.map((p) => {
                      const isLocked = !isEditing && lockedProgramIds.has(p.id);
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isLocked}
                          className={isLocked ? 'text-[#64748B] bg-[#0E121B]' : 'text-white bg-[#0E121B]'}
                        >
                          {p.name}{isLocked ? ' (Locked — Result Exists)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {isEditing ? (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/80 pointer-events-none" />
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                  )}
                </div>
              </div>
            )}

            {/* EVALUATION OPTION */}
            {resultType === 'Program CGPA' && (
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 font-mono">
                  EVALUATION OPTION
                </label>
                <div className="relative">
                  <select
                    disabled={isEditing}
                    value={evaluationOption}
                    onChange={(e) => {
                      if (isEditing) return;
                      const newOpt = e.target.value as EvaluationOption;
                      setEvaluationOption(newOpt);
                      if (newOpt === 'Grade-based') {
                        if (targetCgpaInput.trim() !== '') {
                          const num = parseFloat(targetCgpaInput);
                          if (!isNaN(num)) {
                            setTargetGradeInput(mapCgpaToGrade(num, 'Grade-based'));
                          }
                        }
                      } else {
                        if (targetGradeInput && targetGradeInput !== 'NONE' && targetGradeInput.trim() !== '') {
                          const num = GRADE_TO_NUMERIC_MAP[targetGradeInput];
                          if (num !== undefined) {
                            setTargetCgpaInput(num.toFixed(2));
                          }
                        }
                      }
                    }}
                    className={`w-full h-10 pl-3.5 pr-8 rounded-xl border font-mono text-xs font-bold outline-none appearance-none transition-colors ${
                      isEditing
                        ? 'border-white/[0.08] bg-[#0E121B]/50 text-[#94A3B8] cursor-not-allowed select-none'
                        : 'border-white/[0.12] bg-[#0E121B]/80 text-white focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 cursor-pointer'
                    }`}
                  >
                    <option value="CGPA-based" className="bg-[#0E121B] text-white">CGPA-based</option>
                    <option value="Grade-based" className="bg-[#0E121B] text-white">Grade-based [A, B, C...]</option>
                  </select>
                  {isEditing ? (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/80 pointer-events-none" />
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Locked Program Warning Banner */}
          {!isEditing && resultType === 'Program CGPA' && isCurrentProgramLocked && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-start gap-2.5">
              <span className="shrink-0 text-amber-400">⚠️</span>
              <p className="leading-relaxed">
                Only one result card can exist per program. Delete the existing result card first to add a new result for this program.
              </p>
            </div>
          )}

          {/* ── CONDITIONAL: ACHIEVEMENT TYPE ── */}
          {resultType === 'Achievement' && (
            <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-md space-y-3.5 font-mono">
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 font-mono">
                  ACHIEVEMENT TITLE
                </label>
                <input
                  type="text"
                  required
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  placeholder="e.g. Dean's List Award / Professional Certification"
                  className="w-full h-10 px-3.5 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 font-mono">
                    ACHIEVEMENT VALUE
                  </label>
                  <input
                    type="text"
                    value={achievementValue}
                    onChange={(e) => setAchievementValue(e.target.value)}
                    placeholder="e.g. Distinction / First Class"
                    className="w-full h-10 px-3.5 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-[#38BDF8] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 font-mono">
                    OPTIONAL LETTER GRADE
                  </label>
                  <input
                    type="text"
                    value={achievementGrade}
                    onChange={(e) => setAchievementGrade(e.target.value)}
                    placeholder="e.g. A+"
                    className="w-full h-10 px-3.5 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-[#F59E0B] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none text-center transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── CONDITIONAL: PROGRAM CGPA TYPE ── */}
          {resultType === 'Program CGPA' && (
            <>
              {/* ── OVERALL PROGRAM & SUBJECT-WISE ESTIMATED SCORE GLASS CONTAINER ── */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-md p-4 sm:p-5 space-y-4 font-mono">
                {/* OVERALL PROGRAM CGPA / GRADE ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-0">
                  <div className="sm:w-[32%] shrink-0 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                      {evaluationOption === 'Grade-based' ? 'Overall Program Grade' : 'Overall Program CGPA'}
                    </span>
                    {isManualOverall && overallCgpaInput.trim() !== '' && (
                      <span 
                        title={verification.isMatch ? 'Manual result matches subject estimate' : 'Manual result differs from subject estimate'}
                        className="inline-flex items-center shrink-0"
                      >
                        {verification.isMatch ? (
                          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-[#F43F5E]" />
                        )}
                      </span>
                    )}
                  </div>

                  {evaluationOption === 'Grade-based' ? (
                    <div className="flex items-center justify-between sm:contents gap-2 overflow-x-auto [scrollbar-width:none]">
                      {/* Column 2: Actual Overall Grade */}
                      <div className="sm:w-[25%] shrink-0 flex items-center gap-1.5">
                        <div className="relative">
                          <select
                            value={overallGradeInput}
                            onChange={(e) => {
                              setIsManualOverall(true);
                              setOverallGradeInput(e.target.value);
                            }}
                            className="w-16 sm:w-20 h-8.5 pl-2.5 pr-6 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white appearance-none outline-none cursor-pointer focus:border-[#F59E0B] transition-colors"
                          >
                            <option value="" className="bg-[#0E121B] text-white">GRADE</option>
                            <option value="A" className="bg-[#0E121B] text-white">A</option>
                            <option value="B" className="bg-[#0E121B] text-white">B</option>
                            <option value="C" className="bg-[#0E121B] text-white">C</option>
                            <option value="D" className="bg-[#0E121B] text-white">D</option>
                            <option value="E" className="bg-[#0E121B] text-white">E</option>
                            <option value="F" className="bg-[#0E121B] text-white">F</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                        </div>
                        <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#06B6D4]/40 bg-[#06B6D4]/10 font-mono text-xs font-bold text-[#06B6D4]">
                          {overallGradeInput && GRADE_TO_NUMERIC_MAP[overallGradeInput] !== undefined
                            ? (GRADE_TO_NUMERIC_MAP[overallGradeInput]).toFixed(2)
                            : '—'}
                        </span>
                      </div>

                      {/* Column 3: Target Grade */}
                      <div className="sm:w-[23%] shrink-0 flex items-center gap-1.5">
                        <div className="relative">
                          <select
                            value={isTargetCleared ? 'NONE' : targetGradeInput}
                            onChange={(e) => handleTargetGradeChange(e.target.value)}
                            className="w-16 sm:w-20 h-8.5 pl-2.5 pr-6 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white appearance-none outline-none cursor-pointer focus:border-[#F59E0B] transition-colors"
                          >
                            <option value="" className="bg-[#0E121B] text-white">TARGET</option>
                            <option value="NONE" className="bg-[#0E121B] text-white">NONE</option>
                            <option value="A" className="bg-[#0E121B] text-white">A</option>
                            <option value="B" className="bg-[#0E121B] text-white">B</option>
                            <option value="C" className="bg-[#0E121B] text-white">C</option>
                            <option value="D" className="bg-[#0E121B] text-white">D</option>
                            <option value="E" className="bg-[#0E121B] text-white">E</option>
                            <option value="F" className="bg-[#0E121B] text-white">F</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                        </div>
                        <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 font-mono text-xs font-bold text-[#3B82F6]">
                          {isTargetCleared
                            ? 'None'
                            : targetGradeInput && GRADE_TO_NUMERIC_MAP[targetGradeInput] !== undefined
                            ? (GRADE_TO_NUMERIC_MAP[targetGradeInput]).toFixed(2)
                            : '—'}
                        </span>
                      </div>

                      {/* Column 4: Spacer matching Date column */}
                      <div className="hidden sm:block sm:w-[20%] shrink-0" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between sm:contents gap-2 overflow-x-auto [scrollbar-width:none]">
                      {/* Column 2: Actual Overall CGPA */}
                      <div className="sm:w-[25%] shrink-0 flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={overallCgpaInput}
                          onChange={(e) => {
                            setIsManualOverall(true);
                            setOverallCgpaInput(e.target.value);
                          }}
                          onBlur={() => {
                            if (overallCgpaInput.trim() !== '') {
                              const formatted = formatToTwoDecimals(overallCgpaInput);
                              if (formatted) setOverallCgpaInput(formatted);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="CGPA"
                          className="w-16 sm:w-20 h-8.5 px-2 text-center rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white placeholder:text-[#64748B] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none transition-colors"
                        />
                        <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
                          {overallCgpaInput.trim() !== '' && !isNaN(parseFloat(overallCgpaInput))
                            ? mapCgpaToGrade(parseFloat(overallCgpaInput))
                            : '—'}
                        </span>
                      </div>

                      {/* Column 3: Target Overall CGPA */}
                      <div className="sm:w-[23%] shrink-0 flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={targetCgpaInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTargetCgpaInput(val);
                            const num = parseFloat(val);
                            if (!val.trim() || isNaN(num) || num <= 0) {
                              setIsTargetCleared(true);
                              setTargetGradeInput('NONE');
                            } else {
                              setIsTargetCleared(false);
                              setTargetGradeInput(mapCgpaToGrade(num, evaluationOption));
                            }
                          }}
                          onBlur={() => {
                            if (targetCgpaInput.trim() !== '') {
                              const num = parseFloat(targetCgpaInput);
                              if (isNaN(num) || num <= 0) {
                                setTargetCgpaInput('');
                                setIsTargetCleared(true);
                                setTargetGradeInput('NONE');
                              } else {
                                const formatted = formatToTwoDecimals(targetCgpaInput);
                                if (formatted) {
                                  setTargetCgpaInput(formatted);
                                  setTargetGradeInput(mapCgpaToGrade(parseFloat(formatted), evaluationOption));
                                }
                              }
                            } else {
                              setIsTargetCleared(true);
                              setTargetGradeInput('NONE');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="CGPA"
                          className="w-16 sm:w-20 h-8.5 px-2 text-center rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white placeholder:text-[#64748B] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none transition-colors"
                        />
                        <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
                          {isTargetCleared || !targetCgpaInput.trim() || isNaN(parseFloat(targetCgpaInput)) || parseFloat(targetCgpaInput) <= 0
                            ? 'None'
                            : mapCgpaToGrade(parseFloat(targetCgpaInput))}
                        </span>
                      </div>

                      {/* Column 4: Spacer matching Date column */}
                      <div className="hidden sm:block sm:w-[20%] shrink-0" />
                    </div>
                  )}
                </div>

                {/* DIVIDER */}
                <div className="border-b border-white/[0.06]" />

                {/* SUBJECT-WISE ESTIMATED SCORE ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-0">
                  <div className="sm:w-[32%] shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                      Subject-wise Estimated Score
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:contents gap-2 overflow-x-auto [scrollbar-width:none]">
                    <div className="sm:w-[25%] shrink-0 flex items-center gap-1.5">
                      {evaluationOption === 'Grade-based' ? (
                        <>
                          <div className="w-16 sm:w-20 h-8.5 flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#0B0F19]/60 font-mono text-xs font-bold text-white">
                            {estimateResult.hasAnyAttempted ? estimateResult.estimatedGrade : '—'}
                          </div>
                          <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#06B6D4]/40 bg-[#06B6D4]/10 font-mono text-xs font-bold text-[#06B6D4]">
                            {estimateResult.hasAnyAttempted && estimateResult.estimatedCgpa > 0 ? estimateResult.estimatedCgpa.toFixed(2) : '—'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-16 sm:w-20 h-8.5 flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#0B0F19]/60 font-mono text-xs font-bold text-white">
                            {estimateResult.hasAnyAttempted && estimateResult.estimatedCgpa > 0 ? estimateResult.estimatedCgpa.toFixed(2) : '—'}
                          </div>
                          <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
                            {estimateResult.hasAnyAttempted && estimateResult.estimatedCgpa > 0 ? mapCgpaToGrade(estimateResult.estimatedCgpa) : '—'}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="hidden sm:block sm:w-[23%] shrink-0" />
                    <div className="hidden sm:block sm:w-[20%] shrink-0" />
                  </div>
                </div>
              </div>

              {/* ── SUBJECT GRADES & SCORES GLASS CONTAINER ── */}
              {subjectsInSelectedProgram.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-md p-4 sm:p-5 space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-1">
                    <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider font-mono">
                      SUBJECT GRADES &amp; SCORES
                    </label>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      {subjectsInSelectedProgram.length} subjects enrolled
                    </span>
                  </div>

                  {/* Column Headers for PC view */}
                  <div className="hidden sm:flex items-center px-2.5 sm:px-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
                    <div className="sm:w-[32%] shrink-0 pr-2">SUBJECT</div>
                    <div className="sm:w-[25%] shrink-0">ACTUAL</div>
                    <div className="sm:w-[23%] shrink-0">TARGET</div>
                    <div className="sm:w-[20%] shrink-0">DATE</div>
                  </div>

                  <div className="space-y-2.5 max-h-60 sm:max-h-64 overflow-y-auto pr-1.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
                    {subjectsInSelectedProgram.map((sub) => {
                      const currentScore = subjectScores[sub.id] || { 
                        target: currentTargetDisplay, 
                        actual: '', 
                        isPassed: true,
                        date: ''
                      };

                      const currentGrade = currentScore.actual ? currentScore.actual.trim().toUpperCase() : '';
                      const hasGrade = ['A', 'B', 'C', 'D', 'E', 'F'].includes(currentGrade);
                      const currentNumeric = mapGradeToNumeric(currentScore.actual, evaluationOption);
                      const displayNum = isNaN(currentNumeric) ? (GRADE_TO_NUMERIC_MAP[currentGrade] ?? 0) : currentNumeric;
                      const hasCgpaValue = currentScore.actual && currentScore.actual.trim() !== '' && currentScore.actual !== '—';

                      return (
                        <div
                          key={sub.id}
                          className="p-2.5 sm:p-3 rounded-xl border border-white/[0.06] bg-[#0B0F19]/50 hover:bg-[#0B0F19]/80 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0"
                        >
                          {/* Column 1: Subject Name */}
                          <div className="sm:w-[32%] shrink-0 min-w-0 pr-2">
                            <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] truncate block" title={sub.name}>
                              {sub.name}
                            </span>
                          </div>

                          {/* Controls Row on Mobile / Direct Columns on PC (sm:contents) */}
                          <div className="flex items-center justify-between sm:contents gap-2 overflow-x-auto [scrollbar-width:none]">
                            {/* 3rd box from right: Actual CGPA & Grade */}
                            <div className="sm:w-[25%] shrink-0 flex items-center gap-1.5">
                              {evaluationOption === 'Grade-based' ? (
                                <>
                                  <div className="relative">
                                    <select
                                      value={hasGrade ? currentGrade : ''}
                                      onChange={(e) => handleSubjectGradeSelect(sub.id, e.target.value)}
                                      className="w-16 sm:w-20 h-8.5 pl-2.5 pr-6 rounded-xl border border-white/[0.12] bg-[#0E121B]/80 font-mono text-xs font-bold text-white appearance-none outline-none cursor-pointer focus:border-[#F59E0B] transition-colors"
                                    >
                                      <option value="" className="bg-[#0E121B] text-white">GRADE</option>
                                      <option value="A" className="bg-[#0E121B] text-white">A</option>
                                      <option value="B" className="bg-[#0E121B] text-white">B</option>
                                      <option value="C" className="bg-[#0E121B] text-white">C</option>
                                      <option value="D" className="bg-[#0E121B] text-white">D</option>
                                      <option value="E" className="bg-[#0E121B] text-white">E</option>
                                      <option value="F" className="bg-[#0E121B] text-white">F</option>
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                                  </div>
                                  <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#06B6D4]/40 bg-[#06B6D4]/10 font-mono text-xs font-bold text-[#06B6D4]">
                                    {hasGrade ? displayNum.toFixed(2) : '—'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={currentScore.actual}
                                    onChange={(e) => handleSubjectCgpaChange(sub.id, e.target.value)}
                                    onBlur={() => handleSubjectCgpaBlur(sub.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    placeholder="CGPA"
                                    className="w-16 sm:w-20 h-8.5 px-2 text-center rounded-xl border border-white/[0.12] bg-[#0E121B]/80 font-mono text-xs font-bold text-white placeholder:text-[#64748B] focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 outline-none transition-colors"
                                  />
                                  <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
                                    {hasCgpaValue ? mapCgpaToGrade(parseFloat(currentScore.actual)) : '—'}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* 2nd box from right: Target CGPA & Grade */}
                            <div className="sm:w-[23%] shrink-0 flex items-center gap-1.5">
                              <div className="w-16 sm:w-20 h-8.5 flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#0B0F19]/60 font-mono text-xs font-bold text-[#F8FAFC]/90">
                                {targetDisplayScore}
                              </div>
                              <span className="w-10 sm:w-11 h-8.5 flex items-center justify-center rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
                                {targetDisplayBadge}
                              </span>
                            </div>

                            {/* 1st box from right: Compact Date */}
                            <div className="sm:w-[20%] shrink-0 flex items-center">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const picker = document.getElementById(`subject-date-picker-${sub.id}`) as HTMLInputElement | null;
                                    if (picker && typeof picker.showPicker === 'function') {
                                      picker.showPicker();
                                    } else if (picker) {
                                      picker.focus();
                                    }
                                  }}
                                  className="h-8.5 px-2 sm:px-2.5 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white hover:border-[#F59E0B]/50 transition-colors flex items-center justify-between gap-1 w-24 sm:w-28"
                                  title="Result Date"
                                >
                                  <span className={currentScore.date ? 'text-white truncate' : 'text-[#64748B]'}>
                                    {currentScore.date ? formatCompactDate(currentScore.date) : '—'}
                                  </span>
                                  <Calendar className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                                </button>
                                <input
                                  id={`subject-date-picker-${sub.id}`}
                                  type="date"
                                  value={currentScore.date || ''}
                                  onChange={(e) => handleSubjectDateChange(sub.id, e.target.value)}
                                  className="sr-only"
                                  tabIndex={-1}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── DATE GLASS CONTAINER ── */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 backdrop-blur-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider shrink-0 font-mono">
              DATE OF RESULT
            </label>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                readOnly
                value={formatDateDisplay(date)}
                onClick={() => {
                  const picker = document.getElementById('add-result-date-picker') as HTMLInputElement | null;
                  if (picker) {
                    if (typeof picker.showPicker === 'function') {
                      picker.showPicker();
                    } else {
                      picker.focus();
                    }
                  }
                }}
                className="w-full h-10 px-3.5 pr-10 rounded-xl border border-white/[0.12] bg-[#0B0F19]/80 font-mono text-xs font-bold text-white outline-none cursor-pointer focus:border-[#F59E0B] transition-colors"
              />
              <input
                id="add-result-date-picker"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="sr-only"
                tabIndex={-1}
              />
              <Calendar 
                onClick={() => {
                  const picker = document.getElementById('add-result-date-picker') as HTMLInputElement | null;
                  if (picker && typeof picker.showPicker === 'function') {
                    picker.showPicker();
                  }
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] cursor-pointer hover:text-white transition-colors" 
              />
            </div>
          </div>

          {/* ── ACTION BUTTONS: CANCEL & SAVE RESULT ── */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08] shrink-0 font-mono">
            <button
              type="button"
              onClick={initiateClose}
              className="px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-[#94A3B8] hover:text-white text-xs font-bold tracking-wider transition-colors cursor-pointer uppercase font-mono"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!isEditing && isCurrentProgramLocked}
              title={!isEditing && isCurrentProgramLocked ? 'Only one result card can exist per program. Delete the existing card first.' : undefined}
              className={`px-7 py-2.5 rounded-xl font-mono text-xs font-black tracking-wider transition-all uppercase flex items-center gap-2 ${
                !isEditing && isCurrentProgramLocked
                  ? 'bg-[#0E121B]/60 text-[#64748B] cursor-not-allowed border border-white/[0.06] shadow-none'
                  : 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#F59E0B] text-black shadow-[0_0_24px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95'
              }`}
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>{isEditing ? 'UPDATE RESULT' : 'SAVE RESULT'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
