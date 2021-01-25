import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'
import { reflow } from './reflow'
import { find_last_node } from './find_last_node'

export function insert(tree: BPlusTree, key: ValueType, value: any): boolean {
  let leaf = find_last_node(tree, key)
  if (leaf.keys.indexOf(key) > -1) {
    if (tree.unique) return false
  }
  leaf.insert([key, value])
  reflow(tree, leaf)
  if (leaf.isFull) {
    split(tree, leaf) // Разбиваем узел
  }
  return true
}
