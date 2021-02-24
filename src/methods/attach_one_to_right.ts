import { ValueType } from '../types/ValueType'
import { Node } from '../types/Node'
import { update_state } from '../types/Node/update_state'
import { update_min_max } from '../types/Node/update_min_max'

export function attach_one_to_right_after<T, K extends ValueType>(
  obj: Node<T, K>,
  right: Node<T, K>,
  after: Node<T, K>,
) {
  const pos = obj.children.indexOf(after.id)
  obj.children.splice(pos + 1, 0, right.id)
  obj.keys.splice(pos, 0, right.min)
  right.parent = obj

  // update node
  update_state(obj)

  // update and push all needed max and min
  update_min_max(obj)
}
