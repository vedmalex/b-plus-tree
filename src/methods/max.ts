import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'

export function max(node: Node): ValueType {
  const nodes = node.tree.nodes

  return node.leaf
    ? node.keys[node.key_num - 1] ?? undefined
    : node.children?.length
    ? nodes.get(node.children[node.size - 1]).max
    : undefined
}
