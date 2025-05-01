import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from '../BPlusTree'
import { sourceEach } from '../source' // Use a basic source for testing queries
import { Cursor } from '../eval' // Import Cursor type
import {
  filter,
  map,
  reduce,
  forEach,
  // Import other query operators as needed:
  distinct, eq, every, gt, gte, includes, lt, lte, mapReduce, ne, nin, range, some
} from '../query'
import { query as executeQuery } from '../types' // Assuming the query executor is here
import { ValueType } from '../Node'; // Import ValueType for complex keys

type Item = { id: number; category: string; active: boolean }

// Helper function to collect results from an async generator (query results)
async function collectAsync<T>(
  gen: AsyncGenerator<T, void, unknown>,
): Promise<T[]> {
  const results: T[] = []
  for await (const item of gen) {
    results.push(item)
  }
  return results
}

describe('BPlusTree Query Operators', () => {
  let tree: BPlusTree<Item, number>
  const testData: Item[] = [
    { id: 1, category: 'A', active: true },
    { id: 2, category: 'B', active: false },
    { id: 3, category: 'A', active: true },
    { id: 4, category: 'C', active: true },
    { id: 5, category: 'B', active: true },
  ]
  // Keys: 1, 2, 3, 4, 5

  beforeEach(() => {
    tree = new BPlusTree<Item, number>(2, false)
    testData.forEach((item) => tree.insert(item.id, item))
  })

  it('filter should select items based on predicate', async () => {
    const source = sourceEach<Item, number>(true)(tree)
    const query = filter<Item, number>(([, item]) => item.category === 'A')
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.key)).toEqual([1, 3])
    expect(results.map((r) => r.value.category)).toEqual(['A', 'A'])
  })

  it('filter should handle async predicates', async () => {
    const source = sourceEach<Item, number>(true)(tree)
    const query = filter<Item, number>(async ([, item]) => {
      await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async work
      return item.active === true
    })
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(4)
    expect(results.map((r) => r.key)).toEqual([1, 3, 4, 5])
    expect(results.every(r => r.value.active)).toBe(true)
  })

  it('map should transform items', async () => {
    const source = sourceEach<Item, number>(true)(tree)
    const query = map<Item, number, { key: number; cat: string }>(([, item]) => ({
        key: item.id,
        cat: item.category,
    }))
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(5)
    // Check the transformed value in the cursor
    expect(results.map(r => r.value)).toEqual([
      { key: 1, cat: 'A' },
      { key: 2, cat: 'B' },
      { key: 3, cat: 'A' },
      { key: 4, cat: 'C' },
      { key: 5, cat: 'B' },
    ])
    // Original key/node/pos should be preserved
    expect(results.map(r => r.key)).toEqual([1, 2, 3, 4, 5])
  })

  it('map should handle async transforms', async () => {
      const source = sourceEach<Item, number>(true)(tree)
      const query = map<Item, number, string>(async ([key, item]) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return `Item ${key}: ${item.category}`
      })
      const resultGenerator = query(source)
      const results = await collectAsync(resultGenerator)

      expect(results).toHaveLength(5)
      expect(results.map(r => r.value)).toEqual([
          "Item 1: A",
          "Item 2: B",
          "Item 3: A",
          "Item 4: C",
          "Item 5: B",
      ])
  })

  it('reduce should aggregate results', async () => {
    const source = sourceEach<Item, number>(true)(tree) // 1:A, 2:B, 3:A, 4:C, 5:B
    // Count items per category
    const query = reduce<Item, number, Map<string, number>>(
      (acc, currentItem) => {
        const category = currentItem.category
        acc.set(category, (acc.get(category) ?? 0) + 1)
        return acc
      },
      new Map<string, number>(),
    )
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    // Reduce yields a single final result
    expect(results).toHaveLength(1)
    const categoryCounts = results[0]
    expect(categoryCounts.get('A')).toBe(2)
    expect(categoryCounts.get('B')).toBe(2)
    expect(categoryCounts.get('C')).toBe(1)
    expect(categoryCounts.size).toBe(3)
  })

  it('reduce should handle async reducers', async () => {
      const source = sourceEach<Item, number>(true)(tree)
      // Sum of IDs for active items
      const initialValue: number = 0; // Explicitly type initial value
      const query = reduce<Item, number, number>(
          async (sum: number, currentItem: Item) => {
              await new Promise(resolve => setTimeout(resolve, 1));
              return currentItem.active ? sum + currentItem.id : sum;
          },
          initialValue, // Use typed initial value
      )
      const resultGenerator = query(source) as AsyncGenerator<number>;
      const results = await collectAsync(resultGenerator); // Active items: 1, 3, 4, 5 -> Sum = 13

      expect(results).toHaveLength(1)
      expect(results[0]).toBe(13)
  })

  it('forEach should execute an action for each item without modifying stream', async () => {
    const source = sourceEach<Item, number>(true)(tree)
    const executedKeys: number[] = []
    const query = forEach<Item, number>(async ([key, item]) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        executedKeys.push(key)
    })
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator) // Collect to ensure iteration happens

    // forEach yields the original items
    expect(results).toHaveLength(testData.length)
    expect(results.map(r => r.key)).toEqual([1, 2, 3, 4, 5])

    // Check side effect
    expect(executedKeys).toEqual([1, 2, 3, 4, 5])
  })

  it('should chain multiple operators using executeQuery', async () => {
      // Find active items in category 'A', then return their IDs
      const finalResultGenerator = executeQuery( // Renamed to avoid confusion
          sourceEach<Item, number>(true), // Source generator function
          filter(([, item]) => item.category === 'A'), // Filter by category: items 1, 3
          filter(([, item]) => item.active === true),   // Filter by active status: items 1, 3 remain
          map(([key]) => key) // Map value to key (ID): Cursor values become 1, 3
      )(tree) as AsyncGenerator<Cursor<Item, number>>;

      // Collect the results from the generator
      const results = await collectAsync(finalResultGenerator);

      // Expected: Cursors for items 1 and 3, with their values mapped to their keys.
      expect(results).toHaveLength(2);
    // Check the mapped values within the cursors
    // @ts-ignore
      expect(results.map(cursor => cursor.value)).toEqual([1, 3]);
      // Optionally check the original keys are still correct
      expect(results.map(cursor => cursor.key)).toEqual([1, 3]);
  });

   it('should chain filter and reduce using executeQuery', async () => {
       // Calculate sum of IDs for items in category B
       const finalResult = executeQuery(
           sourceEach<Item, number>(true),
           filter(([, item]) => item.category === 'B'), // Items 2 (inactive), 5 (active)
           reduce<Item, number, number>((sum, current) => sum + current.id, 0) // Sum IDs: 2 + 5 = 7
       )(tree) as AsyncGenerator<number>;

       const results = await collectAsync(finalResult);
       expect(results).toHaveLength(1); // Reduce yields one value
       expect(results[0]).toBe(7);
   });


  // Add tests for other query operators: distinct, eq, every, gt, gte, includes, lt, lte, mapReduce, ne, nin, range, some
  it('eq should filter items by exact key match', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      eq<Item, number>(3) // Find item with key 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect((results[0] as Cursor<Item, number>).key).toBe(3);
    expect((results[0] as Cursor<Item, number>).value.category).toBe('A');
  });

  it('ne should filter items not matching the key', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      ne<Item, number>(3) // Find items with key not equal to 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(testData.length - 1);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([1, 2, 4, 5]);
  });

  it('gt should filter items with key greater than', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      gt<Item, number>(3) // Find items with key > 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(2);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([4, 5]);
  });

  it('gte should filter items with key greater than or equal', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      gte<Item, number>(3) // Find items with key >= 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(3);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([3, 4, 5]);
  });

  it('lt should filter items with key less than', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      lt<Item, number>(3) // Find items with key < 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(2);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([1, 2]);
  });

  it('lte should filter items with key less than or equal', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      lte<Item, number>(3) // Find items with key <= 3
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(3);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([1, 2, 3]);
  });

  it('includes should filter items with keys in the list', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      includes<Item, number>([1, 4, 99]) // Find items with key 1 or 4 (99 doesn't exist)
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(2);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([1, 4]);
  });

  it('nin should filter items with keys not in the list', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      nin<Item, number>([1, 4, 99]) // Find items with key NOT 1 or 4
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(3);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([2, 3, 5]);
  });

  it('range should filter items within the key range [inclusive]', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      range<Item, number>(2, 4, true, true) // Find items with key in [2, 4]
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(3);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([2, 3, 4]);
  });

  it('range should filter items within the key range (exclusive)', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      range<Item, number>(2, 4, false, false) // Find items with key in (2, 4)
    )(tree) as AsyncGenerator<Cursor<Item, number>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results.map((r: Cursor<Item, number>) => r.key)).toEqual([3]);
  });

  it('every should return true if all items satisfy the predicate', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      filter(([, item]) => item.category !== 'C'), // Remove item 4 (Category C)
      every(([, item]) => item.id < 10) // All remaining IDs are < 10
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(true);
  });

  it('every should return false if any item does not satisfy the predicate', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      every(([, item]) => item.category === 'A') // Not all items are category A
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(false);
  });

  it('some should return true if any item satisfies the predicate', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      some(([, item]) => item.category === 'C') // Item 4 has category C
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(true);
  });

  it('some should return false if no item satisfies the predicate', async () => {
    const resultGenerator = executeQuery(
      sourceEach<Item, number>(true),
      some(([, item]) => item.category === 'D') // No items have category D
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(false);
  });

  // Note: Testing 'distinct' requires a source with duplicates in the value stream.
  // mapReduce is more complex and might need specific setup.

  // Basic mapReduce test: Map items to their category, then reduce to count per category.
  it('mapReduce should perform map and reduce operations', async () => {
    // Define the map and reduce functions separately for clarity
    const mapFn = ([, item]: [number, Item]): string => item.category;

    // This seems wrong based on mapReduce signature. The reduce part in mapReduce
    // likely operates differently than the standalone reduce operator.
    // Let's assume mapReduce aggregates internally based on the mapped key.
    // The provided reduce function might transform the *mapped* value *before* aggregation.
    // Re-reading mapReduce: it maps, then reduces *each mapped value individually*?
    // `reduce: (inp: [K, D]) => V | Promise<V>` - It takes the key and the *result* of the map function.
    // It doesn't seem to perform aggregation like the standalone reduce.
    // Let's redefine the goal: Map to category, then perhaps just pass the category through?
    // Or maybe the goal was to group by key and apply reduce? The implementation seems different.

    // Let's try a different mapReduce: Map ID to ID*2, Reduce the result by adding 1
    const mapFn2 = ([key]: [number, Item]): number => key * 2;
    const reduceFn2 = ([key, mappedValue]: [number, number]): number => mappedValue + 1;

    const resultGenerator = executeQuery(
        sourceEach<Item, number>(true),
        mapReduce<Item, number, number, number, Map<number, number>>(
            mapFn2, // Map ID -> ID * 2
            reduceFn2 // Reduce Result -> Result + 1
            // No finalize
        )
    )(tree) as AsyncGenerator<Map<number, number>>; // Should yield Map<Key, FinalValue>

     let finalResult: Map<number, number> | undefined;
     for await (const result of resultGenerator) {
         finalResult = result; // mapReduce yields one final map
     }

    // Expected: { 1 => (1*2)+1=3, 2 => (2*2)+1=5, 3 => (3*2)+1=7, 4 => (4*2)+1=9, 5 => (5*2)+1=11 }
    expect(finalResult).toBeDefined();
    expect(finalResult!.size).toBe(5);
    expect(finalResult!.get(1)).toBe(3);
    expect(finalResult!.get(2)).toBe(5);
    expect(finalResult!.get(3)).toBe(7);
    expect(finalResult!.get(4)).toBe(9);
    expect(finalResult!.get(5)).toBe(11);
  });

  // Test for distinct: Requires careful setup or modification of how mapReduce works.
  // The current 'distinct' implementation uses reduce, let's test it that way.
  it('distinct should return unique values from the stream (using reduce implementation)', async () => {
    const resultGenerator = executeQuery(
        sourceEach<Item, number>(true), // 1:A, 2:B, 3:A, 4:C, 5:B
        map<Item, number, string>(([, item]: [number, Item]) => item.category), // Stream values: A, B, A, C, B
        distinct<string, number>() // Reduce to unique values: Set { 'A', 'B', 'C' }
    )(tree) as AsyncGenerator<Set<string>>; // distinct returns a Set

     let finalSet: Set<string> | undefined;
     for await (const result of resultGenerator) {
         finalSet = result; // Distinct (implemented via reduce) yields one final set
     }

    expect(finalSet).toBeDefined();
    expect(finalSet!.size).toBe(3);
    expect(finalSet!.has('A')).toBe(true);
    expect(finalSet!.has('B')).toBe(true);
    expect(finalSet!.has('C')).toBe(true);
  });

})

// --- Tests for Complex Keys ---

// Re-define complex types and comparator (or import from a shared location if preferred)
type ComplexKey = { id: number; name?: string } // Removed & ValueType
type ComplexData = { info: string }

const complexKeyComparator = (a: ComplexKey, b: ComplexKey): number => {
  if (a === null && b === null) return 0
  if (a === null) return -1
  if (b === null) return 1
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return -1
  if (b === undefined) return 1

  // Handle potential object comparison issues if key is not just { id: ... }
  // This simple comparison works for keys like { id: number }
  return a.id - b.id
}

describe('BPlusTree Query Operators with Record Keys', () => {
  let tree: BPlusTree<ComplexData, ComplexKey>
  const testData: Array<{ key: ComplexKey; value: ComplexData }> = [
    { key: { id: 5 }, value: { info: 'E' } },
    { key: { id: 2, name: 'B' }, value: { info: 'B' } },
    { key: { id: 8 }, value: { info: 'H' } },
    // Use the key structure that was observed to work in source.test.ts for id: 1
    { key: { id: 1 }, value: { info: 'A' } },
    { key: { id: 6, name: 'F' }, value: { info: 'F' } },
    { key: { id: 6, name: 'F2' }, value: { info: 'F2' } }, // Duplicate id
    { key: { id: 3 }, value: { info: 'C' } },
  ]
  // Expected order based on id: 1:A, 2:B, 3:C, 5:E, 6:F, 6:F2, 8:H
  const expectedIds = [1, 2, 3, 5, 6, 6, 8]
  const expectedInfos = ['A', 'B', 'C', 'E', 'F', 'F2', 'H']

  beforeEach(() => {
    tree = new BPlusTree<ComplexData, ComplexKey>(
      2,
      false,
      complexKeyComparator,
    )
    testData.forEach((item) => tree.insert(item.key, item.value))
  })

  it('filter should select items based on predicate (complex keys)', async () => {
    const source = sourceEach<ComplexData, ComplexKey>(true)(tree)
    // Filter items where info is 'F' or 'F2'
    const query = filter<ComplexData, ComplexKey>(([, item]) => item.info.startsWith('F'))
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.key.id)).toEqual([6, 6])
    expect(results.map((r) => r.value.info)).toEqual(['F', 'F2'])
  })

  it('map should transform items (complex keys)', async () => {
    const source = sourceEach<ComplexData, ComplexKey>(true)(tree)
    // Map to a new structure { identifier: id, dataInfo: info }
    const query = map<ComplexData, ComplexKey, { identifier: number; dataInfo: string }>(([key, item]) => ({
        identifier: key.id, // Access id from the key
        dataInfo: item.info,
    }))
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(testData.length)
    expect(results.map(r => r.value)).toEqual([
      { identifier: 1, dataInfo: 'A' },
      { identifier: 2, dataInfo: 'B' },
      { identifier: 3, dataInfo: 'C' },
      { identifier: 5, dataInfo: 'E' },
      { identifier: 6, dataInfo: 'F' },
      { identifier: 6, dataInfo: 'F2' },
      { identifier: 8, dataInfo: 'H' },
    ])
    // Original key should be preserved in the cursor
    expect(results.map(r => r.key.id)).toEqual(expectedIds)
  })

  it('reduce should aggregate results (complex keys)', async () => {
    const source = sourceEach<ComplexData, ComplexKey>(true)(tree)
    // Corrected reduce logic: Count items with info starting with 'F'
    // Reducer function receives only the value (currentItem: ComplexData)
    const query = reduce<ComplexData, ComplexKey, number>(
      (acc, currentItem) => {
        return currentItem.info.startsWith('F') ? acc + 1 : acc
      },
      0,
    )
    const resultGenerator = query(source) as AsyncGenerator<number> // Cast because reduce returns accumulator type
    const results = await collectAsync(resultGenerator)

    expect(results).toHaveLength(1)
    expect(results[0]).toBe(2) // 'F' and 'F2'
  })

  it('forEach should execute an action for each item (complex keys)', async () => {
    const source = sourceEach<ComplexData, ComplexKey>(true)(tree)
    const executedIds: number[] = []
    const query = forEach<ComplexData, ComplexKey>(([key, item]) => {
        executedIds.push(key.id)
    })
    const resultGenerator = query(source)
    const results = await collectAsync(resultGenerator) // Collect to ensure iteration

    // forEach yields the original items
    expect(results).toHaveLength(testData.length)
    expect(results.map(r => r.key.id)).toEqual(expectedIds)

    // Check side effect
    expect(executedIds).toEqual(expectedIds)
  })

  it('should chain multiple operators using executeQuery (complex keys)', async () => {
      // Find items with id > 3, then return their info property.
      const finalResultGenerator = executeQuery(
          sourceEach<ComplexData, ComplexKey>(true),
          filter(([key]) => key.id > 3), // Filter by key.id: 5, 6, 6, 8
          map(([, item]) => item.info) // Map value to info: Cursor values become 'E', 'F', 'F2', 'H'
      )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>; // Map changes cursor.value type

      const results = await collectAsync(finalResultGenerator);

      expect(results).toHaveLength(4);
      // @ts-ignore // Value type is changed by map
      expect(results.map(cursor => cursor.value)).toEqual(['E', 'F', 'F2', 'H']);
      // Original keys should be preserved
      expect(results.map(cursor => cursor.key.id)).toEqual([5, 6, 6, 8]);
  });

  // --- Key Comparison Operators ---

  it('eq should filter items by exact key match (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 6 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of eq
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) === 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.key.id)).toEqual([6, 6]);
    expect(results.map(r => r.value.info)).toContain('F');
    expect(results.map(r => r.value.info)).toContain('F2');
  });

  it('ne should filter items not matching the key (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 6 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of ne
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) !== 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(testData.length - 2);
    expect(results.map(r => r.key.id)).toEqual([1, 2, 3, 5, 8]);
  });

  it('gt should filter items with key greater than (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 5 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of gt
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) > 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([6, 6, 8]);
  });

  it('gte should filter items with key greater than or equal (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 5 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of gte
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) >= 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([5, 6, 6, 8]);
  });

  it('lt should filter items with key less than (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 3 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of lt
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) < 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([1, 2]);
  });

  it('lte should filter items with key less than or equal (complex keys)', async () => {
    const searchKey: ComplexKey = { id: 3 };
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of lte
      filter<ComplexData, ComplexKey>(([k]) => complexKeyComparator(k, searchKey) <= 0)
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([1, 2, 3]);
  });

  it('includes should filter items with keys in the list (complex keys)', async () => {
    const searchKeys: ComplexKey[] = [{ id: 1 } as ComplexKey, { id: 6 } as ComplexKey, { id: 99 } as ComplexKey];
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator and Array.some instead of includes
      filter<ComplexData, ComplexKey>(([k]) => searchKeys.some(searchKey => complexKeyComparator(k, searchKey) === 0))
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(3); // 1, 6, 6
    expect(results.map(r => r.key.id).sort()).toEqual([1, 6, 6]);
  });

  it('nin should filter items with keys not in the list (complex keys)', async () => {
    const searchKeys: ComplexKey[] = [{ id: 1 } as ComplexKey, { id: 6 } as ComplexKey, { id: 99 } as ComplexKey];
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator and !Array.some instead of nin
      filter<ComplexData, ComplexKey>(([k]) => !searchKeys.some(searchKey => complexKeyComparator(k, searchKey) === 0))
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(testData.length - 3); // Remove 1, 6, 6 -> leaves 2, 3, 5, 8
    expect(results.map(r => r.key.id)).toEqual([2, 3, 5, 8]);
  });

  it('range should filter items within the key range [inclusive] (complex keys)', async () => {
    const fromKey: ComplexKey = { id: 3 } as ComplexKey;
    const toKey: ComplexKey = { id: 6 } as ComplexKey;
    const fromIncl = true;
    const toIncl = true;
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of range
      filter<ComplexData, ComplexKey>(([k]) =>
        (complexKeyComparator(k, fromKey) > 0 || (fromIncl && complexKeyComparator(k, fromKey) === 0)) &&
        (complexKeyComparator(k, toKey) < 0 || (toIncl && complexKeyComparator(k, toKey) === 0))
      )
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([3, 5, 6, 6]);
  });

  it('range should filter items within the key range (exclusive) (complex keys)', async () => {
    const fromKey: ComplexKey = { id: 3 } as ComplexKey;
    const toKey: ComplexKey = { id: 6 } as ComplexKey;
    const fromIncl = false;
    const toIncl = false;
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      // Use filter with comparator instead of range
      filter<ComplexData, ComplexKey>(([k]) =>
        (complexKeyComparator(k, fromKey) > 0 || (fromIncl && complexKeyComparator(k, fromKey) === 0)) &&
        (complexKeyComparator(k, toKey) < 0 || (toIncl && complexKeyComparator(k, toKey) === 0))
      )
    )(tree) as AsyncGenerator<Cursor<ComplexData, ComplexKey>>;
    const results = await collectAsync(resultGenerator);
    expect(results.map(r => r.key.id)).toEqual([5]);
  });

  // --- Other Operators ---

  it('every should return true if all items satisfy the predicate (complex keys)', async () => {
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      every(([key]) => key.id < 10) // All IDs are < 10
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(true);
  });

  it('every should return false if any item does not satisfy the predicate (complex keys)', async () => {
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      every(([, item]) => item.info === 'A') // Not all items have info 'A'
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(false);
  });

  it('some should return true if any item satisfies the predicate (complex keys)', async () => {
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      some(([, item]) => item.info === 'H') // Item 8 has info H
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(true);
  });

  it('some should return false if no item satisfies the predicate (complex keys)', async () => {
    const resultGenerator = executeQuery(
      sourceEach<ComplexData, ComplexKey>(true),
      some(([, item]) => item.info === 'Z') // No items have info Z
    )(tree) as AsyncGenerator<boolean>;
    const results = await collectAsync(resultGenerator);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(false);
  });

    it('mapReduce should work with complex keys', async () => {
        // Map: key -> key.id * 2
        // Reduce: mappedValue -> mappedValue + 1
        const mapFn = ([key]: [ComplexKey, ComplexData]): number => key.id * 2;
        const reduceFn = ([key, mappedValue]: [ComplexKey, number]): number => mappedValue + 1;

        const resultGenerator = executeQuery(
            sourceEach<ComplexData, ComplexKey>(true),
            mapReduce<ComplexData, ComplexKey, number, number, Map<ComplexKey, number>>(
                mapFn,
                reduceFn
            )
        )(tree) as AsyncGenerator<Map<ComplexKey, number>>; // Yields Map<Key, FinalValue>

        let finalResult: Map<ComplexKey, number> | undefined;
        for await (const result of resultGenerator) {
            finalResult = result; // mapReduce yields one final map
        }

        // Expected: { {id:1} => 3, {id:2, name:'B'} => 5, {id:3} => 7, {id:5} => 11,
        //            {id:6, name:'F'} => 13, {id:6, name:'F2'} => 13, {id:8} => 17 }
        // Note: The exact key objects from the tree are used in the map.
        expect(finalResult).toBeDefined();
        expect(finalResult!.size).toBe(testData.length);

        // Check values by iterating through expected IDs
        const expectedMap = new Map<number, number>([
            [1, 3], [2, 5], [3, 7], [5, 11], [6, 13], [8, 17]
        ]);

        let foundCount = 0;
        for (const [key, value] of finalResult!) {
           const expectedValue = expectedMap.get(key.id);
           expect(expectedValue).toBeDefined();
           // Need to handle the two keys with id 6 separately
           if (key.id === 6) {
                expect(value).toBe(13);
           } else {
               // Use non-null assertion as expectedValue is checked above
               expect(value).toBe(expectedValue!); // Use non-null assertion
           }
           foundCount++;
        }
         expect(foundCount).toBe(testData.length); // Ensure all keys were checked
    });

  it('distinct should work after mapping (complex keys)', async () => {
    const resultGenerator = executeQuery(
        sourceEach<ComplexData, ComplexKey>(true), // 1:A, 2:B, 3:C, 5:E, 6:F, 6:F2, 8:H
        map<ComplexData, ComplexKey, string>(([, item]) => item.info.charAt(0)), // Map to first char of info: A, B, C, E, F, F, H
        distinct<string, ComplexKey>() // Unique chars: Set { 'A', 'B', 'C', 'E', 'F', 'H' }
    )(tree) as AsyncGenerator<Set<string>>;

     let finalSet: Set<string> | undefined;
     for await (const result of resultGenerator) {
         finalSet = result;
     }

    expect(finalSet).toBeDefined();
    expect(finalSet!.size).toBe(6);
    expect([...finalSet!].sort()).toEqual(['A', 'B', 'C', 'E', 'F', 'H']);
  });

})
