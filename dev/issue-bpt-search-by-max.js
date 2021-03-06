const fs = require('fs')
const print = require('print-tree')
var BPlusTree = require('../dist').BPlusTree
var RBTree = require('bintrees').RBTree

const comparator = (a, b) => a[0] - b[0]
const N = 20
const MAX_RAND = 10000000
const SAMPLES = 100
const T = 1

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let
  arr=[],
  bpt = new BPlusTree(T, true),
  rbTree = new RBTree(comparator)
for (let i = 0; i < N; i++) {
  rbTree.insert([itemsToGet[i], i])
  arr.push(itemsToGet[i])
}
// console.log(arr)
let ordered = [...arr].sort((a,b)=> a-b)
// console.log(ordered)
const simple = arr.map(i => ordered.indexOf(i))
console.log(simple)
simple.forEach((i)=>{
  bpt.print()
  bpt.insert(i, i)
  console.log(`\ninsert ${i}`)
})


// fs.writeFileSync('bpt.json', JSON.stringify(bpt.toJSON()))

let f = bpt.find(-1);
do {
  // console.log(f.keys)
  f = f.right
} while (f != null)

const issues = []
simple.forEach((i)=>{
  let res = bpt.find(i)
  if(res.keys.indexOf(i) == -1){
    let res = bpt.find(i)
    issues.push(i)
    console.log(i, res.left?.keys,res.keys, res.right?.keys)
    bpt.print()
  }
})

if(issues.length > 0){
  console.log('found issues'),
  console.log(issues)
} else {
  console.log('no issues found')
}

bpt.print()

let result
do {
  let max
  max = bpt.max()
  console.log(`\nremove ${max}`)
  result = bpt.remove(max)
  const block = bpt.find(max)
  console.log(block.keys.indexOf(max))
  bpt.print()
} while(result)
