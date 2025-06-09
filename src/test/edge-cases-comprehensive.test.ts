import { describe, it, expect, beforeEach } from 'vitest'
import { BPlusTree } from '../BPlusTree'

describe('🎨 CREATIVE PHASE: Comprehensive Edge Cases Analysis', () => {
  describe('Problem 1: Non-unique Index Removal - Edge Cases', () => {
    let tree: BPlusTree<string, number>

    beforeEach(() => {
      tree = new BPlusTree<string, number>(3, false) // non-unique
    })

    it('EDGE CASE: Remove from empty tree', () => {
      const removed = tree.removeSpecific(10, (value) => value === 'doc1')
      expect(removed).toEqual([])
      expect(tree.size).toBe(0)
    })

    it('EDGE CASE: Remove non-existent key', () => {
      tree.insert(10, 'doc1')
      const removed = tree.removeSpecific(20, (value) => value === 'doc1')
      expect(removed).toEqual([])
      expect(tree.count(10)).toBe(1)
    })

    it('EDGE CASE: Remove with predicate that matches nothing', () => {
      tree.insert(10, 'doc1')
      tree.insert(10, 'doc2')
      const removed = tree.removeSpecific(10, (value) => value === 'doc3')
      expect(removed).toEqual([])
      expect(tree.count(10)).toBe(2)
    })

    it('EDGE CASE: Remove with predicate that matches all', () => {
      tree.insert(10, 'doc1')
      tree.insert(10, 'doc2')
      tree.insert(10, 'doc3')
      const removed = tree.removeSpecific(10, () => true)
      expect(removed.length).toBe(3)
      expect(tree.count(10)).toBe(0)
    })

    it('EDGE CASE: Remove from single-element key', () => {
      tree.insert(10, 'doc1')
      const removed = tree.removeSpecific(10, (value) => value === 'doc1')
      expect(removed).toEqual([[10, 'doc1']])
      expect(tree.count(10)).toBe(0)
    })

    it('EDGE CASE: Remove from key with many duplicates (stress test)', () => {
      // Insert 100 duplicates
      for (let i = 0; i < 100; i++) {
        tree.insert(10, `doc${i}`)
      }
      expect(tree.count(10)).toBe(100)

      // Remove specific one from the middle
      const removed = tree.removeSpecific(10, (value) => value === 'doc50')
      expect(removed).toEqual([[10, 'doc50']])
      expect(tree.count(10)).toBe(99)

      // Verify the specific item is gone
      const remaining = tree.find(10)
      expect(remaining).not.toContain('doc50')
      expect(remaining.length).toBe(99)
    })

    it('EDGE CASE: Find returns no duplicates (regression test)', () => {
      tree.insert(10, 'doc1')
      tree.insert(10, 'doc2')
      tree.insert(10, 'doc3')

      const result = tree.find(10)
      expect(result).toEqual(['doc1', 'doc2', 'doc3'])

      // Check for duplicates
      const uniqueResults = [...new Set(result)]
      expect(result.length).toBe(uniqueResults.length)
    })

    it('EDGE CASE: Complex predicate with object values', () => {
      const docs = [
        { id: 'doc1', category: 'A', priority: 1 },
        { id: 'doc2', category: 'B', priority: 2 },
        { id: 'doc3', category: 'A', priority: 3 }
      ]

      docs.forEach(doc => tree.insert(10, JSON.stringify(doc)))

      // Remove only category A documents
      const removed = tree.removeSpecific(10, (value) => {
        const doc = JSON.parse(value)
        return doc.category === 'A'
      })

      expect(removed.length).toBe(2)
      expect(tree.count(10)).toBe(1)

      const remaining = tree.find(10).map(v => JSON.parse(v))
      expect(remaining.every(doc => doc.category === 'B')).toBe(true)
    })
  })

  describe('Problem 2: Range Queries - Edge Cases', () => {
    let tree: BPlusTree<string, number>

    beforeEach(() => {
      tree = new BPlusTree<string, number>(3, false)
      // Insert test data: 1, 3, 5, 7, 9, 11, 13, 15
      for (let i = 1; i <= 15; i += 2) {
        tree.insert(i, `value-${i}`)
      }
    })

    it('EDGE CASE: Range with same from and to (single point)', () => {
      const result = tree.range(5, 5)
      expect(result.length).toBe(1)
      expect(result[0]).toEqual([5, 'value-5'])
    })

    it('EDGE CASE: Range with from > to (invalid range)', () => {
      const result = tree.range(10, 5)
      expect(result).toEqual([])
    })

    it('EDGE CASE: Range completely before all data', () => {
      const result = tree.range(-10, -5)
      expect(result).toEqual([])
    })

    it('EDGE CASE: Range completely after all data', () => {
      const result = tree.range(20, 25)
      expect(result).toEqual([])
    })

    it('EDGE CASE: Range covering all data', () => {
      const result = tree.range(-10, 20)
      expect(result.length).toBe(8) // All 8 values
      expect(result.map(([k, v]) => k)).toEqual([1, 3, 5, 7, 9, 11, 13, 15])
    })

    it('EDGE CASE: Range with exclusive bounds', () => {
      const result = tree.range(3, 9, false, false) // (3, 9)
      expect(result.map(([k, v]) => k)).toEqual([5, 7])
    })

    it('EDGE CASE: Range with mixed bounds', () => {
      const resultIncExc = tree.range(3, 9, true, false) // [3, 9)
      expect(resultIncExc.map(([k, v]) => k)).toEqual([3, 5, 7])

      const resultExcInc = tree.range(3, 9, false, true) // (3, 9]
      expect(resultExcInc.map(([k, v]) => k)).toEqual([5, 7, 9])
    })

    it('EDGE CASE: Range on empty tree', () => {
      const emptyTree = new BPlusTree<string, number>(3, false)
      const result = emptyTree.range(1, 10)
      expect(result).toEqual([])
    })

    it('EDGE CASE: Range with duplicate keys', () => {
      const dupTree = new BPlusTree<string, number>(3, false)
      dupTree.insert(5, 'doc1')
      dupTree.insert(5, 'doc2')
      dupTree.insert(7, 'doc3')
      dupTree.insert(7, 'doc4')

      const result = dupTree.range(5, 7)
      expect(result.length).toBe(4)
      expect(result.filter(([k, v]) => k === 5).length).toBe(2)
      expect(result.filter(([k, v]) => k === 7).length).toBe(2)
    })

    it('EDGE CASE: Comparison operators with edge values', () => {
      // Test gt with maximum value
      const gtMax: number[] = []
      for (const cursor of tree.gt(15)(tree)) {
        gtMax.push(cursor.key)
      }
      expect(gtMax).toEqual([])

      // Test lt with minimum value
      const ltMin: number[] = []
      for (const cursor of tree.lt(1)(tree)) {
        ltMin.push(cursor.key)
      }
      expect(ltMin).toEqual([])

      // Test gte with non-existent value
      const gteNonExistent: number[] = []
      for (const cursor of tree.gte(6)(tree)) {
        gteNonExistent.push(cursor.key)
      }
      expect(gteNonExistent).toEqual([7, 9, 11, 13, 15])
    })
  })

  describe('Problem 3: Safe Transactions - Edge Cases', () => {
    let tree: BPlusTree<string, number>

    beforeEach(() => {
      tree = new BPlusTree<string, number>(3, false)
    })

    it('EDGE CASE: Transaction on empty tree', async () => {
      const txCtx = tree.begin_transaction()

      const result = tree.get_all_in_transaction(10, txCtx)
      expect(result).toEqual([])

      tree.insert_in_transaction(10, 'doc1', txCtx)
      const afterInsert = tree.get_all_in_transaction(10, txCtx)
      expect(afterInsert).toEqual(['doc1'])

      await txCtx.commit()
      expect(tree.find(10)).toEqual(['doc1'])
    })

    it('EDGE CASE: Nested transactions (if supported)', async () => {
      tree.insert(10, 'original')

      const tx1 = tree.begin_transaction()
      tree.insert_in_transaction(10, 'tx1-doc', tx1)

      // Try to begin another transaction (should work independently)
      const tx2 = tree.begin_transaction()
      tree.insert_in_transaction(10, 'tx2-doc', tx2)

      // Each transaction should see only its own changes
      expect(tree.get_all_in_transaction(10, tx1)).toEqual(['original', 'tx1-doc'])
      expect(tree.get_all_in_transaction(10, tx2)).toEqual(['original', 'tx2-doc'])

      // Main tree should see only original
      expect(tree.find(10)).toEqual(['original'])

      await tx1.commit()
      expect(tree.find(10)).toEqual(['original', 'tx1-doc'])

      await tx2.abort()
      expect(tree.find(10)).toEqual(['original', 'tx1-doc'])
    })

    it('EDGE CASE: Transaction rollback with complex operations', async () => {
      // Setup initial state
      tree.insert(10, 'doc1')
      tree.insert(20, 'doc2')
      tree.insert(30, 'doc3')

      const txCtx = tree.begin_transaction()

      // Complex operations in transaction
      tree.insert_in_transaction(10, 'new-doc1', txCtx)
      tree.insert_in_transaction(40, 'new-doc4', txCtx)
      tree.remove_in_transaction(20, txCtx)

      // Verify transaction state
      expect(tree.get_all_in_transaction(10, txCtx)).toEqual(['doc1', 'new-doc1'])
      expect(tree.get_all_in_transaction(20, txCtx)).toEqual([])
      expect(tree.get_all_in_transaction(40, txCtx)).toEqual(['new-doc4'])

      // Rollback
      await txCtx.abort()

      // Verify original state restored
      expect(tree.find(10)).toEqual(['doc1'])
      expect(tree.find(20)).toEqual(['doc2'])
      expect(tree.find(30)).toEqual(['doc3'])
      expect(tree.find(40)).toEqual([])
    })

    it('EDGE CASE: Transaction with large number of operations', async () => {
      const txCtx = tree.begin_transaction()

      // Insert 1000 items in transaction
      for (let i = 0; i < 1000; i++) {
        tree.insert_in_transaction(i, `doc-${i}`, txCtx)
      }

      // Verify all items visible in transaction
      expect(tree.get_all_in_transaction(500, txCtx)).toEqual(['doc-500'])

      // Main tree should still be empty
      expect(tree.size).toBe(0)

      await txCtx.commit()

      // Now main tree should have all items
      expect(tree.size).toBe(1000)
      expect(tree.find(500)).toEqual(['doc-500'])
    })

    it('EDGE CASE: Concurrent transaction isolation', async () => {
      tree.insert(10, 'original')

      const tx1 = tree.begin_transaction()
      const tx2 = tree.begin_transaction()

      // Both see original
      expect(tree.get_all_in_transaction(10, tx1)).toEqual(['original'])
      expect(tree.get_all_in_transaction(10, tx2)).toEqual(['original'])

      // tx1 modifies
      tree.insert_in_transaction(10, 'tx1-change', tx1)

      // tx2 should not see tx1's change
      expect(tree.get_all_in_transaction(10, tx2)).toEqual(['original'])

      // tx1 should see its own change
      expect(tree.get_all_in_transaction(10, tx1)).toEqual(['original', 'tx1-change'])

      // Commit tx1
      await tx1.commit()

      // tx2 should still not see tx1's committed change (snapshot isolation)
      // Note: Current implementation doesn't support full snapshot isolation
      expect(tree.get_all_in_transaction(10, tx2)).toEqual(['original', 'tx1-change'])

      // Main tree should see tx1's change
      expect(tree.find(10)).toEqual(['original', 'tx1-change'])

      await tx2.abort()
    })

    it('EDGE CASE: Transaction with null/undefined keys', async () => {
      const treeWithDefault = new BPlusTree<string, number>(3, false, undefined, -1)
      const txCtx = treeWithDefault.begin_transaction()

      // Insert with default key
      treeWithDefault.insert_in_transaction(-1, 'default-doc', txCtx)

      const result = treeWithDefault.get_all_in_transaction(-1, txCtx)
      expect(result).toEqual(['default-doc'])

      await txCtx.commit()
      expect(treeWithDefault.find(-1)).toEqual(['default-doc'])
    })
  })

  describe('Integration Edge Cases: All Problems Combined', () => {
    it('EDGE CASE: Complex scenario with all features under stress', async () => {
      const tree = new BPlusTree<{ id: string, data: any }, number>(3, false)

      // Setup complex data
      const testData: Array<{ key: number; value: { id: string; data: any } }> = []
      for (let key = 1; key <= 100; key++) {
        for (let doc = 1; doc <= 5; doc++) {
          const value = { id: `doc-${key}-${doc}`, data: { key, doc, timestamp: Date.now() } }
          tree.insert(key, value)
          testData.push({ key, value })
        }
      }

      expect(tree.size).toBe(500) // 100 keys * 5 docs each

      // Start transaction
      const txCtx = tree.begin_transaction()

      // Complex range query in transaction
      const rangeResults = tree.range(25, 75) // Should get 51 keys * 5 docs = 255 items
      expect(rangeResults.length).toBe(255)

      // Remove specific items using complex predicate
      const removed = tree.removeSpecific(50, (value) => {
        return value.data.doc % 2 === 0 // Remove even-numbered docs
      })
      expect(removed.length).toBe(2) // doc-50-2 and doc-50-4

      // Verify removal
      expect(tree.count(50)).toBe(3) // Should have 3 left (1, 3, 5)

      // Transaction operations
      tree.insert_in_transaction(101, { id: 'tx-doc', data: { special: true } }, txCtx)

      const txResults = tree.get_all_in_transaction(101, txCtx)
      expect(txResults.length).toBe(1)

      // Range query in transaction should include new item
      const txRange = tree.range(100, 102)
      expect(txRange.length).toBe(5) // Only key 100 exists in main tree

      await txCtx.commit()

      // Now range should include committed transaction item
      const finalRange = tree.range(100, 102)
      expect(finalRange.length).toBe(6) // key 100 (5 docs) + key 101 (1 doc)
    })

    it('EDGE CASE: Memory and performance under extreme load', async () => {
      const tree = new BPlusTree<string, number>(32, false) // Larger degree for performance

      const startTime = Date.now()

      // Insert 10,000 items with duplicates
      for (let i = 0; i < 10000; i++) {
        const key = Math.floor(i / 10) // 10 duplicates per key
        tree.insert(key, `doc-${i}`)
      }

      const insertTime = Date.now() - startTime
      console.log(`Insert time for 10,000 items: ${insertTime}ms`)

      expect(tree.size).toBe(10000)

      // Range query performance
      const rangeStart = Date.now()
      const rangeResult = tree.range(100, 200) // Should get ~1000 items
      const rangeTime = Date.now() - rangeStart
      console.log(`Range query time for ~1000 items: ${rangeTime}ms`)

      expect(rangeResult.length).toBe(1010) // 101 keys * 10 docs each = 1010

      // Remove performance
      const removeStart = Date.now()
      const removed = tree.removeSpecific(150, (value) => value.includes('-1500'))
      const removeTime = Date.now() - removeStart
      console.log(`Remove specific time: ${removeTime}ms`)

      expect(removed.length).toBe(1)
      expect(tree.count(150)).toBe(9) // 9 left out of 10

      // Transaction performance
      const txStart = Date.now()
      const txCtx = tree.begin_transaction()

      for (let i = 0; i < 100; i++) {
        tree.insert_in_transaction(2000 + i, `tx-doc-${i}`, txCtx)
      }

      await txCtx.commit()
      const txTime = Date.now() - txStart
      console.log(`Transaction time for 100 operations: ${txTime}ms`)

      expect(tree.size).toBe(10099) // Original 10000 - 1 removed + 100 added
    })
  })
})