import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { findLastPosToInsert, findFirstPosToInsert } from './findPosInsert'

export function find_key(this: BPlusTree, key: ValueType) {
  let cur = this.root
  while (cur.leaf != true) {
    let i = findLastPosToInsert(cur.keys, key)
    cur = cur.children[i]
  }
  return cur
}

export function find_first_key(this: BPlusTree, key: ValueType) {
  let cur = this.root
  while (cur.leaf != true) {
    let i = findFirstPosToInsert(cur.keys, key)
    if (cur.keys[i] == key) {
      // это пограничный элемент, поэтому с тем же номером
      // в children будут те что меньше ключа
      i += 1
    }

    cur = cur.children[i]
  }
  return cur
}
