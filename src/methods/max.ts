import { Node } from '../types/Node'
import { ValueType } from '../btree'

export function max(node: Node): ValueType {
  return node.leaf
    ? node.keys[node.key_num - 1] ?? undefined
    : node.children?.length
    ? node.children[node.size - 1].max
    : undefined
}
