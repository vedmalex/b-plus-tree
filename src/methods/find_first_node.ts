import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { find_first_key } from './find_first_key'

export function find_first_node(tree: BPlusTree, key: ValueType) {
  let cur = tree.root
  while (cur.leaf != true) {
    let i = find_first_key(cur.keys, key)
    cur = cur.children[i]
    // for non unique index
    if (!tree.unique) {
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
  }
  return cur
}
