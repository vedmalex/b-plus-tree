import { Node, update_min_max, update_state } from '../types/Node'

export function borrow_left(node: Node, count: number) {
  const left_sibling = node.left

  borrow(node, left_sibling, count)

  // node.commit()
  // left_sibling.commit()
}

function borrow(node: Node, left_sibling: Node, count: number) {
  if (node.leaf) {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count),
    )
    node.pointers.unshift(
      ...left_sibling.pointers.splice(left_sibling.pointers.length - count),
    )
    // update node
    update_state(node)

    // update and push all needed max and min
    update_min_max(node)

    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count + 1),
    )
    // remove left because it is not balanced with children we have
    left_sibling.keys.pop()

    const nodes = node.tree.nodes
    node.children.unshift(
      ...left_sibling.children
        .splice(left_sibling.children.length - count)
        .map((c) => {
          nodes.get(c).parent = node
          return c
        }),
    )

    // update node
    update_state(node)
    // update and push all needed max and min
    update_min_max(node)
    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}

export function merge_with_left(node: Node, left_sibling: Node) {
  if (node.leaf) {
    node.keys.unshift(...left_sibling.keys)
    node.pointers.unshift(...left_sibling.pointers)
    // update node
    update_state(node)

    // update and push all needed max and min
    update_min_max(node)

    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    node.keys.unshift(
      node.min,
      ...left_sibling.keys.splice(left_sibling.keys.length),
    )
    // remove left because it is not balanced with children we have
    left_sibling.keys.pop()

    const nodes = node.tree.nodes
    node.children.unshift(
      ...left_sibling.children.map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)
    // update and push all needed max and min
    update_min_max(node)
    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}
