/**
 * Verification test script for Weekly Saturday-to-Friday Range in Focus Analytics
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeWeeklyRanges(now: Date, numWeeks = 6) {
  // Days since Saturday: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const currentDaysSinceSat = (now.getDay() + 1) % 7;
  const currentWeekSat = new Date(now);
  currentWeekSat.setDate(now.getDate() - currentDaysSinceSat);
  currentWeekSat.setHours(0, 0, 0, 0);

  const ranges = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekStart = new Date(currentWeekSat);
    weekStart.setDate(currentWeekSat.getDate() - w * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startMon = MONTH_NAMES[weekStart.getMonth()];
    const startDay = weekStart.getDate();
    const endMon = MONTH_NAMES[weekEnd.getMonth()];
    const endDay = weekEnd.getDate();

    const rangeLabel = `${startMon} ${startDay} - ${endMon} ${endDay}`;

    ranges.push({
      w,
      weekStartStr: formatLocalDate(weekStart),
      weekEndStr: formatLocalDate(weekEnd),
      startDayOfWeek: weekStart.getDay(), // 6 is Saturday
      endDayOfWeek: weekEnd.getDay(), // 5 is Friday
      rangeLabel,
    });
  }

  return ranges;
}

function runTests() {
  console.log('=== RUNNING WEEKLY SAT-FRI RANGE TEST SUITE ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Current date: 2026-10-17 (Saturday)
  const dateSat = new Date(2026, 9, 17); // Oct 17, 2026
  const ranges = computeWeeklyRanges(dateSat, 6);

  assert(ranges.length === 6, 'Test 1.1: Returns 6 weekly ranges for 30D');

  // Verify all week starts are Saturday (getDay() === 6)
  const allStartsSat = ranges.every((r) => r.startDayOfWeek === 6);
  assert(allStartsSat, 'Test 1.2: All weekStart dates are Saturday (day 6)');

  // Verify all week ends are Friday (getDay() === 5)
  const allEndsFri = ranges.every((r) => r.endDayOfWeek === 5);
  assert(allEndsFri, 'Test 1.3: All weekEnd dates are Friday (day 5)');

  // Check expected labels matching screenshot:
  // Sep 12 - Sep 18, Sep 19 - Sep 25, Sep 26 - Oct 2, Oct 3 - Oct 9, Oct 10 - Oct 16, Oct 17 - Oct 23
  const expectedLabels = [
    'Sep 12 - Sep 18',
    'Sep 19 - Sep 25',
    'Sep 26 - Oct 2',
    'Oct 3 - Oct 9',
    'Oct 10 - Oct 16',
    'Oct 17 - Oct 23',
  ];

  for (let i = 0; i < 6; i++) {
    assert(
      ranges[i].rangeLabel === expectedLabels[i],
      `Test 1.4.${i}: Week ${i} matches screenshot label: '${expectedLabels[i]}' (Got: '${ranges[i].rangeLabel}')`
    );
  }

  // TEST 2: Mid-week date: 2026-10-21 (Wednesday)
  const dateWed = new Date(2026, 9, 21); // Oct 21, 2026 (Wednesday)
  const rangesWed = computeWeeklyRanges(dateWed, 6);
  assert(
    rangesWed[5].rangeLabel === 'Oct 17 - Oct 23',
    'Test 2.1: On Wednesday Oct 21, current week still spans Sat Oct 17 - Fri Oct 23'
  );
  assert(rangesWed[5].startDayOfWeek === 6, 'Test 2.2: Week start is Saturday');
  assert(rangesWed[5].endDayOfWeek === 5, 'Test 2.3: Week end is Friday');

  // TEST 3: Friday date: 2026-10-23 (Friday)
  const dateFri = new Date(2026, 9, 23); // Oct 23, 2026 (Friday)
  const rangesFri = computeWeeklyRanges(dateFri, 6);
  assert(
    rangesFri[5].rangeLabel === 'Oct 17 - Oct 23',
    'Test 3.1: On Friday Oct 23, current week is still Sat Oct 17 - Fri Oct 23'
  );

  // TEST 4: Sunday date: 2026-10-18 (Sunday)
  const dateSun = new Date(2026, 9, 18); // Oct 18, 2026 (Sunday)
  const rangesSun = computeWeeklyRanges(dateSun, 6);
  assert(
    rangesSun[5].rangeLabel === 'Oct 17 - Oct 23',
    'Test 4.1: On Sunday Oct 18, current week started yesterday Sat Oct 17 and ends Fri Oct 23'
  );

  // TEST 5: Next Saturday date: 2026-10-24 (Next Saturday)
  const dateNextSat = new Date(2026, 9, 24); // Oct 24, 2026 (Saturday)
  const rangesNextSat = computeWeeklyRanges(dateNextSat, 6);
  assert(
    rangesNextSat[5].rangeLabel === 'Oct 24 - Oct 30',
    'Test 5.1: On next Saturday Oct 24, new week begins: Oct 24 - Oct 30'
  );
  assert(
    rangesNextSat[4].rangeLabel === 'Oct 17 - Oct 23',
    'Test 5.2: Previous week was Oct 17 - Oct 23'
  );

  // TEST 6: SessionHistoryTable / FocusTelemetrySidebar dayOfWeek calculation
  // (now.getDay() + 1) % 7
  assert((dateSat.getDay() + 1) % 7 === 0, 'Test 6.1: Saturday is 0 days offset');
  assert((dateSun.getDay() + 1) % 7 === 1, 'Test 6.2: Sunday is 1 day offset');
  assert((dateWed.getDay() + 1) % 7 === 4, 'Test 6.3: Wednesday is 4 days offset');
  assert((dateFri.getDay() + 1) % 7 === 6, 'Test 6.4: Friday is 6 days offset');

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
}

runTests();
