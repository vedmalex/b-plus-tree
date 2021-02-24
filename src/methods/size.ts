import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'

export function size<T, K extends ValueType>(node: Node<T, K>) {
  let lres = 0
  const start = 0
  let i = start
  if (node.leaf) {
    return node.key_num
  } else {
    const nodes = node.tree.nodes
    const len = node.size
    while (i < len) {
      const res = size(nodes.get(node.children[i]))
      lres += res
      i++
    }
    return lres
  }
}
