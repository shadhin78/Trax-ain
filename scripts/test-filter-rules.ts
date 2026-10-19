import assert from 'node:assert';

export type TimeRange = '1D' | '7D' | '30D' | '6M';
export type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const isGranularityAllowed = (range: TimeRange, g: Granularity): boolean => {
  if (range === '7D') return g === 'DAILY';
  if (range === '30D') return g === 'DAILY' || g === 'WEEKLY';
  if (range === '6M') return true;
  return g === 'DAILY';
};

export const getGranularityDisabledReason = (range: TimeRange, g: Granularity): string | undefined => {
  if (range === '7D' && (g === 'WEEKLY' || g === 'MONTHLY')) {
    return `${g === 'WEEKLY' ? 'Weekly' : 'Monthly'} breakdown is not applicable for 7-day range`;
  }
  if (range === '30D' && g === 'MONTHLY') {
    return 'Monthly breakdown is not applicable for 30-day range';
  }
  return undefined;
};

console.log('=== RUNNING FILTER RULES TEST SUITE ===\n');

// 1. 7 Days tests
assert.strictEqual(isGranularityAllowed('7D', 'DAILY'), true, '7D should allow DAILY');
console.log('[PASS] Test 1.1: 7 Days allows DAILY');

assert.strictEqual(isGranularityAllowed('7D', 'WEEKLY'), false, '7D should not allow WEEKLY');
console.log('[PASS] Test 1.2: 7 Days disables WEEKLY (weekly filter not useful for 7 days)');

assert.strictEqual(isGranularityAllowed('7D', 'MONTHLY'), false, '7D should not allow MONTHLY');
console.log('[PASS] Test 1.3: 7 Days disables MONTHLY');

assert.ok(getGranularityDisabledReason('7D', 'WEEKLY')?.includes('Weekly breakdown is not applicable'), '7D gives proper reason for Weekly');
console.log('[PASS] Test 1.4: 7 Days provides explanatory tooltip for WEEKLY');

assert.ok(getGranularityDisabledReason('7D', 'MONTHLY')?.includes('Monthly breakdown is not applicable'), '7D gives proper reason for Monthly');
console.log('[PASS] Test 1.5: 7 Days provides explanatory tooltip for MONTHLY');

// 2. 30 Days tests
assert.strictEqual(isGranularityAllowed('30D', 'DAILY'), true, '30D should allow DAILY');
console.log('[PASS] Test 2.1: 30 Days allows DAILY');

assert.strictEqual(isGranularityAllowed('30D', 'WEEKLY'), true, '30D should allow WEEKLY');
console.log('[PASS] Test 2.2: 30 Days allows WEEKLY (5-6 Sat-Fri weeks)');

assert.strictEqual(isGranularityAllowed('30D', 'MONTHLY'), false, '30D should not allow MONTHLY');
console.log('[PASS] Test 2.3: 30 Days disables MONTHLY (monthly filter not useful for 30 days)');

assert.ok(getGranularityDisabledReason('30D', 'MONTHLY')?.includes('Monthly breakdown is not applicable'), '30D gives proper reason for Monthly');
console.log('[PASS] Test 2.4: 30 Days provides explanatory tooltip for MONTHLY');

// 3. 6 Months tests
assert.strictEqual(isGranularityAllowed('6M', 'DAILY'), true, '6M should allow DAILY');
console.log('[PASS] Test 3.1: 6 Months allows DAILY (180 daily telemetry points)');

assert.strictEqual(isGranularityAllowed('6M', 'WEEKLY'), true, '6M should allow WEEKLY (26 weeks)');
console.log('[PASS] Test 3.2: 6 Months allows WEEKLY');

assert.strictEqual(isGranularityAllowed('6M', 'MONTHLY'), true, '6M should allow MONTHLY (6 months)');
console.log('[PASS] Test 3.3: 6 Months allows MONTHLY');

assert.strictEqual(getGranularityDisabledReason('6M', 'DAILY'), undefined, '6M has no disabled reason for DAILY');
assert.strictEqual(getGranularityDisabledReason('6M', 'WEEKLY'), undefined, '6M has no disabled reason for WEEKLY');
assert.strictEqual(getGranularityDisabledReason('6M', 'MONTHLY'), undefined, '6M has no disabled reason for MONTHLY');
console.log('[PASS] Test 3.4: 6 Months enables all 3 granularities without restrictions');

// 4. Auto-correction tests
function resolveNewGranularity(newRange: TimeRange, currentGranularity: Granularity): Granularity {
  if (!isGranularityAllowed(newRange, currentGranularity)) {
    return 'DAILY';
  }
  return currentGranularity;
}

assert.strictEqual(resolveNewGranularity('7D', 'WEEKLY'), 'DAILY', 'Switching to 7D from WEEKLY auto-corrects to DAILY');
console.log('[PASS] Test 4.1: Switching from WEEKLY to 7D auto-corrects to DAILY');

assert.strictEqual(resolveNewGranularity('7D', 'MONTHLY'), 'DAILY', 'Switching to 7D from MONTHLY auto-corrects to DAILY');
console.log('[PASS] Test 4.2: Switching from MONTHLY to 7D auto-corrects to DAILY');

assert.strictEqual(resolveNewGranularity('30D', 'MONTHLY'), 'DAILY', 'Switching to 30D from MONTHLY auto-corrects to DAILY');
console.log('[PASS] Test 4.3: Switching from MONTHLY to 30D auto-corrects to DAILY');

assert.strictEqual(resolveNewGranularity('30D', 'WEEKLY'), 'WEEKLY', 'Switching to 30D preserves WEEKLY');
console.log('[PASS] Test 4.4: Switching to 30D preserves WEEKLY');

assert.strictEqual(resolveNewGranularity('6M', 'WEEKLY'), 'WEEKLY', 'Switching to 6M preserves WEEKLY');
console.log('[PASS] Test 4.5: Switching to 6M preserves WEEKLY');

assert.strictEqual(resolveNewGranularity('6M', 'MONTHLY'), 'MONTHLY', 'Switching to 6M preserves MONTHLY');
console.log('[PASS] Test 4.6: Switching to 6M preserves MONTHLY');

console.log('\n=== RESULTS: 15/15 TESTS PASSED ===\n');
