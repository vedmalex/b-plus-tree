import { Node, update_min_max } from '../types/Node'

export function borrow_left(node: Node, count: number = 1) {
  const left_sibling = node.left

  merge_with_left(node, left_sibling, count)

  node.commit()
}

export function merge_with_left(node: Node, left_sibling: Node, count: number) {
  if (node.leaf) {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count),
    )
    node.pointers.unshift(
      ...left_sibling.pointers.splice(left_sibling.pointers.length - count),
    )
    // update node
    node.key_num += count
    node.size += count
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0

    // update and push all needed max and min
    update_min_max(node)

    // update sibling
    left_sibling.key_num -= count
    left_sibling.size -= count
    left_sibling.isFull = left_sibling.size > left_sibling.t << 1
    left_sibling.isEmpty = left_sibling.size <= 0

    update_min_max(left_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count + 1),
    )
    // remove left because it is not balanced with children we have
    left_sibling.keys.pop()

    node.children.unshift(
      ...left_sibling.children
        .splice(left_sibling.children.length - count)
        .map((c) => {
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
    left_sibling.key_num -= count
    left_sibling.size -= count
    left_sibling.isFull = left_sibling.size > left_sibling.t << 1
    left_sibling.isEmpty = left_sibling.size <= 0

    update_min_max(left_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}
