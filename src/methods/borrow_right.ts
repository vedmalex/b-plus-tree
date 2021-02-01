import { Node } from '../types/Node'
import { update_state } from '../types/Node/update_state'
import { update_min_max } from '../types/Node/update_min_max'

export function merge_with_right(
  node: Node,
  right_sibling: Node,
  count: number,
) {
  if (node.leaf) {
    node.keys.push(...right_sibling.keys.splice(0, count))
    node.pointers.push(...right_sibling.pointers.splice(0, count))

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    if (node.size > 0) node.keys.push(node.min)
    node.keys.push(...right_sibling.keys.splice(0, count - 1))
    if (right_sibling.size != count) right_sibling.keys.shift()

    const nodes = node.tree.nodes
    node.children.push(
      ...right_sibling.children.splice(0, count).map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}
