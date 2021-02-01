import { Node } from '../Node'
import { ValueType } from '../ValueType'
import { find_last_node } from '../../methods/find_last_node'
import { find_first_item } from '../../methods/find_first_item'
import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'

export function find_first<T>(
  tree: BPlusTree<T>,
  key: ValueType,
  forward: boolean = true,
): Cursor<T> {
  let node: Node<T>, index: number
  if (forward) {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key)
  } else {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key)
  }
  return { node: node.id, pos: index, key, value: node.pointers[index] }
}
