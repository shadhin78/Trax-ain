/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  mapGradeToNumeric,
  mapCgpaToGrade,
  GRADE_TO_NUMERIC_MAP,
  GRADE_BASED_NUMERIC_MAP,
  roundToTwoDecimals,
  roundToStep005,
  calculateSubjectWiseEstimate,
  compareManualAndEstimated,
  evaluatePassFail,
  getProgramMainTarget,
  formatSubjectTargetDisplay,
  evaluateGoalMet,
  syncPassFreezeFromResults,
  reconcileProgramSubjectFreeze,
} from '../utils/outcomeEvaluation';
import { ProgramResult, SubjectGradeEntry, FreezeConfiguration } from '../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`PASS: ${msg}`);
  }
}

console.log('=== TEST 1: Grade Conversion and Boundary Mapping ===');
assert(mapGradeToNumeric('A (4.00)') === 4.00, 'A (4.00) maps to 4.00');
assert(mapGradeToNumeric('B (3.00)') === 3.00, 'B (3.00) maps to 3.00');
assert(mapGradeToNumeric('3.20') === 3.20, '3.20 maps to 3.20');
assert(mapGradeToNumeric('A') === 4.00, 'Letter A maps to 4.00');
assert(mapGradeToNumeric('B') === 3.00, 'Letter B maps to 3.00');
assert(mapGradeToNumeric('C') === 2.25, 'Letter C maps to 2.25');
assert(mapGradeToNumeric('D') === 2.00, 'Letter D maps to 2.00');
assert(mapGradeToNumeric('E') === 0.00, 'Letter E maps to 0.00');
assert(mapGradeToNumeric('F') === 0.00, 'Letter F maps to 0.00');

// Grade-based mode individual mappings with case and whitespace normalization
assert(mapGradeToNumeric('A', 'Grade-based') === 4.00, 'Grade-based A maps to 4.00');
assert(mapGradeToNumeric('B', 'Grade-based') === 3.00, 'Grade-based B maps to 3.00');
assert(mapGradeToNumeric('C', 'Grade-based') === 2.25, 'Grade-based C maps to 2.25');
assert(mapGradeToNumeric('D', 'Grade-based') === 2.00, 'Grade-based D maps to 2.00');
assert(mapGradeToNumeric('E', 'Grade-based') === 0.00, 'Grade-based E maps to 0.00');
assert(mapGradeToNumeric('F', 'Grade-based') === 0.00, 'Grade-based F maps to 0.00');
assert(mapGradeToNumeric(' a ', 'Grade-based') === 4.00, 'Grade-based " a " maps to 4.00');
assert(mapGradeToNumeric(' d ', 'Grade-based') === 2.00, 'Grade-based " d " maps to 2.00');
assert(mapGradeToNumeric(' e ', 'Grade-based') === 0.00, 'Grade-based " e " maps to 0.00');

// Verify GRADE_BASED_NUMERIC_MAP constants
assert(GRADE_BASED_NUMERIC_MAP['A'] === 4.00, 'GRADE_BASED_NUMERIC_MAP A is 4.00');
assert(GRADE_BASED_NUMERIC_MAP['B'] === 3.00, 'GRADE_BASED_NUMERIC_MAP B is 3.00');
assert(GRADE_BASED_NUMERIC_MAP['C'] === 2.25, 'GRADE_BASED_NUMERIC_MAP C is 2.25');
assert(GRADE_BASED_NUMERIC_MAP['D'] === 2.00, 'GRADE_BASED_NUMERIC_MAP D is 2.00');
assert(GRADE_BASED_NUMERIC_MAP['E'] === 0.00, 'GRADE_BASED_NUMERIC_MAP E is 0.00');
assert(GRADE_BASED_NUMERIC_MAP['F'] === 0.00, 'GRADE_BASED_NUMERIC_MAP F is 0.00');

// Regression: Plus/minus grades are NOT accidentally converted using plain-letter mappings
assert(mapGradeToNumeric('A-') === 3.70, 'A- maps to 3.70 (not plain A 4.00)');
assert(mapGradeToNumeric('B+') === 3.30, 'B+ maps to 3.30 (not plain B 3.00)');
assert(mapGradeToNumeric('B-') === 2.70, 'B- maps to 2.70 (not plain B 3.00)');
assert(mapGradeToNumeric('C+') === 2.50, 'C+ maps to 2.50 (not plain C 2.25)');
assert(mapGradeToNumeric('C-') === 1.75, 'C- maps to 1.75 (not plain C 2.25)');
assert(mapGradeToNumeric('D+') === 1.60, 'D+ maps to 1.60 (not plain D 2.00)');
assert(mapGradeToNumeric('A+') === 4.00, 'A+ maps to 4.00');

assert(isNaN(mapGradeToNumeric('—')), 'Empty placeholder "—" maps to NaN (not 0)');
assert(isNaN(mapGradeToNumeric('')), 'Empty string maps to NaN (not 0)');

assert(mapCgpaToGrade(4.00) === 'A+', 'CGPA 4.00 maps to A+');
assert(mapCgpaToGrade(3.75) === 'A', 'CGPA 3.75 maps to A');
assert(mapCgpaToGrade(3.50) === 'A-', 'CGPA 3.50 maps to A-');
assert(mapCgpaToGrade(3.25) === 'B+', 'CGPA 3.25 maps to B+');
assert(mapCgpaToGrade(3.00) === 'B', 'CGPA 3.00 maps to B');
assert(mapCgpaToGrade(2.75) === 'B-', 'CGPA 2.75 maps to B-');
assert(mapCgpaToGrade(2.50) === 'C+', 'CGPA 2.50 maps to C+');
assert(mapCgpaToGrade(2.25) === 'C', 'CGPA 2.25 maps to C');
assert(mapCgpaToGrade(2.00) === 'D', 'CGPA 2.00 maps to D');
assert(mapCgpaToGrade(1.99) === 'F', 'CGPA 1.99 maps to F');
assert(mapCgpaToGrade(1.00) === 'F', 'CGPA 1.00 maps to F');
assert(mapCgpaToGrade(0.00) === 'F', 'CGPA 0.00 maps to F');
assert(mapCgpaToGrade(-1) === '—', 'Negative CGPA maps to —');
assert(mapCgpaToGrade(NaN) === '—', 'NaN CGPA maps to —');
assert(mapCgpaToGrade(4.00, 'Grade-based') === 'A', 'Grade-based 4.00 maps to A');
assert(mapCgpaToGrade(3.00, 'Grade-based') === 'B', 'Grade-based 3.00 maps to B');
assert(mapCgpaToGrade(2.00, 'Grade-based') === 'C', 'Grade-based 2.00 maps to C');

console.log('\n=== TEST 2: Subject-wise Estimated Scores and Denominator Handling ===');
// Test rounding utility
assert(roundToTwoDecimals(14.25 / 7) === 2.04, 'roundToTwoDecimals: 14.25 / 7 rounds to 2.04');
assert(roundToTwoDecimals(16.75 / 7) === 2.39, 'roundToTwoDecimals: 16.75 / 7 rounds to 2.39');
assert(roundToTwoDecimals(9.00 / 3) === 3.00, 'roundToTwoDecimals: 9.00 / 3 rounds to 3.00');
assert(roundToTwoDecimals(0) === 0, 'roundToTwoDecimals: 0 returns 0');
assert(roundToTwoDecimals(-1.5) === 0, 'roundToTwoDecimals: negative returns 0');
assert(roundToTwoDecimals(NaN) === 0, 'roundToTwoDecimals: NaN returns 0');
assert(roundToStep005 === roundToTwoDecimals, 'roundToStep005 is backwards-compatible alias');

// Two subjects with 3.00 and 3.40 -> average 3.20 (ends in 0)
const est1 = calculateSubjectWiseEstimate([
  { actualScore: 'B (3.00)' },
  { actualScore: '3.40' },
], 'CGPA-based');
assert(est1.estimatedCgpa === 3.20, 'Subject average is 3.20');
assert(est1.validCount === 2, 'Valid count is 2');

// Case A — Previous result (2.50, 2.50, 2.50, 2.50, 0.00, 2.00, 2.25)
const caseA = calculateSubjectWiseEstimate([
  { actualScore: '2.50' },
  { actualScore: '2.50' },
  { actualScore: '2.50' },
  { actualScore: '2.50' },
  { actualScore: '0.00' },
  { actualScore: '2.00' },
  { actualScore: '2.25' },
], 'CGPA-based', 7);
assert(caseA.estimatedCgpa === 2.04, 'Case A: 14.25 / 7 yields 2.04');
assert(caseA.estimatedGrade === 'D', 'Case A: 2.04 maps to Grade D');
assert(caseA.validCount === 7, 'Case A: validCount is 7');

// Case B — Latest result (2.75, 2.50, 2.50, 3.25, 2.50, 0.00, 3.25)
const caseB = calculateSubjectWiseEstimate([
  { actualScore: '2.75' },
  { actualScore: '2.50' },
  { actualScore: '2.50' },
  { actualScore: '3.25' },
  { actualScore: '2.50' },
  { actualScore: '0.00' },
  { actualScore: '3.25' },
], 'CGPA-based', 7);
assert(caseB.estimatedCgpa === 2.39, 'Case B: 16.75 / 7 yields 2.39');
assert(caseB.estimatedGrade === 'C', 'Case B: 2.39 maps to Grade C');
assert(caseB.validCount === 7, 'Case B: validCount is 7');

// Case C — Exact two-decimal result (3.00, 3.00, 3.00)
const caseC = calculateSubjectWiseEstimate([
  { actualScore: '3.00' },
  { actualScore: '3.00' },
  { actualScore: '3.00' },
], 'CGPA-based', 3);
assert(caseC.estimatedCgpa === 3.00, 'Case C: 9.00 / 3 yields 3.00');
assert(caseC.estimatedGrade === 'B', 'Case C: 3.00 maps to Grade B');

// Overall subject average across total program subjects (e.g. 4 subjects, 1 attempted 4.00, 3 unattempted 0, 0, 0)
const estOverall4 = calculateSubjectWiseEstimate([
  { actualScore: '4.00' },
  { actualScore: '—' },
  { actualScore: '—' },
  { actualScore: '—' },
], 'CGPA-based', 4);
assert(estOverall4.estimatedCgpa === 1.00, '1 subject 4.00 out of 4 yields 1.00');
assert(estOverall4.estimatedGrade === 'F', '1.00 maps to Grade F');

// Overall subject average with 4 subjects: 4.00 and 3.70 inputted, 2 uninputted
// 7.70 / 4 = 1.925 -> rounded to two decimal places is 1.93
const estOverallCl = calculateSubjectWiseEstimate([
  { actualScore: '4.00' },
  { actualScore: '3.70' },
  { actualScore: '—' },
  { actualScore: '—' },
], 'CGPA-based', 4);
assert(estOverallCl.estimatedCgpa === 1.93, '7.70 / 4 yields 1.93 in standard two-decimal format');
assert(estOverallCl.estimatedGrade === 'F', '1.93 maps to Grade F (< 2.00)');

// Grade-based Average Calculation Cases:
// Case 1: A, B, C, D, E, F -> total 11.25, 6 subjects, raw average 1.875, final CGPA 1.88
const gbEst6 = calculateSubjectWiseEstimate([
  { actualScore: 'A' },
  { actualScore: 'B' },
  { actualScore: 'C' },
  { actualScore: 'D' },
  { actualScore: 'E' },
  { actualScore: 'F' },
], 'Grade-based', 6);
assert(gbEst6.estimatedCgpa === 1.88, 'A, B, C, D, E, F: raw 1.875 -> final CGPA 1.88');
assert(gbEst6.validCount === 6, 'A, B, C, D, E, F: validCount is 6');

// Case 2: A, B, C -> total 9.25, 3 subjects, raw average 3.083333..., final CGPA 3.08
const gbEst3 = calculateSubjectWiseEstimate([
  { actualScore: 'A' },
  { actualScore: 'B' },
  { actualScore: 'C' },
], 'Grade-based', 3);
assert(gbEst3.estimatedCgpa === 3.08, 'A, B, C: raw 3.083333... -> final CGPA 3.08');
assert(gbEst3.validCount === 3, 'A, B, C: validCount is 3');

// Case 3: E, F -> total 0.00, 2 subjects, final CGPA 0.00
const gbEstEF = calculateSubjectWiseEstimate([
  { actualScore: 'E' },
  { actualScore: 'F' },
], 'Grade-based', 2);
assert(gbEstEF.estimatedCgpa === 0.00, 'E, F: total 0.00 -> final CGPA 0.00');
assert(gbEstEF.validCount === 2, 'E, F: validCount is 2');

console.log('\n=== TEST 3: Manual vs Estimated Overall Result Verification ===');
// Manual matching estimate (e.g. 3.20 vs 3.20)
const matchCheck = compareManualAndEstimated('3.20', 3.20, 'CGPA-based');
assert(matchCheck.isMatch === true, 'Matching manual result yields isMatch=true (Green checkmark)');

// Manual differing from estimate (e.g. 3.80 vs 3.20)
const mismatchCheck = compareManualAndEstimated('3.80', 3.20, 'CGPA-based');
assert(mismatchCheck.isMatch === false, 'Differing manual result yields isMatch=false (Red cross)');

// Floating precision tolerance (e.g. 3.21 vs 3.20 within 0.05)
const toleranceCheck = compareManualAndEstimated('3.21', 3.20, 'CGPA-based');
assert(toleranceCheck.isMatch === true, 'Within tolerance matches without false alarm');

console.log('\n=== TEST 4: Program Target Resolution Priority ===');
const dummyPrograms = [{ id: 'prog_pl', name: 'PL' }];

// Priority 1: Current configuration
const targetP1 = getProgramMainTarget('prog_pl', {
  programs: dummyPrograms,
  programTargets: {
    prog_pl: { programId: 'prog_pl', targetCgpa: 3.80, targetGrade: 'A', isNone: false },
  },
  results: [],
});
assert(targetP1.targetCgpa === 3.80 && targetP1.source === 'configuration', 'Priority 1 resolves configuration target 3.80');

// Explicitly cleared target resolves to Target: None and prevents fallback
const clearedP1 = getProgramMainTarget('prog_pl', {
  programs: dummyPrograms,
  programTargets: {
    prog_pl: { programId: 'prog_pl', targetCgpa: 0, targetGrade: 'None', isNone: true },
  },
  results: [
    {
      id: 'res_old',
      resultType: 'Program CGPA',
      programId: 'prog_pl',
      programName: 'PL',
      evaluationOption: 'CGPA-based',
      targetCgpa: 3.90,
      actualCgpa: 3.50,
      isMet: false,
      isPassed: true,
      isEstimated: false,
      subjectGrades: [],
      date: '2026-09-01',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ],
});
assert(clearedP1.isNone === true && clearedP1.display === 'Target: None', 'Explicitly cleared target resolves to Target: None without historical fallback');

// Priority 2: Historical program record when no config exists
const targetP2 = getProgramMainTarget('prog_pl', {
  programs: dummyPrograms,
  programTargets: {},
  results: [
    {
      id: 'res_hist',
      resultType: 'Program CGPA',
      programId: 'prog_pl',
      programName: 'PL',
      evaluationOption: 'CGPA-based',
      targetCgpa: 3.65,
      actualCgpa: 3.50,
      isMet: false,
      isPassed: true,
      isEstimated: false,
      subjectGrades: [],
      date: '2026-10-01',
      createdAt: '2026-10-01T00:00:00Z',
    },
  ],
});
assert(targetP2.targetCgpa === 3.65 && targetP2.source === 'historical_program', 'Priority 2 resolves historical program target 3.65');

console.log('\n=== TEST 5: Subject Target Propagation Display Format ===');
const dispGrade = formatSubjectTargetDisplay({ targetCgpa: 4.00, targetGrade: 'A', isNone: false }, 'Grade-based');
assert(dispGrade === 'Target: A (4.00)', 'Grade-based format matches Target: A (4.00)');

const dispCgpa = formatSubjectTargetDisplay({ targetCgpa: 3.50, targetGrade: 'A-', isNone: false }, 'CGPA-based');
assert(dispCgpa === 'Target: 3.50 (A-)', 'CGPA-based format matches Target: 3.50 (A-)');

const dispNone = formatSubjectTargetDisplay({ targetCgpa: 0, isNone: true }, 'CGPA-based');
assert(dispNone === 'Target: None', 'Cleared target format is Target: None');

console.log('\n=== TEST 6: Pass/Fail Evaluation Rules ===');
// Grade-based
assert(evaluatePassFail('A', 'Grade-based') === true, 'Grade A is PASS');
assert(evaluatePassFail('B', 'Grade-based') === true, 'Grade B is PASS');
assert(evaluatePassFail('C', 'Grade-based') === false, 'Grade C is FAIL');
assert(evaluatePassFail('D', 'Grade-based') === false, 'Grade D is FAIL');
assert(evaluatePassFail('F', 'Grade-based') === false, 'Grade F is FAIL');

// CGPA-based
assert(evaluatePassFail(4.00, 'CGPA-based') === true, 'CGPA 4.00 is PASS');
assert(evaluatePassFail(3.75, 'CGPA-based') === true, 'CGPA 3.75 is PASS');
assert(evaluatePassFail(3.50, 'CGPA-based') === true, 'CGPA 3.50 is PASS');
assert(evaluatePassFail(3.25, 'CGPA-based') === true, 'CGPA 3.25 is PASS');
assert(evaluatePassFail(3.00, 'CGPA-based') === true, 'CGPA 3.00 is PASS');
assert(evaluatePassFail(2.75, 'CGPA-based') === true, 'CGPA 2.75 is PASS');
assert(evaluatePassFail(2.50, 'CGPA-based') === true, 'CGPA 2.50 is PASS');
assert(evaluatePassFail(2.25, 'CGPA-based') === true, 'CGPA 2.25 is PASS');
assert(evaluatePassFail(2.00, 'CGPA-based') === true, 'CGPA 2.00 is PASS');
assert(evaluatePassFail(1.99, 'CGPA-based') === false, 'CGPA 1.99 is FAIL');
assert(evaluatePassFail(1.00, 'CGPA-based') === false, 'CGPA 1.00 is FAIL');
assert(evaluatePassFail(0.00, 'CGPA-based') === false, 'CGPA 0.00 is FAIL');

console.log('\n=== TEST 7: Goal Met Evaluation Rules ===');
const curSubjects = [
  { id: 'sub_far', name: 'FAR' },
  { id: 'sub_audit', name: 'Audit Assurance' },
];

const passGrades: SubjectGradeEntry[] = [
  { subjectId: 'sub_far', subjectName: 'FAR', targetScore: 'A (4.00)', actualScore: 'B (3.00)', actualCgpa: 3.00, isPassed: true },
  { subjectId: 'sub_audit', subjectName: 'Audit Assurance', targetScore: 'A (4.00)', actualScore: 'B (3.00)', actualCgpa: 3.00, isPassed: true },
];

// Met when all passed and actual reaches target
const metResult = evaluateGoalMet({
  allCurriculumSubjects: curSubjects,
  subjectGrades: passGrades,
  actualCgpa: 3.20,
  targetCgpa: 3.00,
  evalType: 'CGPA-based',
});
assert(metResult.isMet === true, 'Goal Met when all subjects passed and actual 3.20 >= target 3.00');

// Not Met when actual is below target
const notMetTarget = evaluateGoalMet({
  allCurriculumSubjects: curSubjects,
  subjectGrades: passGrades,
  actualCgpa: 3.20,
  targetCgpa: 3.50,
  evalType: 'CGPA-based',
});
assert(notMetTarget.isMet === false, 'Not Met when actual 3.20 < target 3.50');

// Not Met when any subject failed
const failGrades: SubjectGradeEntry[] = [
  { subjectId: 'sub_far', subjectName: 'FAR', targetScore: 'A (4.00)', actualScore: 'B (3.00)', actualCgpa: 3.00, isPassed: true },
  { subjectId: 'sub_audit', subjectName: 'Audit Assurance', targetScore: 'A (4.00)', actualScore: 'C (2.00)', actualCgpa: 2.00, isPassed: false },
];
const notMetFailedSub = evaluateGoalMet({
  allCurriculumSubjects: curSubjects,
  subjectGrades: failGrades,
  actualCgpa: 3.80,
  targetCgpa: 3.50,
  evalType: 'CGPA-based',
});
assert(notMetFailedSub.isMet === false, 'Not Met when a constituent subject failed, even if overall is high');

// Not Met when a curriculum subject is missing / unattempted
const incompleteGrades: SubjectGradeEntry[] = [
  { subjectId: 'sub_far', subjectName: 'FAR', targetScore: 'A (4.00)', actualScore: 'B (3.00)', actualCgpa: 3.00, isPassed: true },
];
const notMetMissing = evaluateGoalMet({
  allCurriculumSubjects: curSubjects,
  subjectGrades: incompleteGrades,
  actualCgpa: 4.00,
  targetCgpa: 3.50,
  evalType: 'CGPA-based',
});
assert(notMetMissing.isMet === false, 'Not Met when a curriculum subject is missing');

console.log('\n=== TEST 8: Pass / Freeze is Independent and Fully Manual ===');
const allCurSubs = [
  { id: 'sub_far', programId: 'prog_pl', name: 'FAR' },
  { id: 'sub_audit', programId: 'prog_pl', name: 'Audit Assurance' },
];

const passedResult: ProgramResult = {
  id: 'res_1',
  resultType: 'Program CGPA',
  programId: 'prog_pl',
  programName: 'PL',
  evaluationOption: 'CGPA-based',
  targetCgpa: 3.50,
  actualCgpa: 3.20,
  isMet: false,
  isPassed: true, // Passed program
  isEstimated: true,
  subjectGrades: passGrades,
  date: '2026-10-11',
  createdAt: '2026-10-11T00:00:00Z',
};

const manualFreeze: FreezeConfiguration = {
  frozenProgramIds: ['prog_cl'],
  frozenSubjectIds: ['sub_acc'],
  manualFrozenProgramIds: ['prog_cl'],
  manualFrozenSubjectIds: ['sub_acc'],
};

// 1. Pass / Freeze config is NOT automatically altered by logged results
const synced1 = syncPassFreezeFromResults({
  results: [passedResult],
  programs: dummyPrograms,
  subjects: allCurSubs,
  currentFreezeConfig: manualFreeze,
});
assert(!synced1.frozenProgramIds.includes('prog_pl'), 'Program is NOT automatically frozen on PASS result');
assert(!synced1.frozenSubjectIds.includes('sub_far'), 'Constituent subject is NOT automatically frozen on PASS result');
assert(synced1.frozenProgramIds.includes('prog_cl'), 'Manual frozen program remains preserved');
assert(synced1.frozenSubjectIds.includes('sub_acc'), 'Manual frozen subject remains preserved');
console.log('PASS: Logged results do not modify pass freeze configuration');

// 2. Failed result also does not alter manual pass freeze config
const failedResult: ProgramResult = {
  ...passedResult,
  isPassed: false,
  subjectGrades: passGrades.map(g => ({ ...g, isPassed: false })),
};

const synced2 = syncPassFreezeFromResults({
  results: [failedResult],
  programs: dummyPrograms,
  subjects: allCurSubs,
  currentFreezeConfig: manualFreeze,
});
assert(synced2.frozenProgramIds.includes('prog_cl'), 'Manual frozen program is unchanged');
assert(synced2.frozenSubjectIds.includes('sub_acc'), 'Manual frozen subject is unchanged');
console.log('PASS: Failed results do not modify pass freeze configuration');

console.log('\n=== TEST 9: Bidirectional Program / Subject Freeze Invariant ===');
const testSubs = [
  { id: 'sub_acc', programId: 'prog_cl', name: 'Accounting CL' },
  { id: 'sub_ass', programId: 'prog_cl', name: 'ASSURANCE' },
  { id: 'sub_it', programId: 'prog_cl', name: 'IT' },
  { id: 'sub_mi', programId: 'prog_cl', name: 'MI' },
];

// 1. Mark program as passed -> all constituent subjects inside the program also passed
const progPassRec = reconcileProgramSubjectFreeze({
  programIds: [],
  subjectIds: [],
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_PROGRAM',
    programId: 'prog_cl',
    isNowPassed: true,
  },
});
assert(progPassRec.frozenProgramIds.includes('prog_cl'), 'Program is marked as passed');
assert(
  testSubs.every((s) => progPassRec.frozenSubjectIds.includes(s.id)),
  'All 4 subjects inside program are marked as passed when program is marked as passed'
);

// 2. Unmark one subject -> program is no longer marked as passed
const unmarkOneSub = reconcileProgramSubjectFreeze({
  programIds: progPassRec.frozenProgramIds,
  subjectIds: progPassRec.frozenSubjectIds,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_SUBJECT',
    subjectId: 'sub_it',
    isNowPassed: false,
  },
});
assert(!unmarkOneSub.frozenProgramIds.includes('prog_cl'), 'Program is unmarked when any subject is unfrozen');
assert(!unmarkOneSub.frozenSubjectIds.includes('sub_it'), 'Subject sub_it is unfrozen');
assert(unmarkOneSub.frozenSubjectIds.includes('sub_acc'), 'Other subjects remain frozen');

// 3. Mark the missing subject back -> all subjects passed -> program marked as passed
const markBackSub = reconcileProgramSubjectFreeze({
  programIds: unmarkOneSub.frozenProgramIds,
  subjectIds: unmarkOneSub.frozenSubjectIds,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_SUBJECT',
    subjectId: 'sub_it',
    isNowPassed: true,
  },
});
assert(markBackSub.frozenProgramIds.includes('prog_cl'), 'Program is marked as passed when all subjects become passed');
assert(
  testSubs.every((s) => markBackSub.frozenSubjectIds.includes(s.id)),
  'All subjects are passed'
);

// 4. Unmark program -> all constituent subjects inside the program are unpassed
const unmarkProgRec = reconcileProgramSubjectFreeze({
  programIds: markBackSub.frozenProgramIds,
  subjectIds: markBackSub.frozenSubjectIds,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_PROGRAM',
    programId: 'prog_cl',
    isNowPassed: false,
  },
});
assert(!unmarkProgRec.frozenProgramIds.includes('prog_cl'), 'Program is unpassed');
assert(
  testSubs.every((s) => !unmarkProgRec.frozenSubjectIds.includes(s.id)),
  'All constituent subjects are unpassed when program is unmarked'
);

console.log('\n=== TEST 10: Undo Mistaken Program Pass Restores Previously Passed Subjects ===');
// 1. Initial state: 2 subjects passed, 2 not passed, program not passed
const initial2Passed = ['sub_acc', 'sub_ass'];
const step1 = reconcileProgramSubjectFreeze({
  programIds: [],
  subjectIds: initial2Passed,
  manualSubjectIds: initial2Passed,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
});
assert(!step1.frozenProgramIds.includes('prog_cl'), 'Program is not passed when only 2 of 4 subjects are passed');
assert(step1.frozenSubjectIds.includes('sub_acc') && step1.frozenSubjectIds.includes('sub_ass'), '2 subjects are passed');
assert(!step1.frozenSubjectIds.includes('sub_it') && !step1.frozenSubjectIds.includes('sub_mi'), '2 subjects are not passed');

// 2. Mistakenly mark program as passed
const step2 = reconcileProgramSubjectFreeze({
  programIds: step1.frozenProgramIds,
  subjectIds: step1.frozenSubjectIds,
  manualProgramIds: step1.manualFrozenProgramIds,
  manualSubjectIds: step1.manualFrozenSubjectIds,
  preProgramFrozenSubjectIds: step1.preProgramFrozenSubjectIds,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_PROGRAM',
    programId: 'prog_cl',
    isNowPassed: true,
  },
});
assert(step2.frozenProgramIds.includes('prog_cl'), 'Program is passed after clicking program switch');
assert(
  testSubs.every((s) => step2.frozenSubjectIds.includes(s.id)),
  'All 4 subjects are now passed because program was marked passed'
);

// 3. User undoes the program mark -> toggles program to NOT passed
const step3 = reconcileProgramSubjectFreeze({
  programIds: step2.frozenProgramIds,
  subjectIds: step2.frozenSubjectIds,
  manualProgramIds: step2.manualFrozenProgramIds,
  manualSubjectIds: step2.manualFrozenSubjectIds,
  preProgramFrozenSubjectIds: step2.preProgramFrozenSubjectIds,
  programs: [{ id: 'prog_cl', name: 'CL' }],
  subjects: testSubs,
  prioritizedAction: {
    type: 'TOGGLE_PROGRAM',
    programId: 'prog_cl',
    isNowPassed: false,
  },
});
assert(!step3.frozenProgramIds.includes('prog_cl'), 'Program is NOT passed after undoing');
assert(step3.frozenSubjectIds.includes('sub_acc'), 'Subject 1 (Accounting CL) remains PASSED');
assert(step3.frozenSubjectIds.includes('sub_ass'), 'Subject 2 (ASSURANCE) remains PASSED');
assert(!step3.frozenSubjectIds.includes('sub_it'), 'Subject 3 (IT) is NOT passed');
assert(!step3.frozenSubjectIds.includes('sub_mi'), 'Subject 4 (MI) is NOT passed');

console.log('\n=== TEST 11: Subject Pass Chapter Auto-Completion and Reversal Preservation ===');
// A subject with 11 chapters: 2 skipped, 4 completed, 5 remaining
interface TestChapter {
  id: string;
  subjectId: string;
  isSkipped?: boolean;
  status?: string;
  completed?: boolean;
}

const chapters11: TestChapter[] = [
  // 2 skipped
  { id: 'ch_1', subjectId: 'sub_test', isSkipped: true, status: 'skipped', completed: false },
  { id: 'ch_2', subjectId: 'sub_test', isSkipped: true, status: 'skipped', completed: false },
  // 4 completed
  { id: 'ch_3', subjectId: 'sub_test', isSkipped: false, status: 'completed', completed: true },
  { id: 'ch_4', subjectId: 'sub_test', isSkipped: false, status: 'completed', completed: true },
  { id: 'ch_5', subjectId: 'sub_test', isSkipped: false, status: 'completed', completed: true },
  { id: 'ch_6', subjectId: 'sub_test', isSkipped: false, status: 'completed', completed: true },
  // 5 remaining
  { id: 'ch_7', subjectId: 'sub_test', isSkipped: false, status: 'pending', completed: false },
  { id: 'ch_8', subjectId: 'sub_test', isSkipped: false, status: 'pending', completed: false },
  { id: 'ch_9', subjectId: 'sub_test', isSkipped: false, status: 'pending', completed: false },
  { id: 'ch_10', subjectId: 'sub_test', isSkipped: false, status: 'pending', completed: false },
  { id: 'ch_11', subjectId: 'sub_test', isSkipped: false, status: 'pending', completed: false },
];

function simulateFreezeSubject(chapters: TestChapter[], subjectId: string) {
  const newlyCompleted: string[] = [];
  const updated = chapters.map(c => {
    if (c.subjectId === subjectId) {
      const isSkipped = Boolean(c.isSkipped || c.status === 'skipped');
      const isCompleted = Boolean(c.completed || c.status === 'completed');
      if (!isSkipped && !isCompleted) {
        newlyCompleted.push(c.id);
        return { ...c, completed: true, status: 'completed' };
      }
    }
    return c;
  });
  return { updated, newlyCompleted };
}

function simulateUnfreezeSubject(chapters: TestChapter[], revertChapterIds: string[]) {
  const revertSet = new Set(revertChapterIds);
  return chapters.map(c => {
    if (revertSet.has(c.id)) {
      return { ...c, completed: false, status: 'pending' };
    }
    return c;
  });
}

// 1. Initial State
const initSkipped = chapters11.filter(c => c.isSkipped || c.status === 'skipped').length;
const initCompleted = chapters11.filter(c => !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')).length;
const initPending = chapters11.filter(c => !c.isSkipped && c.status !== 'skipped' && !c.completed && c.status !== 'completed').length;
assert(initSkipped === 2, 'Initial state: 2 skipped');
assert(initCompleted === 4, 'Initial state: 4 completed');
assert(initPending === 5, 'Initial state: 5 pending');

// 2. Mark subject as passed in pass freeze configuration
const freezeRes = simulateFreezeSubject(chapters11, 'sub_test');
const frozenChapters = freezeRes.updated;
const autoCompletedIds = freezeRes.newlyCompleted;

assert(autoCompletedIds.length === 5, '5 chapters were auto-completed on pass freeze');
assert(autoCompletedIds.includes('ch_7') && autoCompletedIds.includes('ch_11'), 'Remaining chapters 7..11 were marked completed');

const postFreezeSkipped = frozenChapters.filter(c => c.isSkipped || c.status === 'skipped').length;
const postFreezeCompleted = frozenChapters.filter(c => !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')).length;
const postFreezePending = frozenChapters.filter(c => !c.isSkipped && c.status !== 'skipped' && !c.completed && c.status !== 'completed').length;

assert(postFreezeSkipped === 2, 'Status everywhere: 2 skip');
assert(postFreezeCompleted === 9, 'Status everywhere: 9 completed (4 original + 5 auto-completed)');
assert(postFreezePending === 0, 'Status everywhere: 0 pending / remaining');

// 3. Unmark subject (undo / un-freeze)
const unfrozenChapters = simulateUnfreezeSubject(frozenChapters, autoCompletedIds);

const postUndoSkipped = unfrozenChapters.filter(c => c.isSkipped || c.status === 'skipped').length;
const postUndoCompleted = unfrozenChapters.filter(c => !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')).length;
const postUndoPending = unfrozenChapters.filter(c => !c.isSkipped && c.status !== 'skipped' && !c.completed && c.status !== 'completed').length;

assert(postUndoSkipped === 2, 'Post undo: 2 skipped preserved');
assert(postUndoCompleted === 4, 'Post undo: 4 originally completed chapters preserved');
assert(postUndoPending === 5, 'Post undo: 5 chapters reverted to pending');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 12: Milestone Criteria Setup - Program & Subject Bidirectional Linking
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== TEST 12: Milestone Criteria Setup Program-Subject Linking ===');

const mockProg = { id: 'prog_cl', name: 'CL' };
const mockSubsInProg = [
  { id: 'sub_acc', name: 'Accounting CL', programId: 'prog_cl' },
  { id: 'sub_ass', name: 'ASSURANCE', programId: 'prog_cl' },
  { id: 'sub_it', name: 'IT', programId: 'prog_cl' },
  { id: 'sub_mi', name: 'MI', programId: 'prog_cl' },
];

// Helper functions matching SetupCelebrationCriteriaModal logic
function toggleProgramLogic(
  programId: string,
  currentProgIds: string[],
  currentSubIds: string[],
  subs: typeof mockSubsInProg
) {
  const progSubs = subs.filter(s => s.programId === programId);
  const subIds = progSubs.map(s => s.id);
  const isSelected = currentProgIds.includes(programId);

  if (isSelected) {
    return {
      progIds: currentProgIds.filter(id => id !== programId),
      subIds: currentSubIds.filter(id => !subIds.includes(id)),
    };
  } else {
    return {
      progIds: Array.from(new Set([...currentProgIds, programId])),
      subIds: Array.from(new Set([...currentSubIds, ...subIds])),
    };
  }
}

function toggleSubjectLogic(
  subjectId: string,
  programId: string,
  currentProgIds: string[],
  currentSubIds: string[],
  subs: typeof mockSubsInProg
) {
  const isSubSelected = currentSubIds.includes(subjectId);
  const progSubs = subs.filter(s => s.programId === programId);

  if (isSubSelected) {
    const nextSubs = currentSubIds.filter(id => id !== subjectId);
    const nextProgs = currentProgIds.filter(id => id !== programId);
    return { progIds: nextProgs, subIds: nextSubs };
  } else {
    const nextSubs = [...currentSubIds, subjectId];
    const allSelected = progSubs.every(s => s.id === subjectId || currentSubIds.includes(s.id));
    const nextProgs = allSelected ? Array.from(new Set([...currentProgIds, programId])) : currentProgIds;
    return { progIds: nextProgs, subIds: nextSubs };
  }
}

// 1. Initially none selected
let testProgIds: string[] = [];
let testSubIds: string[] = [];

// 2. Toggle program ON -> All constituent subjects become selected
const stepProgOn = toggleProgramLogic('prog_cl', testProgIds, testSubIds, mockSubsInProg);
assert(stepProgOn.progIds.includes('prog_cl'), 'Program is selected');
assert(stepProgOn.subIds.length === 4, 'All 4 subjects are selected when program is toggled on');
assert(mockSubsInProg.every(s => stepProgOn.subIds.includes(s.id)), 'Every constituent subject is selected');
console.log('PASS: Toggling program ON automatically selects all constituent subjects');

// 3. Unselect 1 subject -> Program becomes unselected, other 3 subjects remain selected
const stepUnselectOne = toggleSubjectLogic('sub_it', 'prog_cl', stepProgOn.progIds, stepProgOn.subIds, mockSubsInProg);
assert(!stepUnselectOne.progIds.includes('prog_cl'), 'Program is not selected when 1 subject is deselected');
assert(!stepUnselectOne.subIds.includes('sub_it'), 'sub_it is deselected');
assert(stepUnselectOne.subIds.includes('sub_acc') && stepUnselectOne.subIds.includes('sub_ass') && stepUnselectOne.subIds.includes('sub_mi'), 'Other 3 subjects stay selected');
console.log('PASS: Deselecting 1 subject unselects program while keeping remaining subjects selected');

// 4. Select the missing subject back -> Program automatically becomes selected!
const stepSelectBack = toggleSubjectLogic('sub_it', 'prog_cl', stepUnselectOne.progIds, stepUnselectOne.subIds, mockSubsInProg);
assert(stepSelectBack.progIds.includes('prog_cl'), 'Program automatically becomes selected when all subjects are checked');
assert(stepSelectBack.subIds.length === 4, 'All 4 subjects are selected');
console.log('PASS: Re-selecting all subjects in program automatically re-selects the program');

// 5. Toggle program OFF -> All constituent subjects become deselected
const stepProgOff = toggleProgramLogic('prog_cl', stepSelectBack.progIds, stepSelectBack.subIds, mockSubsInProg);
assert(!stepProgOff.progIds.includes('prog_cl'), 'Program is deselected');
assert(stepProgOff.subIds.length === 0, 'All subjects are deselected');
console.log('PASS: Toggling program OFF automatically deselects all constituent subjects');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 13: Milestone Criteria & Pass Freeze Configuration Connection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== TEST 13: Pass Freeze Config to Milestone Criteria Connection ===');

function evaluateMilestoneCelebration(
  criteria: { requiredProgramIds: string[]; requiredSubjectIds: string[]; isCustomized: boolean },
  freeze: { frozenProgramIds: string[]; frozenSubjectIds: string[] },
  subs: typeof mockSubsInProg
) {
  const reqSubs = new Set<string>(criteria.requiredSubjectIds || []);
  (criteria.requiredProgramIds || []).forEach(pid => {
    subs.filter(s => s.programId === pid).forEach(s => reqSubs.add(s.id));
  });

  const frozenSubs = new Set<string>(freeze.frozenSubjectIds || []);
  (freeze.frozenProgramIds || []).forEach(pid => {
    subs.filter(s => s.programId === pid).forEach(s => frozenSubs.add(s.id));
  });

  if (reqSubs.size === 0) return false;
  return Array.from(reqSubs).every(sid => frozenSubs.has(sid));
}

// Criteria requires sub_acc and sub_mi
const customCriteria = {
  requiredProgramIds: [],
  requiredSubjectIds: ['sub_acc', 'sub_mi'],
  isCustomized: true,
};

// 1. Only sub_acc is frozen -> Criteria not met
const freezePartial = { frozenProgramIds: [], frozenSubjectIds: ['sub_acc'] };
assert(!evaluateMilestoneCelebration(customCriteria, freezePartial, mockSubsInProg), 'Celebration not triggered when only 1 of 2 required subjects is frozen');
console.log('PASS: Partial freeze does not trigger celebration');

// 2. Both sub_acc and sub_mi are frozen in Pass Freeze Configuration -> CELEBRATION TRIGGERED!
const freezeComplete = { frozenProgramIds: [], frozenSubjectIds: ['sub_acc', 'sub_mi'] };
assert(evaluateMilestoneCelebration(customCriteria, freezeComplete, mockSubsInProg), 'Celebration IS triggered when all required subjects are frozen');
console.log('PASS: Milestone Celebration triggers when all required criteria are marked as passed/frozen');

// 3. Criteria requires entire program CL, and program CL is marked passed in freeze config
const programCriteria = {
  requiredProgramIds: ['prog_cl'],
  requiredSubjectIds: [],
  isCustomized: true,
};
const freezeProgram = { frozenProgramIds: ['prog_cl'], frozenSubjectIds: ['sub_acc', 'sub_ass', 'sub_it', 'sub_mi'] };
assert(evaluateMilestoneCelebration(programCriteria, freezeProgram, mockSubsInProg), 'Celebration IS triggered when required program is frozen');
console.log('PASS: Milestone Celebration triggers when required program is marked as passed in freeze config');

console.log('\n=== TEST 14: Logged Results Sort Order Options & Persistence ===');
const validSorts: import('../types').OutcomeSortOption[] = ['NEWEST', 'OLDEST', 'CGPA_HIGH', 'CGPA_LOW'];
validSorts.forEach(sortOpt => {
  assert(['NEWEST', 'OLDEST', 'CGPA_HIGH', 'CGPA_LOW'].includes(sortOpt), `Valid sort option ${sortOpt}`);
});

// Test sort cycling sequence
function getNextSort(current: import('../types').OutcomeSortOption): import('../types').OutcomeSortOption {
  if (current === 'NEWEST') return 'OLDEST';
  if (current === 'OLDEST') return 'CGPA_HIGH';
  if (current === 'CGPA_HIGH') return 'CGPA_LOW';
  return 'NEWEST';
}
assert(getNextSort('NEWEST') === 'OLDEST', 'NEWEST cycles to OLDEST');
assert(getNextSort('OLDEST') === 'CGPA_HIGH', 'OLDEST cycles to CGPA_HIGH');
assert(getNextSort('CGPA_HIGH') === 'CGPA_LOW', 'CGPA_HIGH cycles to CGPA_LOW');
assert(getNextSort('CGPA_LOW') === 'NEWEST', 'CGPA_LOW cycles to NEWEST');

// Test persistence serialization
const serializedSort = JSON.stringify({ sortBy: 'CGPA_HIGH' });
const parsedSort = JSON.parse(serializedSort);
assert(parsedSort.sortBy === 'CGPA_HIGH', 'Sort order serializes and deserializes accurately');
console.log('PASS: Logged results sorting options cycle correctly and serialize safely');

console.log('\nALL WORKFLOW AND EVALUATION TESTS PASSED SUCCESSFULLY!');


