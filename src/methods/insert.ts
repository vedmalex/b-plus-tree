import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'
import { find_first_node } from './find_first_node'

export function insert(tree: BPlusTree, key: ValueType, value: any): boolean {
  let leaf = find_first_node(tree, key)
  if (leaf.keys.indexOf(key) > -1) {
    if (tree.unique) return false
  }
  leaf.insert([key, value])
  // leaf.print()
  if (leaf.isFull) {
    split(tree, leaf) // Разбиваем узел
  }
  return true
}
