import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'
import { findPosInsert } from './find_key'
import { min } from './min'
import { max } from './max'

export function insert(this: BPlusTree, key: ValueType, value: any): boolean {
  if (key == 11) debugger
  let leaf = this.find(key)
  if (leaf.keys.indexOf(key) > -1) {
    if (this.unique) return false
  }

  // Ищем позицию для нового ключа
  let pos = findPosInsert(leaf.keys, key)

  // Вставляем ключ
  leaf.keys.splice(pos, 0, key)
  leaf.pointers.splice(pos, 0, value)
  leaf.updateKeyNum()

  if (leaf.key_num == 2 * this.t) {
    // t — степень дерева
    split.call(this, leaf) // Разбиваем узел
  }
  leaf.updateMetrics()
  return true
}
