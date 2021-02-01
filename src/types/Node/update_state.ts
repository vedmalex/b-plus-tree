import { Node } from '../Node'

export function update_state<T>(node: Node<T>) {
  if (node.leaf) {
    node.key_num = node.keys.length
    node.size = node.keys.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
  } else {
    node.key_num = node.keys.length
    node.size = node.children.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
  }
}
