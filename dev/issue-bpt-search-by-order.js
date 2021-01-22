const fs = require('fs')
var BPlusTree = require('../dist').BPlusTree
var Timer = require('../dist/utils/time').default
const comparator = (a, b) => a[0] - b[0]
const N = 200000
// const MAX_RAND = 10000000
// const SAMPLES = 1000
const T = 500

const timer = new Timer()

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} T ${T}`)
let
  arr=[],
  bpt = new BPlusTree(T, true)
for (let i = 0; i < N; i++) {
  arr.push(itemsToGet[i])
}
let ordered = [...arr].sort((a,b)=> a-b)
const simple = arr.map(i => ordered.indexOf(i))
timer.start()

simple.forEach((i)=>{
  bpt.insert(i, i)
})
timer.stop()
console.log(`insert took ${timer.duration.ms}`)
const issues = []

timer.start()
simple.forEach((i)=>{
  let res = bpt.find(i)
  if(res.keys.indexOf(i) == -1) {
    let res = bpt.find(i)
    issues.push(i)
    console.log(i, res.left?.keys,res.keys, res.right?.keys)
    bpt.print()
  }
})
timer.stop()
console.log(`find took ${timer.duration.ms/simple.length} ms per one`)

if(issues.length > 0){
  console.log('found issues'),
  console.log(issues)
} else {
  console.log('no issues found')
}

// bpt.print()

timer.start()
const count = simple.length
let result
do {
  let cur
  cur = simple.shift()
  // console.log(`\nremove ${cur}`)
  result = bpt.remove(cur)
  const block = bpt.find(cur)
  // console.log(block.keys.indexOf(cur))
  // bpt.print()
} while(simple.length > 0)
// bpt.print()

timer.stop()
console.log(`remove all item one by one took ${timer.duration.ms/count} ms per one`)