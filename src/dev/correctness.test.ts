import { test, describe, expect } from 'vitest'
import { BPlusTree } from '../BPlusTree'
import { RBTree } from 'bintrees'

const comparator = (a, b) => a - b
const N = 100000
const SAMPLES = 10

// Setup: Create and populate data structures
let obj = {}
let arr: number[] = []
let map = new Map()
let bpt = new BPlusTree(1000, true)
let rbTree = new RBTree(comparator)

for (let i = 0; i < N; i++) {
  obj[i] = i
  map.set(i, i)
  bpt.insert(i, i)
  rbTree.insert(i)
  arr.push(i)
}

// Generate random items to test find operations
const itemsToTest: number[] = []
for (let i = 0; i < SAMPLES; i++) {
  itemsToTest.push(Math.trunc(Math.random() * N * 1.1))
}

describe('Correctness of find operations across data structures', () => {
  itemsToTest.forEach(item => {
    const expectedResult = map.get(item)
    const expectedPresence = expectedResult !== undefined

    test(`Array#indexOf consistency for item ${item}`, () => {
      const indexResult = arr.indexOf(item)
      expect(indexResult !== -1).toBe(expectedPresence)
    })

    test(`BPlusTree#find consistency for item ${item}`, () => {
      const bptResult = bpt.find(item)[0]
      expect(bptResult !== undefined).toBe(expectedPresence)
      if (expectedPresence) {
        expect(bptResult).toBe(expectedResult)
      }
    })

    test(`RBTree#find consistency for item ${item}`, () => {
      const rbResult = rbTree.find(item)
      expect(rbResult !== null).toBe(expectedPresence)
      if (expectedPresence) {
        expect(rbResult).toBe(item)
      }
    })

    test(`Hash#hasOwnProperty consistency for item ${item}`, () => {
      const hasOwnResult = obj.hasOwnProperty(item);
      expect(hasOwnResult).toBe(expectedPresence)
    })

    test(`Hash#prop consistency for item ${item}`, () => {
      const propResult = obj[item];
      expect(propResult !== undefined).toBe(expectedPresence)
      if (expectedPresence) {
        expect(propResult).toBe(expectedResult)
      }
    })
  })
})