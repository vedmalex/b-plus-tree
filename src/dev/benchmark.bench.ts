import { bench, describe, expect } from 'vitest'
import { BPlusTree } from '../../dist'
import { RBTree } from 'bintrees'

const comparator = (a, b) => a - b
const N = 100000
const SAMPLES = 10

let obj = {}
let arr = []
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

const itemsToGet = []

for (let i = 0; i < SAMPLES; i++) {
  itemsToGet.push(Math.trunc(Math.random() * 100000))
}

describe('Сравнение производительности поиска элементов в различных структурах данных', () => {
  bench('Map#get', function () {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i]
      map.get(item)
    }
  })

  bench('Array#indexOf', function () {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i]
      const mapResult = map.get(item)
      const indexResult = arr.indexOf(item)
      expect(indexResult !== -1).toBe(mapResult !== undefined)
    }
  })

  bench('BPlusTree#find', function () {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i]
      const mapResult = map.get(item)
      const bptResult = bpt.find(item)[0]
      expect(bptResult !== undefined).toBe(mapResult !== undefined)
      if (mapResult !== undefined) {
        expect(bptResult).toBe(mapResult)
      }
    }
  })

  bench('RBTree#find', function () {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i]
      const mapResult = map.get(item)
      const rbResult = rbTree.find(item)
      expect(rbResult).toBe(mapResult !== undefined ? item : null)
    }
  })

  bench('Hash#hasOwnProperty', function() {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i];
      const mapResult = map.get(item)
      const hasOwnResult = obj.hasOwnProperty(item);
      expect(hasOwnResult).toBe(mapResult !== undefined)
    }
  })

  bench('Hash#prop', function() {
    for (let i = 0; i < itemsToGet.length; i++) {
      const item = itemsToGet[i];
      const mapResult = map.get(item)
      const propResult = obj[item];
      expect(propResult !== undefined).toBe(mapResult !== undefined)
      if (mapResult !== undefined) {
        expect(propResult).toBe(mapResult)
      }
    }
  })
})
