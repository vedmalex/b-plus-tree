import print from 'print-tree'
import { Node } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { find_key, find_first_key } from '../methods/find_key'
import { findLastPosToInsert } from '../methods/findPosInsert'
import { walkthrought } from './backward'
import { count } from './count'
import { size } from './size'
import { forward } from './forward'

export class BPlusTree {
  public t: number // минимальная степень дерева
  public root: Node // указатель на корень дерева
  public unique: boolean
  constructor(t: number, unique: boolean) {
    this.root = Node.createLeaf(t)
    this.t = t
    this.unique = unique
  }

  find(
    key: ValueType,
    {
      skip = 0,
      take = -1,
      forward = true,
    }: { skip: number; take: number; forward: boolean },
  ) {
    return walkthrought({ tree: this, key, skip, take, forward })
  }

  getAll({
    skip = 0,
    take = -1,
    forward = true,
  }: {
    skip: number
    take: number
    forward: boolean
  }) {
    return walkthrought({ tree: this, skip, take, forward })
  }

  find_last_node(key: ValueType): ReturnType<typeof find_key> {
    return find_key.call(this, key)
  }

  find_first_node(key: ValueType): ReturnType<typeof find_key> {
    return find_first_key.call(this, key)
  }

  findFirst(key: ValueType) {}

  findLast(key: ValueType) {
    return find_key.call(this, key)
  }

  count(key: ValueType) {
    return count(key, this.root)
  }
  size() {
    return size(this.root)
  }
  insert(key: ValueType, value: any): boolean {
    return insert.call(this, key, value)
  }
  remove(key: ValueType): boolean {
    return remove.call(this, key)
  }
  min() {
    return this.root.min
  }
  max() {
    return this.root.max
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
      (node: Node) =>
        `${node.leaf ? 'L' : 'N'}${node.id} <${node.min ?? ''}:${
          node.max ?? ''
        }> ${JSON.stringify(node.keys)} L:${node.leaf ? 'L' : 'N'}${
          node.left ?? '-'
        } R:${node.leaf ? 'L' : 'N'}${node.right ?? '-'} ${
          node.leaf ? node.pointers : ''
        }`,
      (node: Node) => node.children,
    )
  }
}
