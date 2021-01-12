import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'

export function findPosInsert(a: ValueType[], key: ValueType) {
  // l, r — левая и правая границы
  let l = -1
  let r = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = Math.ceil((l + r) / 2) // m — середина области поиска
    if (a[m] > key) r = m
    else l = m // Сужение границ
  }
  return r
}

export function findFast(a: ValueType[], key: ValueType) {
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

export function find_key(this: BPlusTree, key: ValueType) {
  let cur = this.root
  while (cur.leaf != true) {
    let i = findPosInsert(cur.keys, key)
    cur = cur.children[i]
  }
  return cur
}
