import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { findPosInsert } from './findPosInsert'

export function find_key(this: BPlusTree, key: ValueType) {
  let cur = this.root
  while (cur.leaf != true) {
    let i = findPosInsert(cur.keys, key)
    cur = cur.children[i]
  }
  return cur
}
