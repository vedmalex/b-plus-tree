import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function canBorrowLeft(this: BPlusTree, node: Node) {
  let cur = node
  while (cur) {
    if (node.left?.key_num > this.t - 1 && node.left?.key_num > 1) {
      return true
    }
    cur = cur.left
  }
  return false
}
