import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'

export function can_borrow_right<T, K extends ValueType>(
  node: Node<T, K>,
): number {
  const cur = node
  if (cur.right?.size > cur.t - 1 && cur.right?.size > 1) {
    return cur.right?.size - cur.t - 1
  }
  return 0
}
