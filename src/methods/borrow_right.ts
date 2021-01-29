import { Node, update_min_max } from '../types/Node'
import { size } from './size'

export function borrow_right(node: Node, count: number = 1) {
  const right_sibling = node.right
  merge_with_right(node, right_sibling, count)
  // right_sibling.updateStatics()
  node.commit()
}

export function merge_with_right(
  node: Node,
  right_sibling: Node,
  count: number,
) {
  if (node.leaf) {
    node.keys.push(...right_sibling.keys.splice(0, count))
    node.pointers.push(...right_sibling.pointers.splice(0, count))

    // update node
    node.key_num += count
    node.size += count
    node.isEmpty = node.size <= 0

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    right_sibling.key_num -= count
    right_sibling.size -= count
    right_sibling.isFull = right_sibling.size > right_sibling.t << 1
    right_sibling.isEmpty = right_sibling.size <= 0

    update_min_max(right_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    node.keys.push(
      right_sibling.min,
      ...right_sibling.keys.splice(0, count - 1),
    )
    node.children.push(
      ...right_sibling.children.splice(0, count).map((c) => {
        c.parent = node
        return c
      }),
    )

    // update node
    node.key_num += count - 1
    node.size += count
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    right_sibling.key_num -= count
    right_sibling.size -= count
    right_sibling.isFull = right_sibling.size > right_sibling.t << 1
    right_sibling.isEmpty = right_sibling.size <= 0

    update_min_max(right_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}
