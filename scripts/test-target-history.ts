/**
 * Verification test script for Historical Focus Target Tracking in X-29
 */

import {
  sortTargetHistory,
  getTargetForDate,
  getCurrentTarget,
  getAverageTargetForDates,
  setOrUpdateTargetEntry,
  removeTargetEntry,
  formatLocalDateString,
} from '../src/features/focus/utils/targetHistoryUtils';
import { FocusTargetHistoryEntry } from '../src/features/focus/types';

function runTests() {
  console.log('=== RUNNING HISTORICAL TARGET TRACKING TEST SUITE ===\n');
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

  // TEST 1: Initial creation and setting target to 8 hours
  let history: FocusTargetHistoryEntry[] = [];
  const res1 = setOrUpdateTargetEntry(history, 8, '2026-08-01');
  history = res1.updatedHistory;
  assert(res1.changed === true, 'Test 1.1: Setting target to 8 hours returns changed: true');
  assert(history.length === 1, 'Test 1.2: History has 1 entry');
  assert(history[0].targetHours === 8, 'Test 1.3: Target is 8 hours');
  assert(history[0].effectiveDate === '2026-08-01', 'Test 1.4: Effective date is 2026-08-01');

  // TEST 2: Change to 6 hours on September 1 and verify 8 hours remains intact
  const res2 = setOrUpdateTargetEntry(history, 6, '2026-09-01');
  history = res2.updatedHistory;
  assert(res2.changed === true, 'Test 2.1: Changing target to 6 hours returns changed: true');
  assert(history.length === 2, 'Test 2.2: History now has 2 entries (8h and 6h)');
  assert(history[0].targetHours === 8 && history[0].effectiveDate === '2026-08-01', 'Test 2.3: August 8-hour period preserved');
  assert(history[1].targetHours === 6 && history[1].effectiveDate === '2026-09-01', 'Test 2.4: September 6-hour period preserved');

  // TEST 3: Change to 4 hours on October 1 and verify timeline shows 8 -> 6 -> 4
  const res3 = setOrUpdateTargetEntry(history, 4, '2026-10-01');
  history = res3.updatedHistory;
  assert(res3.changed === true, 'Test 3.1: Changing target to 4 hours returns changed: true');
  assert(history.length === 3, 'Test 3.2: History now has 3 entries');
  assert(
    history[0].targetHours === 8 &&
    history[1].targetHours === 6 &&
    history[2].targetHours === 4,
    'Test 3.3: Historical sequence preserves 8 -> 6 -> 4 hours'
  );

  // TEST 4: Date resolution across historical timeline
  // A. Dates in August (e.g., 2026-08-15) must resolve to 8h
  assert(getTargetForDate(history, '2026-08-01') === 8, 'Test 4.1: Aug 01 resolves to 8h');
  assert(getTargetForDate(history, '2026-08-15') === 8, 'Test 4.2: Aug 15 resolves to 8h');
  assert(getTargetForDate(history, '2026-08-31') === 8, 'Test 4.3: Aug 31 resolves to 8h');

  // B. Dates in September (e.g., 2026-09-15) must resolve to 6h
  assert(getTargetForDate(history, '2026-09-01') === 6, 'Test 4.4: Sep 01 resolves to 6h');
  assert(getTargetForDate(history, '2026-09-15') === 6, 'Test 4.5: Sep 15 resolves to 6h');
  assert(getTargetForDate(history, '2026-09-30') === 6, 'Test 4.6: Sep 30 resolves to 6h');

  // C. Dates in October (e.g., 2026-10-15) must resolve to 4h
  assert(getTargetForDate(history, '2026-10-01') === 4, 'Test 4.7: Oct 01 resolves to 4h');
  assert(getTargetForDate(history, '2026-10-17') === 4, 'Test 4.8: Oct 17 resolves to 4h');
  assert(getTargetForDate(history, '2026-11-01') === 4, 'Test 4.9: Future dates resolve to latest 4h');

  // D. Dates before the earliest recorded period (e.g., July 2026) must return null (never fabricate)
  assert(getTargetForDate(history, '2026-07-31') === null, 'Test 4.10: Dates prior to earliest target return null (no false fabrication)');

  // TEST 5: Weekly and Monthly aggregations count on average daily basis
  // Week spanning late August to early September (e.g. Aug 28 to Sep 03 = 4 days of 8h + 3 days of 6h)
  const crossWeekDates = [
    '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31',
    '2026-09-01', '2026-09-02', '2026-09-03'
  ];
  const weekAvg = getAverageTargetForDates(history, crossWeekDates);
  // (8*4 + 6*3) / 7 = (32 + 18) / 7 = 50 / 7 = 7.14 -> 7.1h
  assert(weekAvg.avgTargetHours === 7.1, 'Test 5.1: Cross-period week averages daily targets correctly (7.1h/d)');
  assert(weekAvg.daysWithTarget === 7, 'Test 5.2: All 7 days in week tracked');

  // Pure September month (30 days of 6h)
  const sepDates = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  const sepAvg = getAverageTargetForDates(history, sepDates);
  assert(sepAvg.avgTargetHours === 6, 'Test 5.3: Pure September month averages to exactly 6h/d');

  // Pure August month (31 days of 8h)
  const augDates = Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
  const augAvg = getAverageTargetForDates(history, augDates);
  assert(augAvg.avgTargetHours === 8, 'Test 5.4: Pure August month averages to exactly 8h/d');

  // Pure October month (31 days of 4h)
  const octDates = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  const octAvg = getAverageTargetForDates(history, octDates);
  assert(octAvg.avgTargetHours === 4, 'Test 5.5: Pure October month averages to exactly 4h/d');

  // Month prior to earliest history (July 2026)
  const julDates = Array.from({ length: 31 }, (_, i) => `2026-07-${String(i + 1).padStart(2, '0')}`);
  const julAvg = getAverageTargetForDates(history, julDates);
  assert(julAvg.avgTargetHours === null, 'Test 5.6: Month with no target history returns null (unrecorded)');

  // Week with 3 days of 8h target and 4 days of unset (0h) target: (3*8 + 4*0) / 7 = 24 / 7 = 3.4h
  const partialWeekDates = [
    '2026-07-29', '2026-07-30', '2026-07-31', // unset (0h)
    '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04' // 8h
  ];
  const partialWeekAvg = getAverageTargetForDates(history, partialWeekDates);
  // (0 + 0 + 0 + 8*4) / 7 = 32 / 7 = 4.57 -> 4.6h
  assert(partialWeekAvg.avgTargetHours === 4.6, 'Test 5.7: Partial week with unset days treats unset as 0 and divides by all 7 days');

  // TEST 6: Prevent duplicate entries when saving unchanged target
  const resDup = setOrUpdateTargetEntry(history, 4, '2026-10-01');
  assert(resDup.changed === false, 'Test 6.1: Saving same target (4h) on existing date returns changed: false');
  assert(resDup.updatedHistory.length === 3, 'Test 6.2: History length remains 3 (no duplicate created)');

  const resDupCurrent = setOrUpdateTargetEntry(history, 4, '2026-10-17');
  assert(resDupCurrent.changed === false, 'Test 6.3: Setting same 4h value already effective from Oct 1 returns changed: false');
  assert(resDupCurrent.updatedHistory.length === 3, 'Test 6.4: History length remains 3 (no redundant entry)');

  // TEST 7: Retroactive updates and corrections
  // Suppose user retroactively updates September from 6h to 6.5h
  const resRetro = setOrUpdateTargetEntry(history, 6.5, '2026-09-01');
  assert(resRetro.changed === true, 'Test 7.1: Retroactive update to 6.5h returns changed: true');
  assert(resRetro.updatedHistory.length === 3, 'Test 7.2: History length remains 3 (updated in place)');
  assert(getTargetForDate(resRetro.updatedHistory, '2026-09-15') === 6.5, 'Test 7.3: Sep 15 now resolves to updated 6.5h');

  // TEST 8: Zero-default fallback
  const emptyHistory: FocusTargetHistoryEntry[] = [];
  assert(getTargetForDate(emptyHistory, '2026-10-17') === null, 'Test 8.1: Empty history returns null for historical date');
  assert(getCurrentTarget(emptyHistory) === null, 'Test 8.2: getCurrentTarget returns null when no target is set');
  assert(getCurrentTarget(emptyHistory, 5) === 5, 'Test 8.3: getCurrentTarget respects explicit fallback if provided');

  // TEST 9: Removal of entry
  const entryToDeleteId = resRetro.updatedHistory[1].id;
  const resDelete = removeTargetEntry(resRetro.updatedHistory, entryToDeleteId);
  assert(resDelete.changed === true, 'Test 9.1: Deleting entry returns changed: true');
  assert(resDelete.updatedHistory.length === 2, 'Test 9.2: History reduced to 2 entries');
  // After deleting September entry, dates in September now retain August 8h target
  assert(getTargetForDate(resDelete.updatedHistory, '2026-09-15') === 8, 'Test 9.3: September dates fall back to August 8h after deletion');

  // TEST 10: Deleting down to zero targets
  let wipeHistory = resDelete.updatedHistory;
  const wipe1 = removeTargetEntry(wipeHistory, wipeHistory[0].id);
  wipeHistory = wipe1.updatedHistory;
  const wipe2 = removeTargetEntry(wipeHistory, wipeHistory[0].id);
  wipeHistory = wipe2.updatedHistory;
  assert(wipeHistory.length === 0, 'Test 10.1: Target history can be completely emptied down to 0');
  assert(getCurrentTarget(wipeHistory) === null, 'Test 10.2: When completely empty, current target is null (unset)');

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
}

runTests();
