const fs = require('fs')
var Benchmark = require('benchmark')
var BPlusTree = require('../dist').BPlusTree
var findIndex = require('../dist/methods/findIndex').findIndex
var RBTree = require('bintrees').RBTree
const { indexOf } = require('benchmark')
var linear = new Benchmark.Suite('Linear search by one element')

const comparator = (a, b) => a[0] - b[0]
const N = 10000
const MAX_RAND = 10000000
const SAMPLES = 100
const T = 51

const itemsToGet = JSON.parse(fs.readFileSync('test_data.json').toString())

console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let obj = {},
  arr = [],
  map = new Map(),
  bpt = new BPlusTree(T, true),
  rbTree = new RBTree(comparator)
for (let i = 0; i < N; i++) {
  obj[i] = itemsToGet[i]
  map.set(itemsToGet[i], i)
  bpt.insert(itemsToGet[i], i)
  rbTree.insert([itemsToGet[i], i])
  arr.push(itemsToGet[i])
}
const findArr = [...arr]
arr.sort((a, b) => a - b)

let from = arr[findIndex(arr, arr[arr.length - 1] / 15)]
from += Math.sqrt(from)

let to = arr[findIndex(arr, arr[arr.length - 1] / 14)]
to += Math.sqrt(to)

console.log(from)
console.log(to)

nearestFrom = findIndex(arr, from)
nearestTo = findIndex(arr, to)

console.log(arr[nearestFrom])
console.log(arr[nearestTo])

const far = findArr.filter((i) => from <= i && i <= to)

console.log(far)

const it = rbTree.upperBound([from])
const res = []
it.prev()
while ((i = it.next()) !== null) {
  // do stuff with item
  if (from <= i[0] && i[0] <= to) {
    res.push(i[0])
  }
}
console.log(res)

const start = bpt.find(from)
const end = bpt.find(to)
let cur = start
const result = start.keys.filter((i) => from <= i && i <= to)
do {
  cur = cur.right
  result.push(...cur.keys.filter((i) => from <= i && i <= to))
} while (cur.right && cur.right != end.right)

console.log(result)

console.log('Linear search by one element')

linear
  .add('Map#get', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      map.get(item)
    }
  })
  .add('Array#indexOf', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      itemsToGet[findArr.indexOf(item)]
    }
  })
  .add('Array#find', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      findArr.find((i) => i == item)
    }
  })
  .add('Array#findIndex', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      arr[findIndex(findArr, item)]
    }
  })
  .add('bplTree#find', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      bpt.find(item)
    }
  })
  .add('RBTree#find', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      rbTree.find([item])
    }
  })
  .add('Hash#prop', function () {
    for (let i = 0; i < SAMPLES; i++) {
      const item = itemsToGet[i]
      const found = obj[item]
    }
  })
  .on('cycle', function (event) {
    console.log(String(event.target), Math.ceil(event.target.hz / SAMPLES))
    // console.log(event.target);
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })

linear.run()
//
console.log('interval search by one element')

var range = new Benchmark.Suite('range search by one element')

range
  .add('findArr#filter', () => {
    findArr.filter((i) => from <= i && i <= to)
  })
  .add('map#filter', () => {
    ;[...map.values()].filter((i) => from <= i && i <= to)
  })
  .add('hash#filter', () => {
    Object.keys(obj)
      .map((i) => parseInt(i, 10))
      .filter((i) => from <= i && i <= to)
  })
  .add('rbtree#iterator', () => {
    const it = rbTree.upperBound([from])
    const res = []
    it.prev()
    while ((i = it.next()) !== null) {
      // do stuff with item
      if (from <= i[0] && i[0] <= to) {
        res.push(i[0])
      }
    }
  })
  .add('bpltree', () => {
    const start = bpt.find(from)
    const end = bpt.find(to)
    let cur = start
    const result = start.keys.filter((i) => from <= i && i <= to)
    do {
      cur = cur.right
      result.push(...cur.keys.filter((i) => from <= i && i <= to))
    } while (cur.right && cur.right != end.right)
  })
  .on('cycle', function (event) {
    console.log(String(event.target), Math.ceil(event.target.hz / SAMPLES))
    // console.log(event.target);
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })

range.run()
