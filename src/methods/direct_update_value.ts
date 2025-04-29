import type { Cursor } from '../types/eval/Cursor'
import type { BPlusTree } from '../types/BPlusTree'
import type { ValueType } from '../types/ValueType'

export function direct_update_value<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
  value: T,
): Cursor<T, K> {
  const node = tree.nodes.get(id)
  if (!node.leaf) throw new Error('can not set node')
  node.pointers[pos] = value
  return { done: false, key: node.keys[pos], value: value, node: id, pos: pos }
}
