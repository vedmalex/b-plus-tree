import { ValueType } from '../types/ValueType'
import { Node, update_state, update_min_max } from '../types/Node'

export function attach_one_to_right_after(obj: Node, right: Node, after: Node) {
  let pos = obj.children.indexOf(after.id)
  obj.children.splice(pos + 1, 0, right.id)
  obj.keys.splice(pos, 0, right.min)
  right.parent = obj

  // update node
  update_state(obj)

  // update and push all needed max and min
  update_min_max(obj)
}
