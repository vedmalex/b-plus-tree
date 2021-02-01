import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function can_borrow_left<T>(node: Node<T>) {
  let cur = node
  if (cur.left?.size > cur.t - 1 && cur.left?.size > 1) {
    return cur.left?.size - cur.t - 1
  }
  return 0
}
