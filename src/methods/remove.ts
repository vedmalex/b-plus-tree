import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { delete_in_node } from './delete_in_node'
import { find_first_node } from './find_first_node'
import { find_first_item_remove } from './find_first_item_remove'

export function remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  all: boolean = false,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  let leaf = find_first_node(tree, key)
  if (find_first_item_remove(leaf.keys, key) > -1) {
    if (all) {
      do {
        result.push(...delete_in_node(tree, leaf, key, all)) // Удалить ключ из вершины
        leaf = find_first_node(tree, key)
      } while (find_first_item_remove(leaf.keys, key) != -1)
    } else {
      result.push(...delete_in_node(tree, leaf, key, all)) // Удалить ключ из вершины
    }
  }
  return result
}
