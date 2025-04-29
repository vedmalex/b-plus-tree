import type { Node } from '../Node'
import type { ValueType } from '../ValueType'
import { find_last_node } from '../../methods/find_last_node'
import type { BPlusTree } from '../BPlusTree'
import type { Cursor } from './Cursor'
import { find_first_key } from '../../methods/find_first_key'
import { find_last_key } from '../../methods/find_last_key'
import { find_first_node } from '../../methods/find_first_node'
import { evaluate } from './evaluate'

export function find_range_start<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  include: boolean,
  forward = true,
): Cursor<T, K> {
  let node: Node<T, K>
  let index: number
  if (forward) {
    node = find_first_node(tree, key)
    if (include) {
      index = find_first_key(node.keys, key, tree.comparator)
    } else {
      index = find_last_key(node.keys, key, tree.comparator)
    }
  } else {
    node = find_last_node(tree, key)
    if (include) {
      index = find_last_key(node.keys, key, tree.comparator) - 1
    } else {
      index = find_first_key(node.keys, key, tree.comparator) - 1
    }
  }
  return evaluate(tree, node.id, index)
}
