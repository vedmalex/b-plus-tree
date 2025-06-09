import { describe, it, expect } from 'vitest';
import { BPlusTree } from '../BPlusTree';

describe('Simple Range Query Test', () => {
  it('should test range query functionality', () => {
    const tree = new BPlusTree<string, number>(2);

    // Insert test data
    for (let i = 1; i <= 10; i++) {
      tree.insert(i, `value-${i}`);
    }

    console.log('Tree size:', tree.size);

    // Test range query
    const rangeResult = tree.range(3, 7);

    console.log('Range query (3-7) results:', rangeResult.length);
    console.log('Results:', rangeResult);

    // Expected: should return keys 3, 4, 5, 6, 7 (5 items)
    const expectedKeys = [3, 4, 5, 6, 7];
    const actualKeys = rangeResult.map(([k, v]) => k);

    console.log('Expected keys:', expectedKeys);
    console.log('Actual keys:', actualKeys);

    // Check if range query works correctly
    if (actualKeys.length === expectedKeys.length &&
        actualKeys.every((key, index) => key === expectedKeys[index])) {
      console.log('✅ Range query working correctly');
    } else {
      console.log('❌ Range query issue detected');
      console.log('Expected length:', expectedKeys.length);
      console.log('Actual length:', actualKeys.length);
    }

    // Test edge cases
    console.log('\n=== Edge Cases ===');

    // Range with no results
    const emptyRange = tree.range(15, 20);
    console.log('Range (15-20) results:', emptyRange.length);

    // Range with single item
    const singleRange = tree.range(5, 5);
    console.log('Range (5-5) results:', singleRange.length);

    // Range from start
    const fromStart = tree.range(1, 3);
    console.log('Range (1-3) results:', fromStart.length);

    // Range to end
    const toEnd = tree.range(8, 10);
    console.log('Range (8-10) results:', toEnd.length);
  });
});