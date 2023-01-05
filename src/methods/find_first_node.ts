import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { find_first_key } from './find_first_key'
import type { Node } from '../types/Node'
export function find_first_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
): Node<T, K> {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)
  const comparator = tree.comparator
  while (cur.leaf != true) {
    const i = find_first_key(cur.keys, key, comparator)
    cur = nodes.get(cur.children[i])
    // for non unique index
    if (!tree.unique) {
      if (
        comparator(key, cur.min) <= 0 &&
        comparator(key, cur.left?.max) <= 0
      ) {
        while (comparator(key, cur.left?.max) <= 0) {
          if (cur.left) {
            cur = cur.left
          } else {
            break
          }
        }
      } else if (comparator(cur.max, key) < 0) {
        while (comparator(cur.max, key) < 0) {
          if (cur.right) cur = cur.right
          else break
          if (comparator(key, cur.right?.min) >= 0) break
        }
      }
    }
  }
  return cur
}
