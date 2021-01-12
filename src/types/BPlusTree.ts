import print from 'print-tree'
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
  min() {
    //первый элемент
    let cur = this.root
    while (!cur.leaf) {
      cur = cur.children[0]
    }
    return cur.keys[0]
  }
  max() {
    let cur = this.root
    while (!cur.leaf) {
      cur = cur.children[cur.children.length - 1]
    }
    return cur.keys[cur.keys.length - 1]
  }
  toJSON() {
    return {
      t: this.t,
      unique: this.unique,
      root: this.root.toJSON(),
    }
  }
  print() {
    print(
      this.toJSON().root,
      (node) =>
        `${node.id} <${node.min ?? ''}:${node.max ?? ''}> ${JSON.stringify(
          node.keys,
        )}`,
      (node) => node.children,
    )
  }
}
