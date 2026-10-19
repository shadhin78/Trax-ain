import assert from 'node:assert';

interface CalculateMetricsParams {
  timeRange: '1D' | '7D' | '30D' | '6M';
  granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  totalPeriodSeconds: number;
  dailyTargetHours: number | null;
  dayTargets: Array<{ targetHours: number | null; actualHours: number }>;
}

export function calculateSuccessRateAndAttainment(params: CalculateMetricsParams) {
  const { timeRange, granularity, totalPeriodSeconds, dayTargets } = params;
  const numDays = timeRange === '1D' ? 1 : timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 180;
  
  // 1. Attainment: How many hit the target
  const targetedPoints = dayTargets.filter((p) => p.targetHours !== null && p.targetHours > 0);
  const hitTotalCount = targetedPoints.length;
  const hitCount = targetedPoints.filter((p) => p.actualHours >= p.targetHours!).length;
  const hitRatePercent = hitTotalCount > 0 ? Math.round((hitCount / hitTotalCount) * 100) : 0;
  
  const unitLabel = (granularity === 'DAILY' || timeRange === '1D') 
    ? (hitTotalCount === 1 ? 'day' : 'days')
    : granularity === 'WEEKLY'
      ? (hitTotalCount === 1 ? 'week' : 'weeks')
      : (hitTotalCount === 1 ? 'month' : 'months');

  // 2. Average Focus & Average Target
  const avgDailySec = totalPeriodSeconds / numDays;
  let sumAllDaysTarget = 0;
  dayTargets.forEach((p) => {
    sumAllDaysTarget += p.targetHours ?? 0;
  });
  const avgTargetVal = Math.round((sumAllDaysTarget / numDays) * 10) / 10;

  // 3. Success Rate: Percentage of target completed according to average
  const totalTargetSeconds = sumAllDaysTarget * 3600;
  const successRate = totalTargetSeconds > 0
    ? Math.round((totalPeriodSeconds / totalTargetSeconds) * 100)
    : null;

  return {
    hitCount,
    hitTotalCount,
    hitRatePercent,
    unitLabel,
    avgDailySec,
    avgTargetVal,
    successRate,
  };
}

console.log('=== RUNNING SUCCESS RATE & ATTAINMENT TEST SUITE ===\n');

// Test 1: User's scenario (7 Days, 2h focus total, 4.5h target on 1 day)
const res1 = calculateSuccessRateAndAttainment({
  timeRange: '7D',
  granularity: 'DAILY',
  totalPeriodSeconds: 2 * 3600, // 2 hours
  dailyTargetHours: 4.5,
  dayTargets: [
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 1.5 },
    { targetHours: 4.5, actualHours: 0.5 },
  ],
});

assert.strictEqual(res1.avgTargetVal, 0.6, 'Test 1.1: Average Target is 4.5 / 7 = 0.6h');
assert.strictEqual(res1.successRate, 44, 'Test 1.2: Success Rate is (2h / 4.5h) * 100 = 44%');
assert.strictEqual(res1.hitCount, 0, 'Test 1.3: Hit count is 0 (0.5h did not hit 4.5h target)');
assert.strictEqual(res1.hitTotalCount, 1, 'Test 1.4: 1 targeted day evaluated for hit target');
console.log('[PASS] Test 1: User scenario correctly yields 44% success rate and 0 of 1 days hit target');

// Test 2: Full week target met (7 days of 4h target, 28h focus logged, 5 days met)
const res2 = calculateSuccessRateAndAttainment({
  timeRange: '7D',
  granularity: 'DAILY',
  totalPeriodSeconds: 28 * 3600, // 28 hours
  dailyTargetHours: 4,
  dayTargets: [
    { targetHours: 4, actualHours: 5 },
    { targetHours: 4, actualHours: 4 },
    { targetHours: 4, actualHours: 6 },
    { targetHours: 4, actualHours: 4 },
    { targetHours: 4, actualHours: 5 },
    { targetHours: 4, actualHours: 2 },
    { targetHours: 4, actualHours: 2 },
  ],
});

assert.strictEqual(res2.avgTargetVal, 4.0, 'Test 2.1: Average Target is 4.0h');
assert.strictEqual(res2.successRate, 100, 'Test 2.2: Success Rate is 100%');
assert.strictEqual(res2.hitCount, 5, 'Test 2.3: 5 of 7 days hit target');
assert.strictEqual(res2.hitTotalCount, 7, 'Test 2.4: 7 days evaluated');
assert.strictEqual(res2.hitRatePercent, 71, 'Test 2.5: Attainment hit rate is 71%');
console.log('[PASS] Test 2: Full week with 100% success rate and 5 of 7 days hit target');

// Test 3: Unset target (0 target configured)
const res3 = calculateSuccessRateAndAttainment({
  timeRange: '7D',
  granularity: 'DAILY',
  totalPeriodSeconds: 5 * 3600,
  dailyTargetHours: null,
  dayTargets: [
    { targetHours: null, actualHours: 1 },
    { targetHours: null, actualHours: 2 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 0 },
    { targetHours: null, actualHours: 2 },
    { targetHours: null, actualHours: 0 },
  ],
});

assert.strictEqual(res3.avgTargetVal, 0, 'Test 3.1: Average Target is 0 when unset');
assert.strictEqual(res3.successRate, null, 'Test 3.2: Success Rate is null when target is 0/unset');
assert.strictEqual(res3.hitTotalCount, 0, 'Test 3.3: 0 targeted days when unset');
console.log('[PASS] Test 3: Unset target yields null success rate and 0 targeted days');

// Test 4: 1 Day Range (4h target, 3h focus)
const res4 = calculateSuccessRateAndAttainment({
  timeRange: '1D',
  granularity: 'DAILY',
  totalPeriodSeconds: 3 * 3600,
  dailyTargetHours: 4,
  dayTargets: [
    { targetHours: 4, actualHours: 3 },
  ],
});

assert.strictEqual(res4.avgTargetVal, 4, 'Test 4.1: Average Target is 4h');
assert.strictEqual(res4.successRate, 75, 'Test 4.2: Success Rate is (3 / 4) * 100 = 75%');
assert.strictEqual(res4.hitCount, 0, 'Test 4.3: 0 days hit target');
assert.strictEqual(res4.hitTotalCount, 1, 'Test 4.4: 1 day evaluated');
console.log('[PASS] Test 4: 1 Day Range yields 75% completion rate according to avg');

console.log('\n=== ALL 4 TEST SCENARIOS PASSED ===\n');
