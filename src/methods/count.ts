import type { Node } from '../types/Node'
import type { ValueType } from '../types/ValueType'
import { find_first_key } from './find_first_key'

export function count<T, K extends ValueType>(
  key: K,
  node: Node<T, K>,
): number {
  let lres = 0
  const start = find_first_key(node.keys, key, node.tree.comparator)
  const nodes = node.tree.nodes

  let i = start
  if (node.leaf) {
    while (node.keys[i] == key) {
      lres++
      i++
    }
  } else {
    const len = node.size
    while (i < len) {
      const res = count(key, nodes.get(node.children[i]))
      lres += res
      i++
    }
  }
  return lres
}
