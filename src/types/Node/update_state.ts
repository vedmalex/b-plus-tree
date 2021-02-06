import { Node } from '../Node'

export function update_state<T>(node: Node<T>) {
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
    const nodes = node.tree.nodes
    // node.length = node.children.reduce((res, cur) => {
    //   return res + nodes.get(cur).length
    // }, 0)
  }
}
