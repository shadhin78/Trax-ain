/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SubjectGradeEntry, 
  ProgramResult, 
  ProgramTargetConfig, 
  FreezeConfiguration, 
  EvaluationOption 
} from '../types';

/**
 * Letter Grade to Numeric Scale for Grade-based Evaluation
 */
export const GRADE_BASED_NUMERIC_MAP: Record<string, number> = {
  'A': 4.00,
  'B': 3.00,
  'C': 2.25,
  'D': 2.00,
  'E': 0.00,
  'F': 0.00,
};

/**
 * Letter Grade to Numeric Scale (0.00 - 4.00)
 */
export const GRADE_TO_NUMERIC_MAP: Record<string, number> = {
  'A+': 4.00,
  'A': 4.00,
  'A-': 3.70,
  'B+': 3.30,
  'B': 3.00,
  'B-': 2.70,
  'C+': 2.50,
  'C': 2.25,
  'C-': 1.75,
  'D+': 1.60,
  'D': 2.00,
  'E': 0.00,
  'F': 0.00,
};

/**
 * Convert letter grade or grade string to numeric CGPA (0.00 - 4.00)
 * Handles formats like: "A (4.00)", "B (3.00)", "3.20", "A-", "4.0"
 */
export function mapGradeToNumeric(
  grade: string | number | undefined | null,
  evalType?: EvaluationOption
): number {
  if (grade === undefined || grade === null) return NaN;
  if (typeof grade === 'number') {
    if (isNaN(grade)) return NaN;
    return Math.min(4.00, Math.max(0.00, Number(grade.toFixed(2))));
  }

  const str = String(grade).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase() === 'none') {
    return NaN;
  }

  // Check if string contains parenthesized numeric value: e.g. "B (3.00)" or "A (4.00)"
  const parenMatch = str.match(/\(([\d.]+)\)/);
  if (parenMatch) {
    const parsedParen = parseFloat(parenMatch[1]);
    if (!isNaN(parsedParen)) {
      return Math.min(4.00, Math.max(0.00, Number(parsedParen.toFixed(2))));
    }
  }

  // Check if string is a direct numeric score: e.g. "3.20" or "4"
  const directNum = parseFloat(str);
  if (!isNaN(directNum) && !str.match(/^[A-Za-z]/)) {
    return Math.min(4.00, Math.max(0.00, Number(directNum.toFixed(2))));
  }

  // If in Grade-based evaluation mode, match exact plain letter grade A-F
  if (evalType === 'Grade-based') {
    const upper = str.toUpperCase();
    if (upper in GRADE_BASED_NUMERIC_MAP) {
      return GRADE_BASED_NUMERIC_MAP[upper];
    }
  }

  // Extract letter grade component: e.g. "A+", "A-", "B", "C"
  const letterMatch = str.toUpperCase().match(/^[A-F][+-]?/);
  if (letterMatch) {
    const key = letterMatch[0];
    if (evalType === 'Grade-based' && key in GRADE_BASED_NUMERIC_MAP) {
      return GRADE_BASED_NUMERIC_MAP[key];
    }
    if (key in GRADE_TO_NUMERIC_MAP) {
      return GRADE_TO_NUMERIC_MAP[key];
    }
  }

  return NaN;
}

/**
 * Convert numeric CGPA (0.00 - 4.00) to standard letter grade
 */
export function mapCgpaToGrade(
  cgpa: number | undefined | null,
  evalType?: EvaluationOption
): string {
  if (cgpa === undefined || cgpa === null || isNaN(cgpa) || cgpa < 0) {
    return '—';
  }

  if (evalType === 'Grade-based') {
    if (cgpa >= 3.50) return 'A';
    if (cgpa >= 2.85) return 'B';
    if (cgpa >= 2.00) return 'C';
    if (cgpa >= 1.25) return 'D';
    if (cgpa >= 0.75) return 'E';
    return 'F';
  }

  // CGPA-based mode
  if (cgpa >= 4.00) return 'A+';
  if (cgpa >= 3.75) return 'A';
  if (cgpa >= 3.50) return 'A-';
  if (cgpa >= 3.25) return 'B+';
  if (cgpa >= 3.00) return 'B';
  if (cgpa >= 2.75) return 'B-';
  if (cgpa >= 2.50) return 'C+';
  if (cgpa >= 2.25) return 'C';
  if (cgpa >= 2.00) return 'D';
  return 'F';
}

/**
 * Standard rounding to two decimal places (0.00) matching university calculation
 */
export function roundToTwoDecimals(val: number): number {
  if (!Number.isFinite(val) || val <= 0) return 0;
  return Number((val + 1e-9).toFixed(2));
}

/**
 * Backwards-compatible alias for roundToTwoDecimals
 */
export const roundToStep005 = roundToTwoDecimals;

/**
 * Check if a subject result has been inputted by the user
 */
export function isSubjectInputted(sg: {
  actualScore?: string;
  actualCgpa?: number;
  actualGrade?: string;
  isAttempted?: boolean;
}): boolean {
  if (sg.isAttempted === false) return false;
  const rawScore = (sg.actualScore ?? '').trim();
  if (
    rawScore === '' ||
    rawScore === '—' ||
    rawScore === '-' ||
    rawScore.toUpperCase() === 'N/A' ||
    rawScore.toUpperCase() === 'NONE'
  ) {
    return false;
  }
  const num = mapGradeToNumeric(rawScore);
  if (!isNaN(num)) return true;

  const hasCgpa = typeof sg.actualCgpa === 'number' && !isNaN(sg.actualCgpa) && sg.actualCgpa > 0;
  const hasGrade = Boolean(sg.actualGrade && sg.actualGrade.trim() !== '' && sg.actualGrade !== '—' && sg.actualGrade.toUpperCase() !== 'NONE');

  return hasCgpa || hasGrade;
}

/**
 * Calculate subject-wise estimated score
 * - Count overall subject average across total program subjects
 * - Uninputted subjects count as 0.00 in the overall average
 * - Denominator is the total overall subject count in the program
 * - Rounded to two decimal places matching university standard rounding
 */
export function calculateSubjectWiseEstimate(
  subjectGrades: Array<{ actualScore: string; actualCgpa?: number; isAttempted?: boolean }>,
  evalType: EvaluationOption = 'CGPA-based',
  totalSubjectCount?: number
): { estimatedCgpa: number; estimatedGrade: string; validCount: number; hasAnyAttempted: boolean } {
  if (!subjectGrades || subjectGrades.length === 0) {
    return { estimatedCgpa: 0, estimatedGrade: '—', validCount: 0, hasAnyAttempted: false };
  }

  let sum = 0;
  let validAttemptedCount = 0;

  for (const sg of subjectGrades) {
    if (isSubjectInputted(sg)) {
      const num = mapGradeToNumeric(sg.actualScore ?? sg.actualCgpa, evalType);
      if (!isNaN(num)) {
        sum += num;
        validAttemptedCount++;
      }
    }
  }

  if (validAttemptedCount === 0) {
    return { estimatedCgpa: 0, estimatedGrade: '—', validCount: 0, hasAnyAttempted: false };
  }

  // Denominator is the overall total subjects in the program (e.g. 4 for 4 subjects)
  const denominator = typeof totalSubjectCount === 'number' && totalSubjectCount > 0
    ? totalSubjectCount
    : (subjectGrades.length > 0 ? subjectGrades.length : validAttemptedCount);

  const rawAvg = sum / denominator;
  const avg = roundToTwoDecimals(rawAvg);
  const grade = mapCgpaToGrade(avg, evalType);

  return {
    estimatedCgpa: avg,
    estimatedGrade: grade,
    validCount: denominator,
    hasAnyAttempted: true,
  };
}

/**
 * Compare Manual Overall Result with Subject-wise Estimate
 * Returns whether manual matches estimate within acceptable precision tolerance
 */
export function compareManualAndEstimated(
  manualVal: number | string | undefined | null,
  estimatedCgpa: number,
  evalType: EvaluationOption = 'CGPA-based'
): { isManual: boolean; isMatch: boolean; diff: number } {
  if (manualVal === undefined || manualVal === null || String(manualVal).trim() === '') {
    return { isManual: false, isMatch: true, diff: 0 };
  }

  const manualStr = String(manualVal).trim();
  const manualNum = mapGradeToNumeric(manualStr, evalType);

  if (isNaN(manualNum)) {
    return { isManual: true, isMatch: false, diff: 999 };
  }

  const diff = Number(Math.abs(manualNum - estimatedCgpa).toFixed(2));

  if (evalType === 'Grade-based') {
    // In grade mode, matching same letter grade or within 0.35 is a match
    const manualGrade = mapCgpaToGrade(manualNum, evalType);
    const estGrade = mapCgpaToGrade(estimatedCgpa, evalType);
    const isMatch = manualGrade === estGrade || diff <= 0.35;
    return { isManual: true, isMatch, diff };
  }

  // In CGPA mode, tolerance of 0.05 prevents floating-point rounding mismatches
  const isMatch = diff <= 0.05;
  return { isManual: true, isMatch, diff };
}

/**
 * Pass / Fail Evaluation Rules:
 * - Grade-based: PASS = A or B (including A+, A, A-, B+, B, B-). FAIL = C, D, E, F.
 * - CGPA-based: PASS = CGPA >= 2.00. FAIL = CGPA < 2.00.
 */
export function evaluatePassFail(
  score: number | string | undefined | null,
  evalType: EvaluationOption = 'CGPA-based'
): boolean {
  if (score === undefined || score === null) return false;

  if (evalType === 'Grade-based') {
    const str = String(score).trim().toUpperCase();
    // Check letter grade prefix
    if (str.startsWith('A') || str.startsWith('B')) return true;
    if (str.startsWith('C') || str.startsWith('D') || str.startsWith('E') || str.startsWith('F')) return false;

    // Fallback to numeric equivalent
    const num = mapGradeToNumeric(score, evalType);
    if (isNaN(num)) return false;
    const grade = mapCgpaToGrade(num, evalType);
    return grade.startsWith('A') || grade.startsWith('B');
  }

  // CGPA-based mode: PASS >= 2.00
  const num = typeof score === 'number' ? score : mapGradeToNumeric(score, evalType);
  if (isNaN(num)) return false;
  return num >= 2.00;
}

export interface ProgramMainTargetResult {
  targetCgpa: number;
  targetGrade: string;
  isNone: boolean;
  display: string;
  source: 'configuration' | 'historical_program' | 'historical_subject' | 'default';
}

/**
 * Program Target Resolution:
 * Priority 1: Current program configuration
 * Priority 2: Latest applicable historical program-level record
 * Priority 3: Applicable historical subject record containing a program target
 * Handles an explicitly cleared target correctly (none / 0 resolves to Target: None).
 */
export function getProgramMainTarget(
  progNameOrId: string,
  context: {
    programTargets?: Record<string, ProgramTargetConfig>;
    programs?: Array<{ id: string; name: string }>;
    results?: ProgramResult[];
    evalType?: EvaluationOption;
  }
): ProgramMainTargetResult {
  const { programTargets = {}, programs = [], results = [], evalType = 'CGPA-based' } = context;

  // Resolve programId and canonical name
  const progObj = programs.find(
    (p) => p.id === progNameOrId || p.name.toLowerCase() === progNameOrId.toLowerCase()
  );
  const progId = progObj ? progObj.id : progNameOrId;
  const progName = progObj ? progObj.name : progNameOrId;

  // ── PRIORITY 1: Current program configuration ──
  const config = programTargets[progId] || programTargets[progName];
  if (config) {
    if (
      config.isNone || 
      config.targetCgpa === 0 || 
      String(config.targetGrade).toLowerCase() === 'none'
    ) {
      return {
        targetCgpa: 0,
        targetGrade: 'None',
        isNone: true,
        display: 'Target: None',
        source: 'configuration',
      };
    }

    const tCgpa = typeof config.targetCgpa === 'number' && !isNaN(config.targetCgpa) ? config.targetCgpa : 0;
    if (tCgpa <= 0) {
      return {
        targetCgpa: 0,
        targetGrade: 'None',
        isNone: true,
        display: 'Target: None',
        source: 'configuration',
      };
    }
    const tGrade = config.targetGrade || mapCgpaToGrade(tCgpa, evalType);
    const display = formatSubjectTargetDisplay({ targetCgpa: tCgpa, targetGrade: tGrade, isNone: false }, evalType);

    return {
      targetCgpa: tCgpa,
      targetGrade: tGrade,
      isNone: false,
      display,
      source: 'configuration',
    };
  }

  // ── PRIORITY 2: Latest applicable historical program-level record ──
  const matchingResults = results
    .filter(
      (r) =>
        r.resultType === 'Program CGPA' &&
        (r.programId === progId || r.programName.toLowerCase() === progName.toLowerCase())
    )
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

  if (matchingResults.length > 0) {
    const latest = matchingResults[0];

    if (latest.targetIsNone || (latest.targetCgpa === 0 && (!latest.targetGrade || latest.targetGrade.toLowerCase() === 'none'))) {
      return {
        targetCgpa: 0,
        targetGrade: 'None',
        isNone: true,
        display: 'Target: None',
        source: 'historical_program',
      };
    }

    if (typeof latest.targetCgpa === 'number' && latest.targetCgpa > 0) {
      const tCgpa = latest.targetCgpa;
      const tGrade = latest.targetGrade || mapCgpaToGrade(tCgpa, evalType);
      const display = formatSubjectTargetDisplay({ targetCgpa: tCgpa, targetGrade: tGrade, isNone: false }, evalType);
      return {
        targetCgpa: tCgpa,
        targetGrade: tGrade,
        isNone: false,
        display,
        source: 'historical_program',
      };
    }
  }

  // ── PRIORITY 3: Applicable historical subject record containing a program target ──
  for (const res of matchingResults) {
    if (res.subjectGrades && res.subjectGrades.length > 0) {
      for (const sg of res.subjectGrades) {
        if (sg.targetScore && sg.targetScore.toLowerCase().includes('target: none')) {
          return {
            targetCgpa: 0,
            targetGrade: 'None',
            isNone: true,
            display: 'Target: None',
            source: 'historical_subject',
          };
        }
        if (sg.targetScore && sg.targetScore !== '—' && sg.targetScore !== '-') {
          const num = mapGradeToNumeric(sg.targetScore, evalType);
          if (!isNaN(num) && num > 0) {
            const tGrade = mapCgpaToGrade(num, evalType);
            const display = formatSubjectTargetDisplay({ targetCgpa: num, targetGrade: tGrade, isNone: false }, evalType);
            return {
              targetCgpa: num,
              targetGrade: tGrade,
              isNone: false,
              display,
              source: 'historical_subject',
            };
          }
        }
      }
    }
  }

  // ── DEFAULT FALLBACK (Neutral until explicitly inputted by user) ──
  return {
    targetCgpa: 0,
    targetGrade: 'None',
    isNone: true,
    display: 'Target: None',
    source: 'default',
  };
}

/**
 * Propagate target to subject display format:
 * - Grade-based: Target: {Grade} ({CGPA}) (e.g. Target: A (4.00))
 * - CGPA-based: Target: {CGPA} ({Grade}) (e.g. Target: 3.50 (A))
 */
export function formatSubjectTargetDisplay(
  target: { targetCgpa: number; targetGrade?: string; isNone?: boolean },
  evalType: EvaluationOption = 'CGPA-based'
): string {
  if (target.isNone || target.targetGrade?.toLowerCase() === 'none' || target.targetCgpa === 0 || !target.targetCgpa) {
    return 'Target: None';
  }

  const cgpa = typeof target.targetCgpa === 'number' && !isNaN(target.targetCgpa) ? target.targetCgpa : 0;
  if (cgpa <= 0) {
    return 'Target: None';
  }
  const grade = target.targetGrade || mapCgpaToGrade(cgpa, evalType);

  if (evalType === 'Grade-based') {
    return `Target: ${grade} (${cgpa.toFixed(2)})`;
  }
  return `Target: ${cgpa.toFixed(2)} (${grade})`;
}

/**
 * Goal Met Evaluation:
 * A program may be evaluated for goal attainment only when:
 * 1. All curriculum subjects satisfy completion requirements (no unattempted / missing results).
 * 2. No subject has failed under applicable rules.
 * 3. Actual overall result reaches or exceeds configured target.
 * Target set to None cannot be marked Goal Met.
 */
export function evaluateGoalMet(params: {
  allCurriculumSubjects: Array<{ id: string; name: string }>;
  subjectGrades: SubjectGradeEntry[];
  actualCgpa: number;
  targetCgpa: number;
  actualGrade?: string;
  targetGrade?: string;
  evalType: EvaluationOption;
  targetIsNone?: boolean;
}): { isMet: boolean; reason: string } {
  const {
    allCurriculumSubjects,
    subjectGrades,
    actualCgpa,
    targetCgpa,
    actualGrade,
    targetGrade,
    evalType,
    targetIsNone,
  } = params;

  // 1. Target cannot be None
  if (targetIsNone || targetCgpa <= 0 || targetGrade?.toLowerCase() === 'none') {
    return { isMet: false, reason: 'Target is not configured (Target: None)' };
  }

  // 2. All curriculum subjects must have attempted results
  if (allCurriculumSubjects && allCurriculumSubjects.length > 0) {
    for (const sub of allCurriculumSubjects) {
      const entry = subjectGrades.find((sg) => sg.subjectId === sub.id);
      if (!entry) {
        return { isMet: false, reason: `Subject "${sub.name}" is unattempted or missing` };
      }
      const num = mapGradeToNumeric(entry.actualScore, evalType);
      if (isNaN(num) || entry.actualScore === '—' || entry.actualScore === '') {
        return { isMet: false, reason: `Subject "${sub.name}" has no valid result entered` };
      }
    }
  } else if (!subjectGrades || subjectGrades.length === 0) {
    return { isMet: false, reason: 'No subject grades logged' };
  }

  // 3. No subject has failed under applicable rules
  for (const sg of subjectGrades) {
    if (!sg.isPassed) {
      return { isMet: false, reason: `Subject "${sg.subjectName}" failed` };
    }
    const isPass = evaluatePassFail(sg.actualScore, evalType);
    if (!isPass) {
      return { isMet: false, reason: `Subject "${sg.subjectName}" score does not meet pass criteria` };
    }
  }

  // 4. Actual overall reaches or exceeds configured target
  if (evalType === 'Grade-based') {
    const actNum = mapGradeToNumeric(actualGrade ?? actualCgpa, evalType);
    const tarNum = mapGradeToNumeric(targetGrade ?? targetCgpa, evalType);
    if (isNaN(actNum) || isNaN(tarNum) || actNum < tarNum - 0.001) {
      return { isMet: false, reason: 'Actual grade does not meet target grade threshold' };
    }
  } else {
    // CGPA-based
    if (actualCgpa < targetCgpa - 0.001) {
      return { isMet: false, reason: `Actual CGPA (${actualCgpa.toFixed(2)}) is below Target (${targetCgpa.toFixed(2)})` };
    }
  }

  return { isMet: true, reason: 'All subjects passed and overall target achieved' };
}

/**
 * Reconciles the bidirectional relationship between program freeze and subject freeze:
 * 1. When a program is marked as passed (frozen), all subjects inside that program are also passed.
 * 2. When all subjects inside a program are marked as passed, that program is also passed.
 * 3. When a program is unmarked as passed (e.g. undoing mistaken bulk-pass), subjects that were
 *    previously marked as passed (via individual toggles or active results) are restored,
 *    while subjects that were only passed due to the program pass are unmarked.
 * 4. When an individual subject is unmarked, the program is unmarked as passed.
 */
export function reconcileProgramSubjectFreeze(params: {
  programIds: string[];
  subjectIds: string[];
  manualProgramIds?: string[];
  manualSubjectIds?: string[];
  preProgramFrozenSubjectIds?: Record<string, string[]>;
  results?: ProgramResult[];
  programs: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; programId: string; name: string }>;
  prioritizedAction?: {
    type: 'TOGGLE_PROGRAM';
    programId: string;
    isNowPassed: boolean;
  } | {
    type: 'TOGGLE_SUBJECT';
    subjectId: string;
    isNowPassed: boolean;
  };
}): {
  frozenProgramIds: string[];
  frozenSubjectIds: string[];
  manualFrozenProgramIds: string[];
  manualFrozenSubjectIds: string[];
  preProgramFrozenSubjectIds: Record<string, string[]>;
} {
  const {
    programIds,
    subjectIds,
    manualProgramIds,
    manualSubjectIds,
    preProgramFrozenSubjectIds,
    programs,
    subjects,
    prioritizedAction,
  } = params;

  const currentProgramSet = new Set<string>(programIds);
  const currentSubjectSet = new Set<string>(subjectIds);
  const currentManualPrograms = new Set<string>(manualProgramIds || []);
  const currentManualSubjects = new Set<string>(manualSubjectIds || []);
  const nextPreSnap: Record<string, string[]> = { ...(preProgramFrozenSubjectIds || {}) };

  if (prioritizedAction) {
    if (prioritizedAction.type === 'TOGGLE_PROGRAM') {
      const { programId, isNowPassed } = prioritizedAction;
      const progSubs = subjects.filter((s) => s.programId === programId);

      if (isNowPassed) {
        // Turning program ON:
        // 1. Snapshot which subjects of this program are currently passed BEFORE turning ON
        const currentSubsForProg = progSubs.filter((s) => currentSubjectSet.has(s.id)).map((s) => s.id);
        nextPreSnap[programId] = currentSubsForProg;

        // 2. Mark program as passed
        currentProgramSet.add(programId);
        currentManualPrograms.add(programId);

        // 3. Mark all constituent subjects as passed
        progSubs.forEach((s) => currentSubjectSet.add(s.id));
      } else {
        // Turning program OFF (e.g. undoing mistaken program pass):
        currentProgramSet.delete(programId);
        currentManualPrograms.delete(programId);

        const savedPreSubs = nextPreSnap[programId];
        delete nextPreSnap[programId];

        // Determine which subjects to restore
        const subjectsToKeep = new Set<string>();

        if (savedPreSubs && savedPreSubs.length > 0 && savedPreSubs.length < progSubs.length) {
          // Snapshot had some (e.g. 2 of 4) subjects: restore them!
          savedPreSubs.forEach((id) => subjectsToKeep.add(id));
        } else if (currentManualSubjects.size > 0) {
          // Fallback: check manualFrozenSubjectIds for this program
          const manualInProg = progSubs.filter((s) => currentManualSubjects.has(s.id)).map((s) => s.id);
          if (manualInProg.length > 0 && manualInProg.length < progSubs.length) {
            manualInProg.forEach((id) => subjectsToKeep.add(id));
          }
        }

        // Apply to currentSubjectSet and currentManualSubjects
        progSubs.forEach((s) => {
          if (subjectsToKeep.has(s.id)) {
            currentSubjectSet.add(s.id);
            currentManualSubjects.add(s.id);
          } else {
            currentSubjectSet.delete(s.id);
            currentManualSubjects.delete(s.id);
          }
        });
      }
    } else if (prioritizedAction.type === 'TOGGLE_SUBJECT') {
      const { subjectId, isNowPassed } = prioritizedAction;
      const targetSub = subjects.find((s) => s.id === subjectId);

      if (isNowPassed) {
        currentSubjectSet.add(subjectId);
        currentManualSubjects.add(subjectId);
      } else {
        currentSubjectSet.delete(subjectId);
        currentManualSubjects.delete(subjectId);
      }

      if (targetSub) {
        // Clear snapshot for this program since individual subject was manually toggled
        delete nextPreSnap[targetSub.programId];

        const progSubs = subjects.filter((s) => s.programId === targetSub.programId);
        if (progSubs.length > 0) {
          const allSubsPassed = progSubs.every((s) => currentSubjectSet.has(s.id));
          if (allSubsPassed) {
            currentProgramSet.add(targetSub.programId);
            currentManualPrograms.add(targetSub.programId);
          } else {
            currentProgramSet.delete(targetSub.programId);
            currentManualPrograms.delete(targetSub.programId);
          }
        }
      }
    }
  }

  // Consistency pass across all programs and subjects (when no prioritized action or general pass)
  for (const prog of programs) {
    const progSubs = subjects.filter((s) => s.programId === prog.id);
    if (progSubs.length === 0) continue;

    if (!prioritizedAction) {
      if (currentProgramSet.has(prog.id)) {
        progSubs.forEach((s) => currentSubjectSet.add(s.id));
      } else {
        const allSubsPassed = progSubs.every((s) => currentSubjectSet.has(s.id));
        if (allSubsPassed) {
          currentProgramSet.add(prog.id);
        }
      }
    }
  }

  return {
    frozenProgramIds: Array.from(currentProgramSet),
    frozenSubjectIds: Array.from(currentSubjectSet),
    manualFrozenProgramIds: Array.from(currentManualPrograms),
    manualFrozenSubjectIds: Array.from(currentManualSubjects),
    preProgramFrozenSubjectIds: nextPreSnap,
  };
}

/**
 * Pass / Freeze is independent and fully manual:
 * Logged results do NOT automatically modify the Pass / Freeze configuration.
 * Returns currentFreezeConfig unchanged.
 */
export function syncPassFreezeFromResults(params: {
  results: ProgramResult[];
  programs: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; programId: string; name: string }>;
  currentFreezeConfig: FreezeConfiguration;
}): FreezeConfiguration {
  return params.currentFreezeConfig;
}
