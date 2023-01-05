const fs = require('fs')

const { print_node } = require('../dist/types/print_node')
const {
  compare_keys_object,
} = require('../dist/methods/utils/comparator_object')

var BPlusTree = require('../dist').BPlusTree

const N = 15
const MAX_RAND = 10000000
const SAMPLES = 100
const T = 1

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

// console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let obj = {},
  arr = [],
  bpt = new BPlusTree(5, true, compare_keys_object)

for (let i = 0; i < N; i++) {
  obj[i] = itemsToGet[i]
  bpt.insert({ item: itemsToGet[i] }, i)
  arr.push(itemsToGet[i])
}

fs.writeFileSync('object.log', print_node(bpt).join('\n'))
console.log(print_node(bpt))
arr.forEach((i) => {
  console.log(i, bpt.find({ item: i }))
})
