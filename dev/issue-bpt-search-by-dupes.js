const fs = require('fs')
const print = require('print-tree')
var BPlusTree = require('../dist').BPlusTree
var RBTree = require('bintrees').RBTree

// const comparator = (a, b) => a[0] - b[0]
const N = 150
// const MAX_RAND = 10000000
// const SAMPLES = 1000
const T = 20
const dupes = 3

const itemsToGet = JSON.parse(fs.readFileSync('dev/test_data.json').toString())

console.log(`N ${N} T ${T}`)

// const simple = [0, 9, 3, 14, 12, 13, 6, 10, 2, 1, 4, 8, 5, 11, 7]
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

simple.forEach((i)=>{
  console.log(`\ninsert ${i}`)
  for(j = 0; j< dupes; j++) {
    bpt.insert(i, `${i}-${j}`)
  }
  bpt.print()
  console.log(bpt.find(i))
})
console.log(bpt.size())

// fs.writeFileSync('bpt.json', JSON.stringify(bpt.toJSON()))

// let f = bpt.find_last_node(-1);
// do {
//   // console.log(f.keys)
//   f = f.right
// } while (f != null)

// bpt.print()

const res = bpt.find(simple[3], {skip:1, take:6})
console.log(res)

const get = bpt.find(undefined,{skip:17, take:20})
console.log(get)
console.log(bpt.count(simple[3]))
console.log(bpt.size())

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

do {
  let cur
  cur = simple.shift()
  console.log(`\nremove all ${cur}`)

  result = bpt.removeMany(cur)
  bpt.print()
  const find = bpt.find(cur)
  console.log(find.length)
} while(simple.length > 0)

  if(old_clog){
    console.log = old_clog;
  }

  bpt.print()
