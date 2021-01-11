import { Node } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { find_key } from '../methods/find_key'

export class BPlusTree {
  public t: number // минимальная степень дерева
  public root: Node // указатель на корень дерева
  public unique: boolean
  constructor(t: number, unique: boolean) {
    this.root = new Node(true)
    this.t = t
    this.unique = unique
  }
  find(key: ValueType): ReturnType<typeof find_key> {
    return find_key.call(this, key)
  }
  insert(key: ValueType, value: any) {
    return insert.call(this, key, value)
  }
  remove(key: ValueType) {
    return remove.call(this, key)
  }
}
