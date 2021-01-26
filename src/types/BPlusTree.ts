import print from 'print-tree'
import { Node } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { walkthrought } from '../methods/walkthrought'
import { count } from '../methods/count'
import { size } from '../methods/size'

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
    key?: ValueType,
    {
      skip = 0,
      take = -1,
      forward = true,
    }: { skip?: number; take?: number; forward?: boolean } = {},
  ) {
    return walkthrought({ tree: this, key, skip, take, forward })
  }

  findFirst(key: ValueType) {
    return walkthrought({ tree: this, key, take: 1, forward: true })[0]
  }

  findLast(key: ValueType) {
    return walkthrought({ tree: this, key, take: 1, forward: false })[0]
  }

  count(key: ValueType) {
    return count(key, this.root)
  }
  size() {
    return size(this.root)
  }
  insert(key: ValueType, value: any): boolean {
    return insert(this, key, value)
  }
  remove(key: ValueType) {
    return remove(this, key, false)
  }
  removeMany(key: ValueType) {
    return remove(this, key, true)
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
  print(node?: Node) {
    print(
      node?.toJSON() ?? this.toJSON().root,
      (node: Node) =>
        `${node.parent ? 'N' : ''}${node.parent ?? ''}${
          node.parent ? '<-' : ''
        }${node.isFull ? '!' : ''}${node.leaf ? 'L' : 'N'}${node.id} <${
          node.min ?? ''
        }:${node.max ?? ''}> ${JSON.stringify(node.keys)} L:${
          node.leaf ? 'L' : 'N'
        }${node.left ?? '-'} R:${node.leaf ? 'L' : 'N'}${node.right ?? '-'} ${
          node.leaf ? node.pointers : ''
        }`,
      (node: Node) => node.children,
    )
  }
}
