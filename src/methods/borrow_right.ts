import { Node } from '../types/Node'
import { merge_with_right } from './merge_with_right'

export function borrow_right(node: Node, count: number = 1) {
  const right_sibling = node.right
  merge_with_right(node, right_sibling, count)
  right_sibling.updateStatics()
  node.commit()
}
