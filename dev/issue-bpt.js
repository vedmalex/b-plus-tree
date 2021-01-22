const fs = require('fs')
var Benchmark = require('benchmark')
var BPlusTree = require('../dist').BPlusTree
var findIndex = require('../dist/methods/findIndex').findIndex
var RBTree = require('bintrees').RBTree
const { indexOf } = require('benchmark')
var linear = new Benchmark.Suite('Linear search by one element')

const comparator = (a, b) => a[0] - b[0]
const N = 15
const MAX_RAND = 10000000
const SAMPLES = 100
const T = 1


const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

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
console.log(arr)
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

const start = bpt.find(from)
const end = bpt.find(to)
let cur = start
const result = start.keys.filter((i) => from <= i && i <= to)
do {
  cur = cur.right
  result.push(...cur.keys.filter((i) => from <= i && i <= to))
} while (cur.right && cur.right != end.right)

console.log(result)
arr.forEach((i)=>{
  console.log(i, bpt.find(i).keys.indexOf(i))
})
