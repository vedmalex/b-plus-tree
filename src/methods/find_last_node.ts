import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { find_last_pos_to_insert } from './find_last_pos_to_insert'

export function find_last_node(tree: BPlusTree, key: ValueType) {
  let cur = tree.root
  while (cur.leaf != true) {
    let i = find_last_pos_to_insert(cur.keys, key)
    cur = cur.children[i]
  }
  return cur
}
