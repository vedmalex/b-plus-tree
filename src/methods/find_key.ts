import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'

export function findIndex(a: ValueType[], key: ValueType) {
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
    const leafCount = cur.key_num
    let i = findIndex(cur.keys, key)
    cur = cur.children[i]
    // for (let i = 0; i <= leafCount; i++) {
    //   if (i == leafCount || key < cur.keys[i]) {
    //     cur = cur.children[i]
    //     break
    //   }
    // }
  }
  return cur
}
