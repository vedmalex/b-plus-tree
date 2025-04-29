import type { Node } from '../Node'
import type { ValueType } from '../ValueType'
import { find_last_node } from '../../methods/find_last_node'
import { find_first_item } from '../../methods/find_first_item'
import type { BPlusTree } from '../BPlusTree'
import type { Cursor } from './Cursor'

export function find_first<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  forward = true,
): Cursor<T, K> {
  let node: Node<T, K>
  let index: number
  if (forward) {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key, tree.comparator)
  } else {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key, tree.comparator)
  }
  const value = node.pointers[index]
  return { node: node.id, pos: index, key, value, done: value === undefined }
}
