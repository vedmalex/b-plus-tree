import { Node } from '../types/Node'
import { ValueType } from '../btree'

export function max(node: Node): ValueType {
  return node.leaf
    ? node.keys[node.key_num - 1]
    : node.children[node.key_num].max
}
