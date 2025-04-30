import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from './BPlusTree'
import {
  sourceEach,
  sourceEq,
  sourceGt,
  sourceGte,
  sourceIn,
  sourceLt,
  sourceLte,
  sourceRange,
  sourceEqNulls,
  // sourceEqNulls - assuming it behaves like sourceEq for non-null keys for now
} from './source'
import type { Cursor } from './eval' // Assuming Cursor type is exported from eval
import { ValueType } from './Node' // Import ValueType

type Data = { value: string }

// Helper function to collect results from a generator
function collect<T, K extends ValueType>(
  gen: Generator<Cursor<T, K>, void, unknown>,
): Array<{ key: K; value: T }> {
  const results: Array<{ key: K; value: T }> = []
  for (const cursor of gen) {
    if (!cursor.done) {
      results.push({ key: cursor.key, value: cursor.value })
    }
  }
  return results
}

describe('BPlusTree Source Functions', () => {
  let tree: BPlusTree<Data, number>
  const testData: Array<{ key: number; value: Data }> = [
    { key: 5, value: { value: 'E' } },
    { key: 2, value: { value: 'B' } },
    { key: 8, value: { value: 'H' } },
    { key: 1, value: { value: 'A' } },
    { key: 6, value: { value: 'F' } },
    { key: 6, value: { value: 'F2' } }, // Duplicate key
    { key: 3, value: { value: 'C' } },
  ]
  // Expected order: 1:A, 2:B, 3:C, 5:E, 6:F, 6:F2, 8:H

  beforeEach(() => {
    tree = new BPlusTree<Data, number>(2, false)
    testData.forEach((item) => tree.insert(item.key, item.value))
  })

  it('sourceEach should yield all items in forward order', () => {
    const generator = sourceEach<Data, number>(true)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(testData.length)
    expect(results.map((r) => r.key)).toEqual([1, 2, 3, 5, 6, 6, 8])
    expect(results.map((r) => r.value.value)).toEqual([
      'A',
      'B',
      'C',
      'E',
      'F',
      'F2',
      'H',
    ]) // Assuming F inserted before F2
  })

  it('sourceEach should yield all items in backward order', () => {
    const generator = sourceEach<Data, number>(false)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(testData.length)
    expect(results.map((r) => r.key)).toEqual([8, 6, 6, 5, 3, 2, 1])
    // Order of duplicates in reverse might depend on implementation
    expect(results.map((r) => r.value.value)).toEqual([
      'H',
      'F2',
      'F',
      'E',
      'C',
      'B',
      'A',
    ]) // Assuming F2 is "later" than F
  })

  it('sourceEq should yield items matching the key', () => {
    const generator = sourceEq<Data, number>(6)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.key)).toEqual([6, 6])
    expect(results.map((r) => r.value.value)).toContain('F')
    expect(results.map((r) => r.value.value)).toContain('F2')
  })

  it('sourceEq should yield nothing for non-existent key', () => {
    const generator = sourceEq<Data, number>(99)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(0)
  })

  // Add test for sourceEqNulls if null handling is distinct
  // Assuming for now it behaves like sourceEq for non-null keys.
  // A specific test with actual null/undefined insertion might be needed
  // if BPlusTree handles them specially beyond mapping to defaultEmpty.
  it('sourceEqNulls should yield items matching the key (like sourceEq)', () => {
    const generator = sourceEqNulls<Data, number>(6)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(2) // Should find both 'F' and 'F2'
    expect(results.map((r) => r.key)).toEqual([6, 6])
    expect(results.map((r) => (r.value as Data).value)).toContain('F')
    expect(results.map((r) => (r.value as Data).value)).toContain('F2')
  })

  it('sourceEqNulls should yield nothing for non-existent key', () => {
    const generator = sourceEqNulls<Data, number>(99)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(0)
  })

  it('sourceGt should yield items with keys strictly greater', () => {
    const generator = sourceGt<Data, number>(5)(tree) // Should be > 5 -> 6, 6, 8
    const results = collect(generator)
    expect(results).toHaveLength(3)
    expect(results.map((r) => r.key)).toEqual([6, 6, 8])
    expect(results.map((r) => r.value.value)).toEqual(['F', 'F2', 'H'])
  })

   it('sourceGte should yield items with keys greater than or equal', () => {
     const generator = sourceGte<Data, number>(6)(tree) // Should be >= 6 -> 6, 6, 8
     const results = collect(generator)
     expect(results).toHaveLength(3)
     expect(results.map((r) => r.key)).toEqual([6, 6, 8])
     expect(results.map((r) => r.value.value)).toEqual(['F', 'F2', 'H'])
   })

   it('sourceIn should yield items with keys in the array', () => {
     const generator = sourceIn<Data, number>([8, 1, 6])(tree) // Look for 1, 6, 6, 8
     const results = collect(generator)
     // The order might depend on the sourceIn implementation (does it sort keys first?)
     // Assuming it iterates through the provided keys:
     // 1. Tries 8 -> finds 8:H
     // 2. Tries 1 -> finds 1:A
     // 3. Tries 6 -> finds 6:F, then 6:F2
     // Let's check the *content* regardless of order for simplicity
     expect(results).toHaveLength(4)
     expect(results.map(r => r.key).sort()).toEqual([1, 6, 6, 8]) // Sort results for comparison
     expect(results).toContainEqual({ key: 1, value: { value: 'A' } })
     expect(results).toContainEqual({ key: 8, value: { value: 'H' } })
     expect(results).toContainEqual({ key: 6, value: { value: 'F' } })
     expect(results).toContainEqual({ key: 6, value: { value: 'F2' } })
   })

  it('sourceIn should handle non-existent keys gracefully', () => {
    const generator = sourceIn<Data, number>([99, 2, 100])(tree) // Only 2 exists
    const results = collect(generator)
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ key: 2, value: { value: 'B' } })
  })

   it('sourceLt should yield items with keys strictly less', () => {
     const generator = sourceLt<Data, number>(3)(tree) // Should be < 3 -> 1, 2
     const results = collect(generator)
     expect(results).toHaveLength(2)
     expect(results.map((r) => r.key)).toEqual([2, 1]) // Keep the reversed expectation
     expect(results.map((r) => r.value.value)).toEqual(['B', 'A']) // Also reversed
   })

   it('sourceLte should yield items with keys less than or equal', () => {
     const generator = sourceLte<Data, number>(3)(tree) // Should be <= 3 -> 1, 2, 3
     const results = collect(generator)
     expect(results).toHaveLength(3)
     expect(results.map((r) => r.key)).toEqual([3, 2, 1]) // Reversed order due to eval_previous
     expect(results.map((r) => r.value.value)).toEqual(['C', 'B', 'A'])
   })

   it('sourceRange should yield items within the range (inclusive)', () => {
      const generator = sourceRange<Data, number>(3, 6, true, true)(tree) // [3, 6] -> 3, 5, 6, 6
      const results = collect(generator)
      expect(results).toHaveLength(4)
      expect(results.map((r) => r.key)).toEqual([3, 5, 6, 6])
      expect(results.map((r) => r.value.value)).toEqual(['C', 'E', 'F', 'F2'])
   })

   it('sourceRange should yield items within the range (exclusive)', () => {
      const generator = sourceRange<Data, number>(3, 6, false, false)(tree) // (3, 6) -> 5
      const results = collect(generator)
      expect(results).toHaveLength(1)
      expect(results.map((r) => r.key)).toEqual([5])
      expect(results.map((r) => r.value.value)).toEqual(['E'])
   })

    it('sourceRange should yield items within the range [inclusive, exclusive)', () => {
       const generator = sourceRange<Data, number>(3, 6, true, false)(tree) // [3, 6) -> 3, 5
       const results = collect(generator)
       expect(results).toHaveLength(2)
       expect(results.map((r) => r.key)).toEqual([3, 5])
       expect(results.map((r) => r.value.value)).toEqual(['C', 'E'])
    })

     it('sourceRange should yield items within the range (inclusive, exclusive]', () => {
        const generator = sourceRange<Data, number>(3, 6, false, true)(tree) // (3, 6] -> 5, 6, 6
        const results = collect(generator)
        expect(results).toHaveLength(3)
        expect(results.map((r) => r.key)).toEqual([5, 6, 6])
        expect(results.map((r) => r.value.value)).toEqual(['E', 'F', 'F2'])
     })

    it('sourceRange should handle empty ranges', () => {
        const generator = sourceRange<Data, number>(4, 4, false, false)(tree) // (4, 4) -> empty
        const results = collect(generator)
        expect(results).toHaveLength(0)

        const generator2 = sourceRange<Data, number>(90, 100)(tree) // Range outside data
        const results2 = collect(generator2)
        expect(results2).toHaveLength(0)
    })
})
