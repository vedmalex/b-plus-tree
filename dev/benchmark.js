var Benchmark = require('benchmark');
var BPlusTree = require('../dist').BPlusTree;
var RBTree = require('bintrees').RBTree;
var suite = new Benchmark.Suite;

const comparator = (a, b) => a - b;
const N = 100000;
const SAMPLES = 10;

let obj = {}, arr = [], map = new Map(), bpt = new BPlusTree(1000,true),rbTree = new RBTree(comparator);
for (let i = 0; i < N; i++) {
  obj[i] = i;
  map.set(i, i);
  bpt.insert(i,i);
  rbTree.insert(i);
  arr.push(i);
}

const itemsToGet = [];

for (let i = 0; i < SAMPLES; i++) {
  itemsToGet.push(Math.trunc(Math.random()*100000))
}

suite
.add('Map#get', function() {
  for (let i = 0; i < itemsToGet.length; i++) {
    const item = itemsToGet[i];
    map.get(item);
  }
})
.add('Array#indexOf', function() {
  for (let i = 0; i < itemsToGet.length; i++) {
    const item = itemsToGet[i];
    arr.find(i=> i == item)
  }
})
.add('bplTree#find', function() {
  for (let i = 0; i < itemsToGet.length; i++) {
    const item = itemsToGet[i];
    bpt.find(item).keys.indexOf(item);
  }
})
.add('RBTree#find', function() {
  for (let i = 0; i < itemsToGet.length; i++) {
    const item = itemsToGet[i];
    rbTree.find(item);
  }
})
// .add('Hash#hasOwnProperty', function() {
//   for (let i = 0; i < itemsToGet.length; i++) {
//     const item = itemsToGet[i];
//     obj.hasOwnProperty(item);
//   }
// })
// .add('Map#get', function() {
//   for (let i = 0; i < itemsToGet.length; i++) {
//     const item = itemsToGet[i];
//     map.get(item);
//   }
// })
// .add('Hash#prop', function() {
//   for (let i = 0; i < itemsToGet.length; i++) {
//     const item = itemsToGet[i];
//     const found = obj[item];
//   }
// })
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
})

suite.run()
