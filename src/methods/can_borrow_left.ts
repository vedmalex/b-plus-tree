import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'

export function can_borrow_left<T, K extends ValueType>(node: Node<T, K>) {
  const cur = node
  if (cur.left?.size > cur.t - 1 && cur.left?.size > 1) {
    return cur.left?.size - cur.t - 1
  }
  return 0
}
