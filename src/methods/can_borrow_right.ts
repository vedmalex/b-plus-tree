import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function can_borrow_right<T>(node: Node<T>) {
  let cur = node
  if (cur.right?.size > cur.t - 1 && cur.right?.size > 1) {
    return cur.right?.size - cur.t - 1
  }
  return 0
}
