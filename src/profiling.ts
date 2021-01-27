import itemsToGet from './test_data'
import { BPlusTree } from './types/BPlusTree'
globalThis.BPlusTree = BPlusTree
globalThis.itemsToGet = itemsToGet
const N = 10000
// const MAX_RAND = 10000000
const SAMPLES = 1000
const T = 32

console.log(`N ${N} SAMPLES ${SAMPLES} T ${T}`)

let bpt = new BPlusTree(T, false)

for (let i = 0; i < N; i++) {
  bpt.insert(itemsToGet[i], i)
}
console.log(bpt.size())
console.log('Linear search by one element')

globalThis.run = () => {
  console.time('bpt')
  for (let i = 0; i < SAMPLES; i++) {
    const item = itemsToGet[i]
    bpt.find(item)
  }
  console.timeEnd('bpt')
}
