import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { findLastPosToInsert } from './findLastPosToInsert'

export function find_last_node(tree: BPlusTree, key: ValueType) {
  let cur = tree.root
  while (cur.leaf != true) {
    let i = findLastPosToInsert(cur.keys, key)
    cur = cur.children[i]
  }
  return cur
}
