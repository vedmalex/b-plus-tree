import { Node } from '../Node'
import { ValueType } from '../ValueType'
import { find_last_node } from '../../methods/find_last_node'
import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'
import { find_first_key } from '../../methods/find_first_key'
import { find_last_key } from '../../methods/find_last_key'
import { find_first_node } from '../../methods/find_first_node'
import { evaluate } from './evaluate'

export function find_range_start<T>(
  tree: BPlusTree<T>,
  key: ValueType,
  include: boolean,
  forward: boolean = true,
): Cursor<T> {
  let node: Node<T>, index: number
  if (forward) {
    node = find_first_node(tree, key)
    if (include) {
      index = find_first_key(node.keys, key)
    } else {
      index = find_last_key(node.keys, key)
    }
  } else {
    node = find_last_node(tree, key)
    if (include) {
      index = find_last_key(node.keys, key) - 1
    } else {
      index = find_first_key(node.keys, key) - 1
    }
  }
  return evaluate(tree, node.id, index)
}