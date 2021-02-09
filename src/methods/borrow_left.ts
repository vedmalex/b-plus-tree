import { Node } from '../types/Node'
import { update_state } from '../types/Node/update_state'
import { update_min_max } from '../types/Node/update_min_max'
import { ValueType } from '../types/ValueType'

export function merge_with_left<T, K extends ValueType>(
  node: Node<T, K>,
  left_sibling: Node<T, K>,
  count: number,
) {
  if (node.leaf) {
    node.keys.unshift(...left_sibling.keys.splice(-count))
    node.pointers.unshift(...left_sibling.pointers.splice(-count))
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
    if (node.size > 0) node.keys.unshift(node.min)
    node.keys.unshift(...left_sibling.keys.splice(-count))
    if (left_sibling.size != count) node.keys.shift()

    const nodes = node.tree.nodes
    node.children.unshift(
      ...left_sibling.children.splice(-count).map((c) => {
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
