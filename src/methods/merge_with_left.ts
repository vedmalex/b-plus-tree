import { Node } from '../types/Node'

export function merge_with_left(node: Node, left_sibling: Node, count: number) {
  if (node.leaf) {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count),
    )
    node.pointers.unshift(
      ...left_sibling.pointers.splice(left_sibling.pointers.length - count),
    )
  } else {
    node.keys.unshift(
      left_sibling.max,
      ...left_sibling.keys.splice(left_sibling.keys.length - count - 1),
    )
    node.children.unshift(
      ...left_sibling.children
        .splice(left_sibling.children.length - count)
        .map((c) => {
          c.parent = node
          return c
        }),
    )
  }
}

export function merge_as_left(node: Node, left_sibling: Node, count: number) {
  if (node.leaf) {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count),
    )
    node.pointers.unshift(
      ...left_sibling.pointers.splice(left_sibling.pointers.length - count),
    )
  } else {
    node.keys.unshift(
      left_sibling.max,
      ...left_sibling.keys.splice(left_sibling.keys.length - count - 1),
    )
    node.children.unshift(
      ...left_sibling.children
        .splice(left_sibling.children.length - count)
        .map((c) => {
          c.parent = node
          return c
        }),
    )
  }
}
