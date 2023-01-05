import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'
import { reflow } from './reflow'
import { find_first_item } from './find_first_item'
import { try_to_pull_up_tree } from './try_to_pull_up_tree'

export function delete_in_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
  key: K,
  all: boolean = false,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  if (all) {
    while (find_first_item(node.keys, key, tree.comparator) != -1) {
      result.push(node.remove(key))
    }
  } else {
    result.push(node.remove(key))
  }
  reflow(tree, node)

  try_to_pull_up_tree(tree)
  return result
}
