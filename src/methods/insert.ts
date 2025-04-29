import type { BPlusTree } from '../types/BPlusTree'
import type { ValueType } from '../types/ValueType'
import { split } from './split'
import { find_first_node } from './find_first_node'
import { find_first_item } from './find_first_item'

export function insert<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  value: T,
): boolean {
  const leaf = find_first_node(tree, key)
  if (find_first_item(leaf.keys, key, tree.comparator) > -1) {
    if (tree.unique) return false
  }
  leaf.insert([key, value])
  if (leaf.isFull) {
    split(tree, leaf) // Разбиваем узел
  }
  return true
}
