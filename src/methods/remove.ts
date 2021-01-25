import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { delete_in_node } from './delete_in_node'
import { find_first_node } from './find_first_node'

export function remove(tree: BPlusTree, key: ValueType): boolean {
  let leaf = find_first_node(tree, key)
  if (leaf.keys.indexOf(key) == -1) {
    return false
  } else {
    delete_in_node(tree, leaf, key) // Удалить ключ из вершины
    return true
  }
}
