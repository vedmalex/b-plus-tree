import { Cursor } from '../types/eval/Cursor'
import { BPlusTree } from '../types/BPlusTree'

export function direct_update_value<T>(
  tree: BPlusTree<T>,
  id: number,
  pos: number,
  value: T,
): Cursor<T> {
  const node = tree.nodes.get(id)
  if (!node.leaf) throw new Error('can not set node')
  node.pointers[pos] = value
  return { done: false, key: node.keys[pos], value: value, node: id, pos: pos }
}
