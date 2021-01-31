const fs = require('fs')
var BPlusTree = require('../dist').BPlusTree

// const comparator = (a, b) => a[0] - b[0]
const N = 18
// const MAX_RAND = 10000000
// const SAMPLES = 1000
const T = 2
const dupes = 3

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} T ${T}`)

const old_clog = console.log;
// console.log = ()=>undefined

let
  arr=[],
  bpt = new BPlusTree(T, false)

for (let i = 0; i < N; i++) {
  arr.push(itemsToGet[i])
}
let ordered = [...arr].sort((a,b)=> a-b)
// console.log(ordered)
const simple = arr.map(i => ordered.indexOf(i))

const stored = JSON.parse(fs.readFileSync('bpt.json').toString())

BPlusTree.deserialize(bpt, stored)

let result
let i =0
do {
  let cur
  cur = simple[i]
  console.log(`\nremove ${cur}`)

  result = bpt.remove(cur)
  bpt.print(    )
  const find = bpt.find(cur)
  console.log(find.length)
  i+=1
} while(i < simple.length)
bpt.print()

if(dupes > 1){
  do {
    let cur
    cur = simple.shift()
    console.log(`\n\n --- remove all ${cur} --- \n`)
    bpt.print()

    result = bpt.removeMany(cur)
    console.log('\nresult:')
    bpt.print()
    const find = bpt.find(cur)
    console.log(find.length)
  } while(simple.length > 0)

  if(old_clog){
    console.log = old_clog;
  }
}

  bpt.print()
  if(bpt.nodes.size > 1) {
    throw new Error('memory leak')
  } else {
    console.log('clean')
  }
