import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { find_first_key } from './find_first_key'

export function find_first_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
) {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)

  while (cur.leaf != true) {
    const i = find_first_key(cur.keys, key)
    cur = nodes.get(cur.children[i])
    // for non unique index
    if (!tree.unique) {
      if (key <= cur.min && key <= cur.left?.max) {
        while (key <= cur.left?.max) {
          if (cur.left) {
            cur = cur.left
          } else {
            break
          }
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
