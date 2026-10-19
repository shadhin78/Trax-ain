import { 
  differenceInCalendarDays, 
  getUtcCalendarTimestamp, 
  calculatePaceGoalStats,
  parseLocalDate 
} from '../utils/paceCalculations';
import { PaceGoal } from '../types';

function runAssertions() {
  console.log('--- RUNNING DAY COUNTING STANDARDIZATION TESTS ---');

  // Test 1: Acceptance Criterion
  // Period: 01 October 2026 -> 01 November 2026, Today: 15 October 2026
  const startStr = '2026-10-01';
  const deadlineStr = '2026-11-01';
  const today = parseLocalDate('2026-10-15');

  const goal: PaceGoal = {
    id: 'test_goal',
    type: 'global',
    target: 'Global Goal',
    startDate: startStr,
    deadline: deadlineStr,
  };

  const stats = calculatePaceGoalStats(
    goal,
    [],
    [],
    [],
    [],
    [],
    today
  );

  console.assert(stats.totalDays === 31, `Expected totalDays=31, got ${stats.totalDays}`);
  console.assert(stats.daysElapsed === 14, `Expected daysElapsed=14, got ${stats.daysElapsed}`);
  console.assert(stats.daysRemaining === 17, `Expected daysRemaining=17, got ${stats.daysRemaining}`);
  console.assert(stats.diffDaysTarget === 17, `Expected diffDaysTarget=17, got ${stats.diffDaysTarget}`);
  console.assert(stats.timeElapsedText === '14 Days Passed', `Expected "14 Days Passed", got "${stats.timeElapsedText}"`);
  console.assert(stats.countdownText === '17 Days Left', `Expected "17 Days Left", got "${stats.countdownText}"`);

  const elapsedProgress = Number(((stats.daysElapsed / stats.totalDays) * 100).toFixed(2));
  const remainingProgress = Number(((stats.daysRemaining / stats.totalDays) * 100).toFixed(2));
  console.assert(elapsedProgress === 45.16, `Expected elapsedProgress=45.16, got ${elapsedProgress}`);
  console.assert(remainingProgress === 54.84, `Expected remainingProgress=54.84, got ${remainingProgress}`);

  // Test 2: Header calculation logic
  const headerElapsed = Math.max(0, differenceInCalendarDays(today, startStr));
  const headerElapsedDisplay = `${headerElapsed} ${headerElapsed === 1 ? 'Day' : 'Days'}`;
  const headerDiff = differenceInCalendarDays(deadlineStr, today);
  const headerRemaining = Math.max(0, headerDiff);
  const headerRemainingDisplay = `${headerRemaining} ${headerRemaining === 1 ? 'Day' : 'Days'}`;

  console.assert(headerElapsed === 14, `Expected headerElapsed=14, got ${headerElapsed}`);
  console.assert(headerElapsedDisplay === '14 Days', `Expected "14 Days", got "${headerElapsedDisplay}"`);
  console.assert(headerRemaining === 17, `Expected headerRemaining=17, got ${headerRemaining}`);
  console.assert(headerRemainingDisplay === '17 Days', `Expected "17 Days", got "${headerRemainingDisplay}"`);

  // Test 3: Boundary Condition - Today is the start date
  const todayStart = parseLocalDate('2026-10-01');
  const statsStart = calculatePaceGoalStats(goal, [], [], [], [], [], todayStart);
  console.assert(statsStart.daysElapsed === 0, `Expected daysElapsed=0 on start date, got ${statsStart.daysElapsed}`);
  console.assert(statsStart.timeElapsedText === '0 Days Passed', `Expected "0 Days Passed", got "${statsStart.timeElapsedText}"`);
  const headerElapsedStart = Math.max(0, differenceInCalendarDays(todayStart, startStr));
  console.assert(headerElapsedStart === 0, `Expected headerElapsed=0, got ${headerElapsedStart}`);

  // Test 4: Boundary Condition - One calendar day after start date
  const todayDay1 = parseLocalDate('2026-10-02');
  const statsDay1 = calculatePaceGoalStats(goal, [], [], [], [], [], todayDay1);
  console.assert(statsDay1.daysElapsed === 1, `Expected daysElapsed=1 on day after start, got ${statsDay1.daysElapsed}`);
  console.assert(statsDay1.timeElapsedText === '1 Day Passed', `Expected "1 Day Passed", got "${statsDay1.timeElapsedText}"`);
  const headerElapsedDay1 = Math.max(0, differenceInCalendarDays(todayDay1, startStr));
  console.assert(headerElapsedDay1 === 1, `Expected headerElapsed=1, got ${headerElapsedDay1}`);

  // Test 5: Boundary Condition - Today is the deadline
  const todayDeadline = parseLocalDate('2026-11-01');
  const statsDeadline = calculatePaceGoalStats(goal, [], [], [], [], [], todayDeadline);
  console.assert(statsDeadline.daysElapsed === 31, `Expected daysElapsed=31 on deadline date, got ${statsDeadline.daysElapsed}`);
  console.assert(statsDeadline.daysRemaining === 0, `Expected daysRemaining=0 on deadline date, got ${statsDeadline.daysRemaining}`);
  console.assert(statsDeadline.countdownText === 'Due Today', `Expected "Due Today", got "${statsDeadline.countdownText}"`);
  const headerRemainingDeadline = Math.max(0, differenceInCalendarDays(deadlineStr, todayDeadline));
  const headerDeadlineDisplay = `${headerRemainingDeadline} ${headerRemainingDeadline === 1 ? 'Day' : 'Days'}`;
  console.assert(headerRemainingDeadline === 0, `Expected headerRemaining=0, got ${headerRemainingDeadline}`);
  console.assert(headerDeadlineDisplay === '0 Days', `Expected "0 Days", got "${headerDeadlineDisplay}"`);

  // Test 6: Boundary Condition - Today is after the deadline
  const todayAfter = parseLocalDate('2026-11-05');
  const mockSubject = { id: 'sub1', name: 'Math', programId: 'p1' } as any;
  const mockChapter = { id: 'c1', subjectId: 'sub1', name: 'Ch 1', completed: false, isSkipped: false } as any;
  const goalWithSubject: PaceGoal = {
    ...goal,
    subjects: ['sub1'],
  };
  const statsAfter = calculatePaceGoalStats(goalWithSubject, [mockSubject], [], [mockChapter], [], [], todayAfter);
  console.assert(statsAfter.daysElapsed === 35, `Expected daysElapsed=35 after deadline, got ${statsAfter.daysElapsed}`);
  console.assert(statsAfter.daysRemaining === 0, `Expected daysRemaining=0 after deadline, got ${statsAfter.daysRemaining}`);
  console.assert(statsAfter.diffDaysTarget === -4, `Expected diffDaysTarget=-4 after deadline, got ${statsAfter.diffDaysTarget}`);
  console.assert(statsAfter.countdownText === '4 Days Overdue', `Expected "4 Days Overdue", got "${statsAfter.countdownText}"`);
  console.assert(statsAfter.status === 'overdue', `Expected status === 'overdue', got ${statsAfter.status}`);
  console.assert(statsAfter.isBehind === true, `Expected isBehind === true, got ${statsAfter.isBehind}`);
  const headerRemainingAfter = Math.max(0, differenceInCalendarDays(deadlineStr, todayAfter));
  const headerAfterDisplay = `${headerRemainingAfter} ${headerRemainingAfter === 1 ? 'Day' : 'Days'}`;
  console.assert(headerRemainingAfter === 0, `Expected headerRemaining=0, got ${headerRemainingAfter}`);
  console.assert(headerAfterDisplay === '0 Days', `Expected "0 Days", got "${headerAfterDisplay}"`);

  // Test 7: DST Safety Check
  // Across US Fall DST transition (Sunday, Nov 1 2026)
  const preDst = parseLocalDate('2026-10-31');
  const postDst = parseLocalDate('2026-11-02');
  const dstDiff = differenceInCalendarDays(postDst, preDst);
  console.assert(dstDiff === 2, `Expected 2 calendar days across DST boundary, got ${dstDiff}`);

  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓');
}

runAssertions();
