const {BPlusTree} = require('../dist/types/BPlusTree')
// const {find} = require('../dist/types/find')
const BTree = require('sorted-btree').default
// const test_data = require('./test_data_bm')
globalThis.DEBUG = false
class Timer {
  constructor() {
    this.start = Date.now()
  }
  ms() {
    return Date.now() - this.start
  }
  restart() {
    var ms = this.ms()
    this.start += ms
    return ms
  }
}

function randInt(max) {
  return (Math.random() * max) | 0
}
function swap(keys, i, j) {
  var tmp = keys[i]
  keys[i] = keys[j]
  keys[j] = tmp
}
function makeArray(size, randomOrder, spacing = 10) {
  var keys = [],
    i,
    n
  for (i = 0, n = 0; i < size; i++, n += 1 + randInt(spacing)) keys[i] = n
  if (randomOrder) for (i = 0; i < size; i++) swap(keys, i, randInt(size))
  return keys
}
function measure(message, callback, minMillisec = 600, log = console.log) {
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
for (let size of [1000, 10000, 100000, 1000000 ]) {
  console.log()
  var keys = /* test_data.slice(0, size) */
  makeArray(size, true)
  const len = keys.length
  const indexes = []
  for (let i = 0; i < 1000; i++) {
    indexes.push(Math.trunc(Math.random() * 1000))
  }
  const leaf_size = 2 << 1+Math.log10(size)
  const btree = measure(
    (map) => `Insert ${map.size} pairs in sorted-btree's BTree`,
    () => {
      let map = new BTree()
      for (let k of keys) map.set(k, k)
      return map
    },
  )
  const bptree = measure(
    (map) => `Insert ${map.size} ${leaf_size} pairs in BPlusTree`,
    () => {
      let map = new BPlusTree(leaf_size, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
  const bptree256 = measure(
    (map) => `Insert ${map.size} 256 pairs in BPlusTree`,
    () => {
      let map = new BPlusTree(256, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
  const bptree128 = measure(
    (map) => `Insert ${map.size} 128 pairs in BPlusTree`,
    () => {
      let map = new BPlusTree(128, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
    const bptree64 = measure(
    (map) => `Insert ${map.size} 64 pairs in BPlusTree`,
    () => {
      let map = new BPlusTree(64, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
  const bptree32 = measure(
    (map) => `Insert ${map.size} 32 pairs in BPlusTree`,
    () => {
      let map = new BPlusTree(32, true)
      for (let k of keys) map.insert(k, k)
      return map
    },
  )
  measure(
    (map) => `find ${map.size} items in sorted-btree's BTree`,
    () => {
      for (let i of indexes) btree.get(keys[i])
      return btree
    },
  )
  measure(
    (map) => `find ${map.size} items in BPlusTree`,
    () => {
      for (let i of indexes) bptree.find(keys[i])
      return bptree
    },
  )

  measure(
    (map) => `find first ${map.size} items in BPlusTree`,
    () => {
      for (let i of indexes) bptree.findFirst(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find last ${map.size} items in BPlusTree`,
    () => {
      for (let i of indexes) bptree.findLast(keys[i])
      return bptree
    },
  )
    measure(
    (map) => `find first 256 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree256.findFirst(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find last 256 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree256.findLast(keys[i])
      return bptree
    },
  )
    measure(
    (map) => `find first 128 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree128.findFirst(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find last 128 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree128.findLast(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find first 64 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree64.findFirst(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find last 64 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree64.findLast(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find first 32 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree32.findFirst(keys[i])
      return bptree
    },
  )
  measure(
    (map) => `find last 32 items in BPlusTree`,
    () => {
      for (let i of indexes) bptree32.findLast(keys[i])
      return bptree
    },
  )
}
