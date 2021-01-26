import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function can_borrow_right(node: Node) {
  let cur = node
  while (cur) {
    if (cur.right?.key_num > cur.t - 1 && cur.right?.key_num > 1) {
      return cur.right?.key_num - cur.t - 1
    }
    cur = cur.right
  }
  return 0
}
