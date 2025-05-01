import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from '../BPlusTree'
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
} from '../source'
import type { Cursor } from '../eval' // Assuming Cursor type is exported from eval
import { ValueType } from '../Node' // Import ValueType

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

// Add tests for complex keys (Record<string, ValueType>)
type ComplexKey = { id: number; name?: string } // Example complex key
type ComplexData = { info: string }

// Comparator for ComplexKey based on the 'id' field
const complexKeyComparator = (a: ComplexKey, b: ComplexKey): number => {
  if (a === null && b === null) return 0
  if (a === null) return -1 // Define null/undefined comparison behavior
  if (b === null) return 1
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return -1
  if (b === undefined) return 1

  return a.id - b.id
}

describe('BPlusTree Source Functions with Record Keys', () => {
  let tree: BPlusTree<ComplexData, ComplexKey>
  const testData: Array<{ key: ComplexKey; value: ComplexData }> = [
    { key: { id: 5 }, value: { info: 'E' } },
    { key: { id: 2, name: 'B' }, value: { info: 'B' } },
    { key: { id: 8 }, value: { info: 'H' } },
    { key: { id: 1, name: 'A' }, value: { info: 'A' } },
    { key: { id: 6, name: 'F' }, value: { info: 'F' } },
    { key: { id: 6, name: 'F2' }, value: { info: 'F2' } }, // Duplicate id
    { key: { id: 3 }, value: { info: 'C' } },
  ]
  // Expected order based on id: 1:A, 2:B, 3:C, 5:E, 6:F, 6:F2, 8:H

  beforeEach(() => {
    // Use the custom comparator for complex keys
    tree = new BPlusTree<ComplexData, ComplexKey>(
      2,
      false,
      complexKeyComparator,
      undefined, // Use default null representation for now
    )
    testData.forEach((item) => tree.insert(item.key, item.value))
  })

  it('sourceEach should yield all items in forward order (complex keys)', () => {
    const generator = sourceEach<ComplexData, ComplexKey>(true)(tree)
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([1, 2, 3, 5, 6, 6, 8])
    // Check info for confirmation, order of duplicates matters
    expect(results.map((r) => r.value.info)).toEqual([
      'A',
      'B',
      'C',
      'E',
      'F',
      'F2',
      'H',
    ])
  })

  it('sourceEach should yield all items in backward order (complex keys)', () => {
    const generator = sourceEach<ComplexData, ComplexKey>(false)(tree)
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([8, 6, 6, 5, 3, 2, 1])
    // Order of duplicates in reverse
    expect(results.map((r) => r.value.info)).toEqual([
      'H',
      'F2',
      'F',
      'E',
      'C',
      'B',
      'A',
    ])
  })

  it('sourceEq should yield items matching the key (complex keys)', () => {
    // Use a key object that matches based on the comparator (id field)
    const searchKey: ComplexKey = { id: 6 }
    const generator = sourceEq<ComplexData, ComplexKey>(searchKey)(tree)
    const results = collect(generator)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.key.id)).toEqual([6, 6])
    // Check that both items with id 6 are found
    const infos = results.map((r) => r.value.info)
    expect(infos).toContain('F')
    expect(infos).toContain('F2')
  })

    it('sourceEq should yield nothing for non-existent key (complex keys)', () => {
        const searchKey: ComplexKey = { id: 99 };
        const generator = sourceEq<ComplexData, ComplexKey>(searchKey)(tree);
        const results = collect(generator);
        expect(results).toHaveLength(0);
    });


  it('sourceGt should yield items with keys strictly greater (complex keys)', () => {
    const searchKey: ComplexKey = { id: 5 }
    const generator = sourceGt<ComplexData, ComplexKey>(searchKey)(tree) // > {id: 5} -> 6, 6, 8
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([6, 6, 8])
    expect(results.map((r) => r.value.info)).toEqual(['F', 'F2', 'H'])
  })

  it('sourceGte should yield items with keys greater than or equal (complex keys)', () => {
    const searchKey: ComplexKey = { id: 6 }
    const generator = sourceGte<ComplexData, ComplexKey>(searchKey)(tree) // >= {id: 6} -> 6, 6, 8
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([6, 6, 8])
    expect(results.map((r) => r.value.info)).toEqual(['F', 'F2', 'H'])
  })

  it('sourceIn should yield items with keys in the array (complex keys)', () => {
    const searchKeys: ComplexKey[] = [{ id: 8 }, { id: 1 }, { id: 6 }]
    const generator = sourceIn<ComplexData, ComplexKey>(searchKeys)(tree) // Look for 1, 6, 6, 8
    const results = collect(generator)
    expect(results).toHaveLength(4)
    expect(results.map((r) => r.key.id).sort((a, b) => a - b)).toEqual([1, 6, 6, 8]) // Sort results for comparison
    // Check presence of specific items
     expect(results).toContainEqual(expect.objectContaining({ key: { id: 1 }, value: { info: 'A' } }))
     expect(results).toContainEqual(expect.objectContaining({ key: { id: 8 }, value: { info: 'H' } }))
     expect(results).toContainEqual(expect.objectContaining({ key: { id: 6, name: 'F' }, value: { info: 'F' } }))
     expect(results).toContainEqual(expect.objectContaining({ key: { id: 6, name: 'F2'}, value: { info: 'F2' } }))
  })

    it('sourceIn should handle non-existent keys gracefully (complex keys)', () => {
        const searchKeys: ComplexKey[] = [{ id: 99 }, { id: 2 }, { id: 100 }]; // Only id: 2 exists
        const generator = sourceIn<ComplexData, ComplexKey>(searchKeys)(tree);
        const results = collect(generator);
        expect(results).toHaveLength(1);
        expect(results[0].key.id).toEqual(2);
        expect(results[0].value.info).toEqual('B');
    });

  it('sourceLt should yield items with keys strictly less (complex keys)', () => {
    const searchKey: ComplexKey = { id: 3 }
    const generator = sourceLt<ComplexData, ComplexKey>(searchKey)(tree) // < {id: 3} -> 1, 2
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([2, 1]) // Reversed order
    expect(results.map((r) => r.value.info)).toEqual(['B', 'A'])
  })

  it('sourceLte should yield items with keys less than or equal (complex keys)', () => {
    const searchKey: ComplexKey = { id: 3 }
    const generator = sourceLte<ComplexData, ComplexKey>(searchKey)(tree) // <= {id: 3} -> 1, 2, 3
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([3, 2, 1]) // Reversed order
    expect(results.map((r) => r.value.info)).toEqual(['C', 'B', 'A'])
  })

  it('sourceRange should yield items within the range (inclusive, complex keys)', () => {
    const fromKey: ComplexKey = { id: 3 }
    const toKey: ComplexKey = { id: 6 }
    const generator = sourceRange<ComplexData, ComplexKey>(
      fromKey,
      toKey,
      true,
      true,
    )(tree) // [{id: 3}, {id: 6}] -> 3, 5, 6, 6
    const results = collect(generator)
    expect(results.map((r) => r.key.id)).toEqual([3, 5, 6, 6])
    expect(results.map((r) => r.value.info)).toEqual(['C', 'E', 'F', 'F2'])
  })

   it('sourceRange should yield items within the range (exclusive, complex keys)', () => {
      const fromKey: ComplexKey = { id: 3 };
      const toKey: ComplexKey = { id: 6 };
      const generator = sourceRange<ComplexData, ComplexKey>(fromKey, toKey, false, false)(tree); // ({id: 3}, {id: 6}) -> 5
      const results = collect(generator);
      expect(results.map(r => r.key.id)).toEqual([5]);
      expect(results.map(r => r.value.info)).toEqual(['E']);
   })

    it('sourceRange should yield items within the range [inclusive, exclusive) (complex keys)', () => {
       const fromKey: ComplexKey = { id: 3 };
       const toKey: ComplexKey = { id: 6 };
       const generator = sourceRange<ComplexData, ComplexKey>(fromKey, toKey, true, false)(tree); // [{id: 3}, {id: 6}) -> 3, 5
       const results = collect(generator);
       expect(results.map(r => r.key.id)).toEqual([3, 5]);
       expect(results.map(r => r.value.info)).toEqual(['C', 'E']);
    })

     it('sourceRange should yield items within the range (inclusive, exclusive] (complex keys)', () => {
        const fromKey: ComplexKey = { id: 3 };
        const toKey: ComplexKey = { id: 6 };
        const generator = sourceRange<ComplexData, ComplexKey>(fromKey, toKey, false, true)(tree); // ({id: 3}, {id: 6}] -> 5, 6, 6
        const results = collect(generator);
        expect(results.map(r => r.key.id)).toEqual([5, 6, 6]);
        expect(results.map(r => r.value.info)).toEqual(['E', 'F', 'F2']);
     })

     it('sourceRange should handle empty ranges (complex keys)', () => {
        const fromKey: ComplexKey = { id: 4 };
        const toKey: ComplexKey = { id: 4 };
        const generator = sourceRange<ComplexData, ComplexKey>(fromKey, toKey, false, false)(tree); // ({id: 4}, {id: 4}) -> empty
        const results = collect(generator);
        expect(results).toHaveLength(0);

        const fromKey2: ComplexKey = { id: 90 };
        const toKey2: ComplexKey = { id: 100 };
        const generator2 = sourceRange<ComplexData, ComplexKey>(fromKey2, toKey2)(tree); // Range outside data
        const results2 = collect(generator2);
        expect(results2).toHaveLength(0);
    });
})
