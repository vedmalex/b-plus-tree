import { Node } from '../Node'
import { ValueType } from '../ValueType'

export function update_state<T, K extends ValueType>(node: Node<T, K>): void {
  if (node.leaf) {
    node.key_num = node.keys.length
    node.size = node.keys.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
    // node.length = node.size
  } else {
    node.key_num = node.keys.length
    node.size = node.children.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
    // const nodes = node.tree.nodes
    // node.length = node.children.reduce((res, cur) => {
    //   return res + nodes.get(cur).length
    // }, 0)
  }
}
