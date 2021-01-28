import { Node } from '../types/Node'

export function borrow_left(node: Node, count: number = 1) {
  const left_sibling = node.left

  merge_with_left(node, left_sibling, count)

  node.commit()
}

function merge_with_left(node: Node, left_sibling: Node, count: number) {
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
    node.isEmpty = false

    // update and push all needed max and min
    node.min = node.keys[0]
    node.max = node.keys[node.key_num - 1]

    // update sibling
    left_sibling.key_num -= count
    left_sibling.size -= count
    left_sibling.isFull = false

    left_sibling.min = left_sibling.keys[0]
    left_sibling.max = left_sibling.keys[left_sibling.key_num - 1]
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
    node.isEmpty = false

    // update and push all needed max and min
    node.min = node.children[0].min
    node.max = node.children[node.key_num].max

    // update sibling
    left_sibling.key_num -= count
    left_sibling.size -= count
    left_sibling.isFull = false

    left_sibling.min = left_sibling.children[0].min
    left_sibling.max = left_sibling.children[left_sibling.key_num].max
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}
