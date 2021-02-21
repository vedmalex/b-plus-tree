import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { delete_in_node } from './delete_in_node'
import { find_first_node } from './find_first_node'
import { find_first_item, find_first_item_remove } from './find_first_item'
import { Cursor } from '../types/eval/Cursor'
import { delete_by_cursor_list } from './delete_by_cursor_list'

export function remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  all: boolean = false,
) {
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

export function remove_specific<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  specific: (pointers: T) => boolean,
) {
  let cursors: Array<Cursor<T, K>> = []
  for (let the_one of tree.equalsNulls(key)(tree)) {
    if (specific(the_one.value)) {
      cursors.push(the_one)
    }
  }
  return delete_by_cursor_list<T, K>(tree, cursors)
}
