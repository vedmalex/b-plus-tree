import fs from 'fs'
import { print_node } from '../print_node'
import { BPlusTree } from '../BPlusTree'

const N = 15
// const MAX_RAND = 10000000
// const SAMPLES = 100
// const T = 1

const itemsToGet = JSON.parse(fs.readFileSync('../../dev/test_data.json').toString())

// console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let obj = {},
  arr = [],
  bpt = new BPlusTree(5, true)

for (let i = 0; i < N; i++) {
  obj[i] = itemsToGet[i]
  bpt.insert(itemsToGet[i], i)
  arr.push(itemsToGet[i])
}

fs.writeFileSync('single.log', print_node(bpt).join('\n'))
console.log(print_node(bpt))
arr.forEach((i) => {
  console.log(i, bpt.find(i))
})
