import type { Node } from '../types/Node'
import type { ValueType } from '../types/ValueType'

export function max<T, K extends ValueType>(node: Node<T, K>): K {
  const nodes = node.tree.nodes

  return node.leaf
    ? (node.keys[node.key_num - 1] ?? undefined)
    : node.children?.length
      ? nodes.get(node.children[node.size - 1]).max
      : undefined
}
