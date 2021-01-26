import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function can_borrow_left(node: Node) {
  let cur = node
  // while (cur) {
  if (cur.left?.key_num > cur.t - 1 && cur.left?.key_num > 1) {
    return cur.left?.key_num - cur.t - 1
  }
  //   cur = cur.left
  // }
  return 0
}
