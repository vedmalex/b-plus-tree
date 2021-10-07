import { Node } from '../Node'
import { replace_max } from './replace_max'
import { replace_min } from './replace_min'
import { ValueType } from '../ValueType'

export function update_min_max<T, K extends ValueType>(node: Node<T, K>): void {
  if (!node.isEmpty) {
    const nodes = node.tree.nodes
    if (node.leaf) {
      replace_min(node, node.keys[0])
      replace_max(node, node.keys[node.size - 1])
    } else {
      replace_min(node, nodes.get(node.children[0]).min)
      replace_max(node, nodes.get(node.children[node.size - 1]).max)
    }
  } else {
    node.min = undefined
    node.max = undefined
  }
}
