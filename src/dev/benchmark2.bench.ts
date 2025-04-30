import fs from 'fs'
import { bench, describe } from 'vitest'
import SBPlTree from 'sorted-btree'
import { RBTree } from 'bintrees'
import { BPlusTree } from '../BPlusTree'
import { find_first_key, find_last_key, find_first_node } from '../methods'

const comparator = (a, b) => a[0] - b[0]
const N = 95000
const MAX_RAND = 10000000
const SAMPLES = 100 // Note: SAMPLES is not directly used by vitest bench for hz calculation, but kept for loop consistency
const T = 510

const itemsToGet = JSON.parse(fs.readFileSync('../../dev/test_data.json').toString())

console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let obj = {}
let arr = []
let map = new Map()
let bpt = new BPlusTree(T, false)
let sbpt = new SBPlTree()
let rbTree = new RBTree(comparator)

for (let i = 0; i < N; i++) {
  obj[i] = itemsToGet[i]
  map.set(itemsToGet[i], i)
  bpt.insert(itemsToGet[i], i)
  sbpt.set(itemsToGet[i], i)
  rbTree.insert([itemsToGet[i], i])
  arr.push(itemsToGet[i])
}
const findArr = [...arr]
arr.sort((a, b) => a - b)

let from = arr[find_first_key(arr, arr[arr.length - 1] / 15, bpt.comparator)]
from += Math.sqrt(from)

let to = arr[find_first_key(arr, arr[arr.length - 1] / 14, bpt.comparator)]
to += Math.sqrt(to)

// console.log('Range from:', from)
// console.log('Range to:', to)

// const nearestFrom = find_first_key(arr, from, bpt.comparator)
// const nearestTo = find_first_key(arr, to, bpt.comparator)

// console.log('Nearest From key in sorted array:', arr[nearestFrom])
// console.log('Nearest To key in sorted array:', arr[nearestTo])

// Optional: Logging the expected results for verification before benchmarking
// const far = findArr.filter((i) => from <= i && i <= to)
// console.log('Expected range result (findArr):', far)

// const it = rbTree.upperBound([from])
// const res = []
// let i = it.prev()
// while ((i = it.next()) !== null) {
//   if (from <= i[0] && i[0] <= to) {
//     res.push(i[0])
//   }
// }
// console.log('Expected range result (RBTree):', res)

// const start = bpt.find_node(from)
// const end = bpt.find_node(to)
// let cur = start
// const resultBpt = [] // Corrected variable name
// if (start) {
//    resultBpt.push(...start.keys.filter((k) => k >= from && k <= to))
//    cur = bpt.nodes.get(start._right) // Start from the right sibling
//    while (cur) {
//      const keysInNode = cur.keys.filter((k) => k <= to); // Filter keys up to 'to'
//      resultBpt.push(...keysInNode);

//      if (cur.max > to || !cur._right || cur.id === end?.id ) { // If current node max exceeds 'to', or no right sibling, or reached end node
//        break;
//      }
//      cur = bpt.nodes.get(cur._right);
//    }
// }
// console.log('Expected range result (BPlusTree):', resultBpt)


describe('Linear search by one element', () => {
  bench('Map#get', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      map.get(item)
    }
  })

  bench('Array#indexOf', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      itemsToGet[findArr.indexOf(item)]
    }
  })

  bench('Array#find', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      findArr.find((el) => el == item) // Corrected find usage
    }
  })

  bench('Array#findFirstIndex (binary search)', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      arr[find_first_key(arr, item, bpt.comparator)] // Using sorted arr
    }
  })

  bench('Array#findLastIndex (binary search)', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      arr[find_last_key(arr, item, bpt.comparator)] // Using sorted arr
    }
  })

  bench('sbplTree#get', () => { // Renamed for clarity
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      sbpt.get(item)
    }
  })

  bench('bplTree#find', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      bpt.find(item)
    }
  })

  bench('bplTree#find-reverse', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      bpt.find(item, { forward: false })
    }
  })

  bench('bplTree#findLast', () => { // Renamed for clarity
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      bpt.findLast(item)
    }
  })

  bench('bplTree#findFirst', () => { // Renamed for clarity
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      bpt.findFirst(item)
    }
  })

  bench('RBTree#find', () => {
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      rbTree.find([item])
    }
  })

  bench('Hash#prop', function () { // Hash property access is usually very fast
    for (let i = N - SAMPLES; i < N; i++) {
      const item = itemsToGet[i]
      const found = obj[item]
    }
  })
})


describe('Range search', () => { // Renamed suite title
  bench('findArr#filter', () => {
    findArr.filter((i) => from <= i && i <= to)
  })

  bench('map#filter', () => {
    ;[...map.values()].filter((i) => from <= i && i <= to) // Note: Creating array from map values might be slow itself
  })

  bench('hash#filter', () => {
    Object.keys(obj)
      .map((i) => parseInt(i, 10))
      .filter((i) => from <= i && i <= to) // Note: Getting keys, parsing, then filtering can be slow
  })

  bench('rbtree#iterator', () => {
    const it = rbTree.upperBound([from])
    const res = []
    let i = it.prev() // Initialize correctly before loop
    while ((i = it.next()) !== null) {
      if (i[0] > to) break // Optimization: stop if current key exceeds 'to'
      if (i[0] >= from) { // Check if key is within range [from, to]
        res.push(i[0])
      }
    }
  })

  bench('bpltree#range', () => { // Renamed for clarity
    const startNode = find_first_node(bpt, from)
    const endNode = find_first_node(bpt, to) // This might not be strictly needed depending on traversal logic

    let cur = startNode
    const result: number[] = []

    while (cur) {
        // Efficiently find the starting index within the current node
        const startIndex = find_first_key(cur.keys, from, bpt.comparator)

        // Iterate through keys from the starting index
        for (let kIdx = startIndex; kIdx < cur.keys.length; kIdx++) {
            const k = cur.keys[kIdx];
            if (k <= to) {
                result.push(k);
            } else {
                // Since keys are sorted, if k > to, no further keys in this or subsequent nodes will match
                cur = null; // Set cur to null to break the outer loop
                break;
            }
        }

        if (cur && cur._right) {
          // Move to the right sibling node only if we haven't broken the loop
           cur = bpt.nodes.get(cur._right)
        } else {
             // No right sibling or loop broken
             break;
        }
    }
    // The result array holds the keys in the range
  })
})