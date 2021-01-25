import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function can_borrow_right(tree: BPlusTree, node: Node) {
  let cur = node
  while (cur) {
    if (node.right?.key_num > tree.t - 1 && node.right?.key_num > 1) {
      return true
    }
    cur = cur.right
  }
  return false
}
