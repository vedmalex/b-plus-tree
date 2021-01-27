import { BPlusTree } from './types/BPlusTree'
import BTree from 'sorted-btree'

export class Timer {
  start = Date.now()
  ms() {
    return Date.now() - this.start
  }
  restart() {
    var ms = this.ms()
    this.start += ms
    return ms
  }
}

function randInt(max: number) {
  return (Math.random() * max) | 0
}

function swap(keys: any[], i: number, j: number) {
  var tmp = keys[i]
  keys[i] = keys[j]
  keys[j] = tmp
}

function makeArray(size: number, randomOrder: boolean, spacing = 10) {
  var keys: number[] = [],
    i,
    n
  for (i = 0, n = 0; i < size; i++, n += 1 + randInt(spacing)) keys[i] = n
  if (randomOrder) for (i = 0; i < size; i++) swap(keys, i, randInt(size))
  return keys
}

function measure<T = void>(
  message: (t: T) => string,
  callback: () => T,
  minMillisec: number = 600,
  log = console.log,
) {
  var timer = new Timer(),
    counter = 0,
    ms
  do {
    var result = callback()
    counter++
  } while ((ms = timer.ms()) < minMillisec)
  ms /= counter
  log(Math.round(ms * 10) / 10 + '\t' + message(result))
  return result
}

console.log('Benchmark results (milliseconds with integer keys/values)')
console.log('---------------------------------------------------------')

console.log()
console.log(
  '### Insertions at random locations: sorted-btree vs the competition ###',
)

for (let size of [1000, 10000, 100000, 1000000]) {
  console.log()
  var keys = makeArray(size, true)

  measure(
    (map) => `Insert ${map.size} pairs in sorted-btree's BTree`,
    () => {
      let map = new BTree()
      for (let k of keys) map.set(k, k)
      return map
    },
  )
  measure(
    (map) => `Insert ${map.size} pairs in sorted-btree's BTree set (no values)`,
    () => {
      let map = new BTree()
      for (let k of keys) map.set(k, undefined)
      return map
    },
  )

  measure(
    (map) => `Insert ${map.size} pairs in sorted-btree's BTree`,
    () => {
      let map = new BPlusTree(32, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
  measure(
    (map) => `Insert ${map.size} pairs in sorted-btree's BTree set (no values)`,
    () => {
      let map = new BPlusTree(32, true)
      for (let k of keys) map.insert(k, undefined)
      return map
    },
  )
}

console.log()
console.log('### Insert in order, delete: sorted-btree vs the competition ###')

for (let size of [9999, 1000, 10000, 100000, 1000000]) {
  var log = size === 9999 ? () => {} : console.log
  log()
  var keys = makeArray(size, false),
    i

  let btree = measure(
    (tree) => `Insert ${tree.size} sorted pairs in B+ tree`,
    () => {
      let tree = new BTree()
      for (let k of keys) tree.set(k, k * 10)
      return tree
    },
    600,
    log,
  )
  let btreeSet = measure(
    (tree) => `Insert ${tree.size} sorted keys in B+ tree set (no values)`,
    () => {
      let tree = new BTree()
      for (let k of keys) tree.set(k, undefined)
      return tree
    },
    600,
    log,
  )
  // Another tree for the bulk-delete test
  let btreeSet2 = btreeSet.greedyClone()

  // Bug fix: can't use measure() for deletions because the
  //          trees aren't the same on the second iteration
  var timer = new Timer()

  for (i = 0; i < keys.length; i += 2) btree.delete(keys[i])
  log(`${timer.restart()}\tDelete every second item in B+ tree`)

  for (i = 0; i < keys.length; i += 2) btreeSet.delete(keys[i])
  log(`${timer.restart()}\tDelete every second item in B+ tree set`)

  btreeSet2.editRange(
    btreeSet2.minKey(),
    btreeSet2.maxKey(),
    true,
    (k, v, i) => {
      if ((i & 1) === 0) return { delete: true }
    },
  )
  log(`${timer.restart()}\tBulk-delete every second item in B+ tree set`)
}

console.log()
console.log(
  '### Insertions at random locations: sorted-btree vs Array vs Map ###',
)

for (let size of [9999, 1000, 10000, 100000, 1000000]) {
  // Don't print anything in the first iteration (warm up the optimizer)
  var log = size === 9999 ? () => {} : console.log
  var keys = makeArray(size, true)
  log()

  measure(
    (tree) => `Insert ${tree.size} pairs in B+ tree`,
    () => {
      let tree = new BTree()
      for (let k of keys) tree.set(k, k)
      return tree
    },
    600,
    log,
  )

  measure(
    (map) => `Insert ${map.size} pairs in ES6 Map (hashtable)`,
    () => {
      let map = new Map()
      for (let k of keys) map.set(k, k)
      return map
    },
    600,
    log,
  )
}

console.log()
console.log(
  '### Insert in order, scan, delete: sorted-btree vs Array vs Map ###',
)

for (let size of [1000, 10000, 100000, 1000000]) {
  console.log()
  var keys = makeArray(size, false),
    i

  let tree = measure(
    (tree) => `Insert ${tree.size} sorted pairs in B+ tree`,
    () => {
      let tree = new BTree()
      for (let k of keys) tree.set(k, k * 10)
      return tree
    },
  )

  let map = measure(
    (map) => `Insert ${map.size} sorted pairs in Map hashtable`,
    () => {
      let map = new Map()
      for (let k of keys) map.set(k, k * 10)
      return map
    },
  )

  measure(
    (sum) => `Sum of all values with forEachPair in B+ tree: ${sum}`,
    () => {
      var sum = 0
      tree.forEachPair((k, v) => (sum += v))
      return sum
    },
  )
  measure(
    (sum) => `Sum of all values with forEach in B+ tree: ${sum}`,
    () => {
      var sum = 0
      tree.forEach((v) => (sum += v))
      return sum
    },
  )
  measure(
    (sum) => `Sum of all values with iterator in B+ tree: ${sum}`,
    () => {
      var sum = 0
      // entries() (instead of values()) with reused pair should be fastest
      // (not using for-of because tsc is in ES5 mode w/o --downlevelIteration)
      for (
        var it = tree.entries(undefined, []), next = it.next();
        !next.done;
        next = it.next()
      )
        sum += next.value[1]
      return sum
    },
  )
  measure(
    (sum) => `Sum of all values with forEach in Map: ${sum}`,
    () => {
      var sum = 0
      map.forEach((v) => (sum += v))
      return sum
    },
  )

  measure(
    () => `Delete every second item in B+ tree`,
    () => {
      for (i = keys.length - 1; i >= 0; i -= 2) tree.delete(keys[i])
    },
  )

  measure(
    () => `Delete every second item in Map hashtable`,
    () => {
      for (i = keys.length - 1; i >= 0; i -= 2) map.delete(keys[i])
    },
  )
}

console.log()
console.log('### Measure effect of max node size ###')
{
  console.log()
  var keys = makeArray(100000, true)
  var timer = new Timer()
  for (let nodeSize = 10; nodeSize <= 80; nodeSize += 2) {
    let tree = new BTree([], undefined, nodeSize)
    for (let i = 0; i < keys.length; i++) tree.set(keys[i], undefined)
    console.log(
      `${timer.restart()}\tInsert ${tree.size} keys in B+tree with node size ${
        tree.maxNodeSize
      }`,
    )
  }
}
