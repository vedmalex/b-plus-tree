import { ValueType } from '../btree'
import { Node } from '../types/Node'

export function attach_one_to_right_after(obj: Node, right: Node, after: Node) {
  let pos = obj.children.indexOf(after)
  obj.children.splice(pos + 1, 0, right)
  obj.keys.splice(pos, 0, right.min)
  right.parent = obj

  // update node
  obj.key_num = obj.keys.length
  obj.size = obj.children.length
  obj.isFull = obj.size > obj.t << 1
  obj.isEmpty = obj.size <= 0

  // update and push all needed max and min
  obj.min = obj.children[0].min
  obj.max = obj.children[obj.key_num].max
}
