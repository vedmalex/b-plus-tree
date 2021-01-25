import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { findFirstPosToInsert } from './findFirstPosToInsert'

export function find_first_node(tree: BPlusTree, key: ValueType) {
  let cur = tree.root
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
