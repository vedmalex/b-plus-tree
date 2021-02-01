import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'

export function min<T>(node: Node<T>): ValueType {
  const nodes = node.tree.nodes
  return node.leaf
    ? node.keys[0] ?? undefined
    : node.children?.length
    ? nodes.get(node.children[0]).min
    : undefined
}
