import { Node } from '../types/Node'

export function merge_with_right(
  node: Node,
  right_sibling: Node,
  count: number,
) {
  if (node.leaf) {
    node.keys.push(...right_sibling.keys.splice(0, count))
    node.pointers.push(...right_sibling.pointers.splice(0, count))
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
  }
}
