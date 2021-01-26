import { ValueType } from '../btree'
import { attach_one_to_right } from './attach_one_to_right'
import { Node } from '../types/Node'

export function attach_many_to_right(
  obj: Node,
  right: Array<Node | [ValueType, any]>,
) {
  right.forEach((item) => attach_one_to_right(obj, item))
}
