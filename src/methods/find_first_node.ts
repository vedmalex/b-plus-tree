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
      while (cur.max < key) {
        if (cur.right) cur = cur.right
        else break
        if (key >= cur.right?.min) break
      }
    }
  }
  return cur
}
