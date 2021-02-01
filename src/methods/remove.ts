import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { delete_in_node } from './delete_in_node'
import { find_first_node } from './find_first_node'
import { find_first_item } from './find_first_item'

export function remove<T>(
  tree: BPlusTree<T>,
  key: ValueType,
  all: boolean = false,
): boolean | number {
  let leaf = find_first_node(tree, key)
  if (find_first_item(leaf.keys, key) == -1) {
    return false
  } else {
    if (all) {
      do {
        delete_in_node(tree, leaf, key, all) // Удалить ключ из вершины
        leaf = find_first_node(tree, key)
      } while (find_first_item(leaf.keys, key) != -1)
    } else {
      delete_in_node(tree, leaf, key, all) // Удалить ключ из вершины
    }
    return true
  }
}
