const fs = require('fs')
const print = require('print-tree')
var BPlusTree = require('./dist').BPlusTree
var RBTree = require('bintrees').RBTree

const comparator = (a, b) => a[0] - b[0]
const N = 15
const MAX_RAND = 10000000
const SAMPLES = 100
const T = 2

const itemsToGet = JSON.parse(fs.readFileSync('test_data.json').toString())

console.log(`N ${N} MAX_RAND ${MAX_RAND} SAMPLES ${SAMPLES} T ${T}`)

let bpt = new BPlusTree(T, true)

const simple = [0, 9, 3, 14, 12, 13, 6, 10, 2, 1, 4, 8, 5, 11, 7]

simple.forEach((i)=>{
  // if(i==11) debugger;
  bpt.insert(i, i)
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

let result
do {
  bpt.print()
  let cur
  cur = simple.shift()
  console.log(cur)
  result = bpt.remove(cur)
  const block = bpt.find(cur)
  console.log(block.keys.indexOf(cur))
} while(simple.length > 0)
