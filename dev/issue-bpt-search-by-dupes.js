const fs = require('fs')
const print = require('print-tree')
var BPlusTree = require('../dist').BPlusTree
var RBTree = require('bintrees').RBTree

const comparator = (a, b) => a[0] - b[0]
const N = 10
// const MAX_RAND = 10000000
// const SAMPLES = 1000
const T = 4
const dupes = 10

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} T ${T}`)

// const simple = [0, 9, 3, 14, 12, 13, 6, 10, 2, 1, 4, 8, 5, 11, 7]

let
  arr=[],
  bpt = new BPlusTree(T, false)
for (let i = 0; i < N; i++) {
  arr.push(itemsToGet[i])
}
let ordered = [...arr].sort((a,b)=> a-b)
// console.log(ordered)
const simple = arr.map(i => ordered.indexOf(i))

simple.forEach((i)=>{
  bpt.print()
  for(j = 0; j< dupes; j++) {
    bpt.insert(i, `${i}-${j}`)
  }
  console.log(`\ninsert ${i}`)
})

fs.writeFileSync('bpt.json', JSON.stringify(bpt.toJSON()))

let f = bpt.find(-1);
do {
  // console.log(f.keys)
  f = f.right
} while (f != null)

const issues = []
simple.forEach((i)=>{
  let res = bpt.find(i)
  if(res.keys.indexOf(i) == -1) {
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

const res = bpt.findAll(simple[3], 2, 6)
console.log(res)

let result
do {
  let cur
  cur = simple.shift()
  console.log(`\nremove ${cur}`)

  result = bpt.remove(cur)
  const block = bpt.find(cur)
  console.log(block.keys.indexOf(cur))
  bpt.print()
} while(simple.length > 0)
