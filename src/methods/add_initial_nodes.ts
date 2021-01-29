import { Node, update_state } from '../types/Node'

export function add_initial_nodes(obj: Node, nodes: Array<Node>) {
  for (let i = 0; i < nodes.length; i++) {
    const right = nodes[i]
    obj.children.push(right)
    obj.keys.push(right.min)
    right.parent = obj
  }
  // always remove first
  obj.keys.shift()

  // update node
  update_state(obj)

  // update and push all needed max and min
  obj.min = obj.children[0].min
  obj.max = obj.children[obj.key_num].max
}
