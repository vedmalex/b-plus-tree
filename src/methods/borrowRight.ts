import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function borrowRight(this: BPlusTree, node: Node, count: number = 1) {
  let cur = node
  while (cur) {
    const right_sibling = node.right
    for (let i = 0; i < count; i++) {
      // занимаем крайний слева
      const item = right_sibling.remove(right_sibling.min)
      node.insert(item)
      right_sibling.updateStatics()
    }
    node.commit()
    if (right_sibling.isEmpty) {
      cur = right_sibling
    } else {
      break
    }
  }
}
