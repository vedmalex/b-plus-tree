import { ValueType } from '../btree'
import { Node } from '../types/Node'

export function attach_one_to_right(obj: Node, right: Node | [ValueType, any]) {
  if (right instanceof Node) {
    if (obj.leaf && right.leaf) {
      obj.pointers.push(...right.pointers)
      obj.keys.push(...right.keys)
    } else if (!obj.leaf) {
      obj.children.push(right)
      obj.keys.push(right.max)
      right.parent = obj
    } else {
      throw new Error('nevermind')
    }
  } else {
    if (obj.leaf) {
      const [key, value] = right
      obj.keys.push(key)
      obj.pointers.push(value)
    } else {
      throw new Error("can't attach value to node")
    }
  }
  obj.updateStatics()
}

export function attach_one_to_right_after(obj: Node, right: Node, after: Node) {
  if (!obj.leaf) {
    let pos = obj.children.indexOf(after)
    obj.children.splice(pos + 1, 0, right)
    obj.keys.splice(pos, 0, right.max)
    right.parent = obj
  } else {
    throw new Error("can't be used with leafs")
  }
  obj.updateStatics()
}
