import { Node } from '../types/Node'

export function borrow_left(node: Node, count: number = 1) {
  let cur = node
  while (cur) {
    const left_sibling = node.left
    for (let i = 0; i < count; i++) {
      // занимаем крайний слева
      const item = left_sibling.remove(left_sibling.max)
      node.insert(item)
      left_sibling.updateStatics()
    }
    node.commit()
    if (left_sibling.isEmpty) {
      cur = left_sibling
    } else {
      break
    }
  }
}
