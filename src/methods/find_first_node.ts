import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { find_first_pos_to_insert } from './find_first_pos_to_insert'

export function find_first_node(tree: BPlusTree, key: ValueType) {
  let cur = tree.root
  while (cur.leaf != true) {
    let i = find_first_pos_to_insert(cur.keys, key)
    cur = cur.children[i]
    //searchion exact first node!!!
    if (key <= cur.min && key <= cur.left?.max) {
      while (key <= cur.left?.max) {
        cur = cur.left
      }
    } else if (cur.max < key) {
      while (key >= cur.right?.min && cur.right) {
        cur = cur.right
      }
    }
  }
  return cur
}
