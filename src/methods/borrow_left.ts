import { Node } from '../types/Node'
import { merge_with_left } from './merge_with_left'

export function borrow_left(node: Node, count: number = 1) {
  const left_sibling = node.left

  merge_with_left(node, left_sibling, count)
  left_sibling.updateStatics()
  node.commit()
}
