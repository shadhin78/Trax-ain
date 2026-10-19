/**
 * Comprehensive verification of Unified Two-Way Chapter Completion across all pages.
 * Validates Scenarios 1-6 from user specifications.
 */

import assert from 'assert';
import { Chapter, Subject, Program, Track } from '../src/types/academic';
import { MonthlyTarget, WeeklyTarget } from '../src/features/daily-actions/types';
import {
  matchSubject,
  resolveTargetChapterId,
  resolveTargetChapterIds,
  isChapterCanonicallyComplete,
  reconcileTargetsWithChapters,
  syncChapterCompletionAcrossTargets,
} from '../src/features/daily-actions/utils/chapterTargetSync';

console.log('🧪 Starting X-29 Unified Chapter Completion Verification Suite...\n');

// Mock Academic Hierarchy
const testTracks = [{ id: 'tr_1', name: 'Commerce & Law Track', order: 1, createdAt: '' }] as Track[];
const testPrograms = [{ id: 'pr_1', trackId: 'tr_1', name: 'Professional Stage', order: 1, createdAt: '' }] as Program[];
const testSubjects = [
  { id: 'sb_mi', trackId: 'tr_1', programId: 'pr_1', name: 'Management Information', order: 1, createdAt: '' },
  { id: 'sb_law', trackId: 'tr_1', programId: 'pr_1', name: 'Corporate Law', order: 2, createdAt: '' },
  { id: 'sb_tax', trackId: 'tr_1', programId: 'pr_1', name: 'Taxation', order: 3, createdAt: '' },
] as Subject[];

const testChapters = [
  // Subject 1: MI
  { id: 'ch_mi_1', subjectId: 'sb_mi', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '1', title: 'Cost Classification', topicName: 'Cost Classification', status: 'pending', completed: false },
  { id: 'ch_mi_2', subjectId: 'sb_mi', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '2', title: 'Cost Accounting', topicName: 'Cost Accounting', status: 'pending', completed: false },
  { id: 'ch_mi_3', subjectId: 'sb_mi', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '3', title: 'Budgeting & Variances', topicName: 'Budgeting', status: 'pending', completed: false },
  { id: 'ch_mi_4_skip', subjectId: 'sb_mi', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '4', title: 'Obsolete System', topicName: 'Obsolete', status: 'skipped', completed: false, isSkipped: true },

  // Subject 2: Corporate Law (note: has Chapter 1 as well! Must not collide with MI Ch 1)
  { id: 'ch_law_1', subjectId: 'sb_law', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '1', title: 'Company Formation', topicName: 'Company Formation', status: 'pending', completed: false },
  { id: 'ch_law_2', subjectId: 'sb_law', programId: 'pr_1', trackId: 'tr_1', chapterNumber: '2', title: 'Directors Duties', topicName: 'Directors Duties', status: 'pending', completed: false },
] as Chapter[];

// Initial Targets
let monthlyTargets: MonthlyTarget[] = [
  {
    id: 'mt_1',
    monthKey: '2026-10',
    title: 'Management Information Ch 1',
    targetCount: 1,
    completedCount: 0,
    unitLabel: 'Chapters',
    track: 'Management Information',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mt_2_multi',
    monthKey: '2026-10',
    title: 'MI Ch 1-3 (3 Chapters)',
    targetCount: 3,
    completedCount: 0,
    unitLabel: 'Chapters',
    track: 'Management Information',
    notes: 'Selected chapters: Ch 1: Cost Classification, Ch 2: Cost Accounting, Ch 3: Budgeting',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mt_law_1',
    monthKey: '2026-10',
    title: 'Corporate Law Ch 1: Company Formation',
    targetCount: 1,
    completedCount: 0,
    unitLabel: 'Chapters',
    track: 'Corporate Law',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  }
];

let weeklyTargets: WeeklyTarget[] = [
  {
    id: 'wt_1',
    weekKey: '2026-W41',
    title: 'Management Information Ch 1',
    targetCount: 1,
    completedCount: 0,
    unitLabel: 'Chapters',
    track: 'Management Information',
    chapterId: 'ch_mi_1',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wt_law_1',
    weekKey: '2026-W41',
    title: 'Corporate Law Ch 1',
    targetCount: 1,
    completedCount: 0,
    unitLabel: 'Chapters',
    track: 'Corporate Law',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  }
];

// -------------------------------------------------------------
// TEST 1: Subject Isolation (Short names vs substring matches)
// -------------------------------------------------------------
console.log('--- Test 1: Subject Resolution & Cross-Subject Isolation ---');
const matchedMI = matchSubject('MI', undefined, testSubjects);
assert.strictEqual(matchedMI?.id, 'sb_mi', 'MI correctly matched Management Information');

const matchedLaw = matchSubject('Corporate Law', undefined, testSubjects);
assert.strictEqual(matchedLaw?.id, 'sb_law', 'Corporate Law correctly matched');

const resolvedMICh1 = resolveTargetChapterId(monthlyTargets[0], testChapters, testSubjects);
assert.strictEqual(resolvedMICh1, 'ch_mi_1', 'Target for MI Ch 1 resolved strictly to ch_mi_1');

const resolvedLawCh1 = resolveTargetChapterId(monthlyTargets[2], testChapters, testSubjects);
assert.strictEqual(resolvedLawCh1, 'ch_law_1', 'Target for Law Ch 1 resolved strictly to ch_law_1, NOT ch_mi_1');
console.log('✅ Subject resolution and cross-subject isolation verified.\n');

// -------------------------------------------------------------
// SCENARIO 1: Complete a chapter in Monthly Targets
// -------------------------------------------------------------
console.log('--- Scenario 1: Complete Chapter in Monthly Targets ---');
// User clicks checkbox on monthly target mt_1 (MI Ch 1)
const chapToComplete = testChapters.find(c => c.id === resolvedMICh1)!;
assert.strictEqual(isChapterCanonicallyComplete(chapToComplete), false);

// 1. Update canonical chapter status
chapToComplete.completed = true;
chapToComplete.status = 'completed';
assert.strictEqual(isChapterCanonicallyComplete(chapToComplete), true);

// 2. Synchronize targets across Weekly and Monthly
const sync1 = syncChapterCompletionAcrossTargets({
  chapterId: 'ch_mi_1',
  isCompleted: true,
  monthlyTargets,
  weeklyTargets,
  chapters: testChapters,
  subjects: testSubjects,
});

monthlyTargets = sync1.nextMonthly;
weeklyTargets = sync1.nextWeekly;

// Verify Monthly Target 1 is completed
const mt1 = monthlyTargets.find(t => t.id === 'mt_1')!;
assert.strictEqual(mt1.isCompleted, true, 'Monthly Target mt_1 marked complete');
assert.strictEqual(mt1.completedCount, 1);

// Verify Weekly Target 1 is automatically completed
const wt1 = weeklyTargets.find(t => t.id === 'wt_1')!;
assert.strictEqual(wt1.isCompleted, true, 'Weekly Target wt_1 automatically marked complete');
assert.strictEqual(wt1.completedCount, 1);

// Verify Corporate Law Ch 1 was NOT affected
const mtLaw = monthlyTargets.find(t => t.id === 'mt_law_1')!;
assert.strictEqual(mtLaw.isCompleted, false, 'Corporate Law Ch 1 remained incomplete');

// Verify Multi-Chapter target progress updated (1 of 3 complete)
const mtMulti = monthlyTargets.find(t => t.id === 'mt_2_multi')!;
assert.strictEqual(mtMulti.completedCount, 1, 'Multi-chapter target progress incremented to 1');
assert.strictEqual(mtMulti.isCompleted, false, 'Multi-chapter target not marked complete until all finish');

console.log('✅ Scenario 1 passed: Monthly target completion propagates to Weekly, canonical chapter, and multi-targets without corrupting other subjects.\n');

// -------------------------------------------------------------
// SCENARIO 2: Complete a chapter in Weekly Targets
// -------------------------------------------------------------
console.log('--- Scenario 2: Complete Chapter in Weekly Targets ---');
// User clicks checkbox on weekly target wt_law_1 (Corporate Law Ch 1)
const lawChap = testChapters.find(c => c.id === 'ch_law_1')!;
lawChap.completed = true;
lawChap.status = 'completed';

const sync2 = syncChapterCompletionAcrossTargets({
  chapterId: 'ch_law_1',
  isCompleted: true,
  monthlyTargets,
  weeklyTargets,
  chapters: testChapters,
  subjects: testSubjects,
});

monthlyTargets = sync2.nextMonthly;
weeklyTargets = sync2.nextWeekly;

const wtLaw = weeklyTargets.find(t => t.id === 'wt_law_1')!;
assert.strictEqual(wtLaw.isCompleted, true, 'Weekly Target for Corporate Law marked complete');

const mtLawUpdated = monthlyTargets.find(t => t.id === 'mt_law_1')!;
assert.strictEqual(mtLawUpdated.isCompleted, true, 'Monthly Target for Corporate Law automatically updated to complete');

console.log('✅ Scenario 2 passed: Weekly target completion propagates to Monthly targets and canonical state.\n');

// -------------------------------------------------------------
// SCENARIO 3: Complete a chapter from the Subjects Page
// -------------------------------------------------------------
console.log('--- Scenario 3: Complete Chapter from Subjects Page ---');
// User toggles MI Ch 2 complete in Subjects Page
const miCh2 = testChapters.find(c => c.id === 'ch_mi_2')!;
miCh2.completed = true;
miCh2.status = 'completed';

// Reconcile targets
const recon3 = reconcileTargetsWithChapters({
  monthlyTargets,
  weeklyTargets,
  chapters: testChapters,
  subjects: testSubjects,
});

monthlyTargets = recon3.updatedMonthly;
weeklyTargets = recon3.updatedWeekly;

const mtMultiAfterCh2 = monthlyTargets.find(t => t.id === 'mt_2_multi')!;
assert.strictEqual(mtMultiAfterCh2.completedCount, 2, 'Multi-chapter target progress automatically updated to 2/3');
assert.strictEqual(mtMultiAfterCh2.isCompleted, false);

console.log('✅ Scenario 3 passed: Subjects page toggle propagates to Weekly/Monthly targets & progress.\n');

// -------------------------------------------------------------
// SCENARIO 4: Reopen a Completed Chapter & Preserve Skipped
// -------------------------------------------------------------
console.log('--- Scenario 4: Reopen Completed Chapter & Preserve Skipped Status ---');
// User reopens MI Ch 1
chapToComplete.completed = false;
chapToComplete.status = 'pending';

const sync4 = syncChapterCompletionAcrossTargets({
  chapterId: 'ch_mi_1',
  isCompleted: false,
  monthlyTargets,
  weeklyTargets,
  chapters: testChapters,
  subjects: testSubjects,
});

monthlyTargets = sync4.nextMonthly;
weeklyTargets = sync4.nextWeekly;

const mt1Reopened = monthlyTargets.find(t => t.id === 'mt_1')!;
assert.strictEqual(mt1Reopened.isCompleted, false, 'Monthly target reopened');
assert.strictEqual(mt1Reopened.completedCount, 0);

const wt1Reopened = weeklyTargets.find(t => t.id === 'wt_1')!;
assert.strictEqual(wt1Reopened.isCompleted, false, 'Weekly target reopened');
assert.strictEqual(wt1Reopened.completedCount, 0);

// Check skipped chapter integrity
const skippedChap = testChapters.find(c => c.id === 'ch_mi_4_skip')!;
assert.strictEqual(skippedChap.isSkipped, true);
assert.strictEqual(skippedChap.status, 'skipped');
assert.strictEqual(isChapterCanonicallyComplete(skippedChap), false, 'Skipped chapter is NEVER marked complete');

console.log('✅ Scenario 4 passed: Reopening chapter consistently updates all views; skipped chapters remain untouched.\n');

// -------------------------------------------------------------
// SCENARIO 5: Subject Completion
// -------------------------------------------------------------
console.log('--- Scenario 5: Subject Completion Toggle & Derived State ---');
// Active non-skipped chapters for Law: [ch_law_1, ch_law_2]
const activeLawChaps = testChapters.filter(c => c.subjectId === 'sb_law' && !c.isSkipped);
assert.strictEqual(activeLawChaps.length, 2);

// Currently ch_law_1 is complete, ch_law_2 is pending -> subject not all complete
const isLawAllCompleteBefore = activeLawChaps.every(c => c.completed || c.status === 'completed');
assert.strictEqual(isLawAllCompleteBefore, false, 'Subject is not all complete yet');

// Now mark ch_law_2 complete
const lawCh2 = testChapters.find(c => c.id === 'ch_law_2')!;
lawCh2.completed = true;
lawCh2.status = 'completed';

// Derived check:
const isLawAllCompleteAfter = activeLawChaps.every(c => c.completed || c.status === 'completed');
assert.strictEqual(isLawAllCompleteAfter, true, 'Subject is now derived complete automatically');

console.log('✅ Scenario 5 passed: Derived subject completion updates dynamically.\n');

// -------------------------------------------------------------
// SCENARIO 6: Multi-Chapter Target Complete
// -------------------------------------------------------------
console.log('--- Scenario 6: Multi-Chapter Target Full Completion ---');
// Mark MI Ch 1, 2, 3 complete
testChapters.find(c => c.id === 'ch_mi_1')!.completed = true;
testChapters.find(c => c.id === 'ch_mi_1')!.status = 'completed';
testChapters.find(c => c.id === 'ch_mi_2')!.completed = true;
testChapters.find(c => c.id === 'ch_mi_2')!.status = 'completed';
testChapters.find(c => c.id === 'ch_mi_3')!.completed = true;
testChapters.find(c => c.id === 'ch_mi_3')!.status = 'completed';

const recon6 = reconcileTargetsWithChapters({
  monthlyTargets,
  weeklyTargets,
  chapters: testChapters,
  subjects: testSubjects,
});

const mtMultiComplete = recon6.updatedMonthly.find(t => t.id === 'mt_2_multi')!;
assert.strictEqual(mtMultiComplete.completedCount, 3, 'All 3 chapters counted');
assert.strictEqual(mtMultiComplete.isCompleted, true, 'Multi-chapter target marked complete when all chapters complete');

console.log('✅ Scenario 6 passed: Multi-chapter target completes when all referenced chapters complete.\n');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🎉 ALL 6 TWO-WAY COMPLETION INTEGRATION SCENARIOS PASSED WITH 100% SUCCESS!');
console.log('═══════════════════════════════════════════════════════════════════');
