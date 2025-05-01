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
