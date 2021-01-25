import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function borrowLeftR(this: BPlusTree, node: Node) {
  const left_sibling = node.left
  // занимаем крайний слева
  const item = left_sibling.remove(left_sibling.max)
  node.insert(item)
  node.updateStatics()
  left_sibling.updateStatics()
  if (left_sibling.isEmpty) {
    borrowLeftR.call(this, left_sibling)
  }
  left_sibling.commit()
}
