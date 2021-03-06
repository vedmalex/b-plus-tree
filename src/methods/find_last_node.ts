import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { find_last_key } from './find_last_key'

export function find_last_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
) {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)

  while (cur.leaf != true) {
    const i = find_last_key(cur.keys, key)
    cur = nodes.get(cur.children[i])
  }
  return cur
}
