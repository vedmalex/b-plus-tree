import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from './BPlusTree'
import { sourceEach } from './source' // Use a basic source for testing queries
import {
  filter,
  map,
  reduce,
  forEach,
  // Import other query operators as needed:
  // distinct, eq, every, gt, gte, includes, lt, lte, mapReduce, ne, nin, range, some
} from './query'
import { query as executeQuery } from './types' // Assuming the query executor is here

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
      const query = reduce<Item, number, number>(
          async (sum, currentItem) => {
              await new Promise(resolve => setTimeout(resolve, 1));
              return currentItem.active ? sum + currentItem.id : sum;
          },
          0, // Initial sum
      )
      const resultGenerator = query(source)
      const results = await collectAsync(resultGenerator) // Active items: 1, 3, 4, 5 -> Sum = 13

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
      )(tree); // Execute with the tree

      // Collect the results from the generator
      const results = await collectAsync(finalResultGenerator);

      // Expected: Cursors for items 1 and 3, with their values mapped to their keys.
      expect(results).toHaveLength(2);
      // Check the mapped values within the cursors
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
       )(tree);

       const results = await collectAsync(finalResult);
       expect(results).toHaveLength(1); // Reduce yields one value
       expect(results[0]).toBe(7);
   });


  // Add tests for other query operators: distinct, eq, every, gt, gte, includes, lt, lte, mapReduce, ne, nin, range, some
})
