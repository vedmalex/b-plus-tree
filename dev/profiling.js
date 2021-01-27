const fs = require('fs')
var BPlusTree = require('../dist').BPlusTree
var SBPlTree = require('sorted-btree').default

const N = 10000
// const MAX_RAND = 10000000
const SAMPLES = 1000
const T = 32

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} SAMPLES ${SAMPLES} T ${T}`)

let
  bpt = new BPlusTree(T, false),
  sbpt = new SBPlTree()

for (let i = 0; i < N; i++) {
  bpt.insert(itemsToGet[i], i)
  sbpt.set(itemsToGet[i], i)
}
console.log(bpt.size())
console.log('Linear search by one element')
console.time('bpt')
debugger
for (let i = 0; i < SAMPLES; i++) {
  const item = itemsToGet[i]
  bpt.find(item)
}
console.timeEnd('bpt')

console.time('sbpt')
for (let i = 0; i < SAMPLES; i++) {
  const item = itemsToGet[i]
  sbpt.get(item)
}
console.timeEnd('sbpt')
