import { Node } from '../Node'
import { ValueType } from '../ValueType'
import { find_last_node } from '../../methods/find_last_node'
import { find_first_item } from '../../methods/find_first_item'
import { find_first_item_remove } from '../../methods/find_first_item_remove'
import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'

export function find_first_remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  forward: boolean = true,
): Cursor<T, K> {
  let node: Node<T, K>, index: number
  if (forward) {
    node = find_last_node(tree, key)
    if (key != null) {
      index = find_first_item_remove(node.keys, key)
    } else {
      index = find_first_item(node.keys, key)
    }
  } else {
    node = find_last_node(tree, key)
    if (key != null) {
      index = find_first_item_remove(node.keys, key)
    } else {
      index = find_first_item(node.keys, key)
    }
  }
  const value = node.pointers[index]
  return { node: node.id, pos: index, key, value, done: value === undefined }
}
