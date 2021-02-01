import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'
import { find_first_key } from './find_first_key'

export function count<T>(key: ValueType, node: Node<T>) {
  let lres = 0
  let start = find_first_key(node.keys, key)
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
