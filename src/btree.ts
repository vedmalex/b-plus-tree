import { BPlusTree } from './types/BPlusTree'
import Timer from './utils/time'

export type ValueType = number | string | boolean
const MAX_NUM = 100000
const SAMPLES = 10
const bt = new BPlusTree(6, true)
const timer = new Timer()
const ua = []
timer.start()
for (let i = 0; i <= MAX_NUM; i++) {
  bt.insert(i, i)
}
timer.stop()
console.log('tree', timer.duration.s, 'seconds')

timer.start()
for (let i = 0; i <= MAX_NUM; i++) {
  ua.push(i)
}
timer.stop()
console.log('array', timer.duration.s, 'seconds')

timer.start()
for (let i = 0; i < SAMPLES; i++) {
  const find = Math.ceil(Math.random() * MAX_NUM)
  // const result =
  bt.find(find).keys
  console.log('tree - find', i, find /* , result.indexOf(find) */)
}
timer.stop()
console.log('array find', timer.duration.s, 'seconds')

timer.start()
for (let i = 0; i < SAMPLES; i++) {
  const find = Math.ceil(Math.random() * MAX_NUM)
  // const result =
  ua.indexOf(find)
  console.log(i, find)
}
timer.stop()
console.log(timer.duration.s, 'seconds')

// сделать не уникальные элементы
// проверить удаление

// испрользовать для поиска элемента hash
// индексировать массивы по элементно
// индексировать объекты
// прямой проход
// обратный проход
// range scan

//
