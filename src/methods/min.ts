import { Node } from '../types/Node'
import { ValueType } from '../btree'

export function min(node: Node): ValueType {
  return node.leaf ? node.keys[0] : node.children[0].min
}
