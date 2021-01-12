import { BPlusTree } from './types/BPlusTree'
import Timer from './utils/time'

export type ValueType = number | string | boolean
const MAX_NUM = 1000000
const SAMPLES = 10
const T = 51
const bt = new BPlusTree(T, true)
const timer = new Timer()
const ua = []
timer.start()
for (let i = 0; i <= MAX_NUM; i++) {
  bt.insert(i, i)
}
timer.stop()
console.log('tree insert', timer.duration.s, 'seconds')

timer.start()
for (let i = 0; i <= MAX_NUM; i++) {
  ua.push(i)
}
timer.stop()
console.log('array push', timer.duration.s, 'seconds')
const tofind = []
for (let i = 0; i < SAMPLES; i++) {
  tofind.push(Math.ceil(Math.random() * MAX_NUM))
}

timer.start()
for (let i = 0; i < SAMPLES; i++) {
  const find = tofind[i]
  const result = bt.find(find)
  // result[result.indexOf(find)]
  console.log('tree - find', i, find, result)
}
timer.stop()
console.log('tree find', timer.duration.s, 'seconds')

timer.start()
for (let i = 0; i < SAMPLES; i++) {
  const find = tofind[i]
  const result = ua.indexOf(find)
  console.log(i, find, result)
}
timer.stop()
console.log('array find', timer.duration.s, 'seconds')

// сделать не уникальные элементы
// проверить удаление

// испрользовать для поиска элемента hash
// индексировать массивы по элементно
// индексировать объекты
// прямой проход
// обратный проход
// range scan

//

export function binSearch(a: number[], key: number) {
  // l, r — левая и правая границы
  let l = -1
  let r = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = Math.ceil((l + r) / 2) // m — середина области поиска
    if (a[m] < key) l = m
    else r = m // Сужение границ
  }
  return r
}

const k = [1, 2, 3, 4, 4, 4, 4, 6, 7, 8, 14, 33, 33, 35, 45, 66]
console.log(binSearch(k, 34))
console.log(binSearch(k, 37))
console.log(binSearch(k, 80))
console.log(binSearch(k, -1))
