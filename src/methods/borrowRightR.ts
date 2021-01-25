import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function borrowRightR(this: BPlusTree, node: Node) {
  const right_sibling = node.right
  // Перемещаем минимальный из right_sibling ключ на последнюю позицию в tec
  const item = right_sibling.remove(right_sibling.min)
  node.insert(item)
  node.updateStatics()
  right_sibling.updateStatics()
  if (right_sibling.isEmpty) {
    borrowRightR.call(this, right_sibling)
  }
  right_sibling.commit()
}
