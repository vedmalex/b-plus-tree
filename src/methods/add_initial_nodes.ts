import { Node } from '../types/Node'
import { update_state } from '../types/Node/update_state'
import { update_min_max } from '../types/Node/update_min_max'

export function add_initial_nodes(obj: Node, nodes: Array<Node>) {
  for (let i = 0; i < nodes.length; i++) {
    const right = nodes[i]
    obj.children.push(right.id)
    obj.keys.push(right.min)
    right.parent = obj
  }
  // always remove first
  obj.keys.shift()

  // update node
  update_state(obj)

  // update and push all needed max and min
  update_min_max(obj)
}
