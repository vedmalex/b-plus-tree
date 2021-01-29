import { Node } from '../types/Node'

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
  obj.key_num = obj.keys.length
  obj.size = obj.children.length
  obj.isFull = obj.size > obj.t << 1
  obj.isEmpty = obj.size <= 0

  // update and push all needed max and min
  obj.min = obj.children[0].min
  obj.max = obj.children[obj.key_num].max
}
