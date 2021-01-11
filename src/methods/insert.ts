import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'

export function insert(this: BPlusTree, key: ValueType, value: any): boolean {
  let leaf = this.find(key)
  if (leaf.keys.indexOf(key) > -1) {
    if (this.unique) return false
  }

  // Ищем позицию для нового ключа
  let pos = 0
  while (pos < leaf.key_num && leaf.keys[pos] < key) {
    ++pos
  }

  // Вставляем ключ
  for (let i = leaf.key_num; i >= pos + 1; i--) {
    leaf.keys[i] = leaf.keys[i - 1]
    leaf.pointers[i] = leaf.pointers[i - 1]
  }
  leaf.keys[pos] = key
  leaf.pointers[pos] = value
  ++leaf.key_num

  if (leaf.key_num == 2 * this.t) {
    // t — степень дерева
    split.call(this, leaf) // Разбиваем узел
  }
  return true
}
