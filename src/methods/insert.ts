import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'
import { reflow } from './reflow'

export function insert(this: BPlusTree, key: ValueType, value: any): boolean {
  let leaf = this.find(key)
  if (leaf.keys.indexOf(key) > -1) {
    if (this.unique) return false
  }
  leaf.insert([key, value])
  reflow.call(this, leaf)
  if (leaf.isFull) {
    split.call(this, leaf) // Разбиваем узел
  }
  return true
}
