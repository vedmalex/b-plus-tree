import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { split } from './split'
import { update } from './update'

export function insert(this: BPlusTree, key: ValueType, value: any): boolean {
  this.history.push(['insert:start', key, this.toJSON()])
  let leaf = this.find(key)
  if (leaf.keys.indexOf(key) > -1) {
    if (this.unique) return false
  }

  // Ищем позицию для нового ключа
  let pos = 0
  const leafCount = leaf.key_num
  while (pos < leafCount && leaf.keys[pos] < key) {
    ++pos
  }
  // Вставляем ключ
  leaf.keys.splice(pos, 0, key)
  leaf.pointers.splice(pos, 0, value)
  ++leaf.key_num

  if (leaf.key_num == 2 * this.t) {
    // t — степень дерева
    split.call(this, leaf) // Разбиваем узел
    this.history.push(['insert:after-split', key, this.toJSON()])
  }
  if ((this.history[this.history.length - 1][0] = 'insert:start')) {
    this.history.pop()
  }
  this.history.push(['insert:done', key, this.toJSON()])

  // update.call(leaf)
  return true
}
