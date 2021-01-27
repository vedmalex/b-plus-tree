import print from 'print-tree'
import { Node } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { walkthrought } from '../methods/walkthrought'
import { count } from '../methods/count'
import { size } from '../methods/size'
import { find_last_node } from '../methods/find_last_node'
import { find_first_key } from '../methods/find_first_key'
import { find_first_node } from '../methods/find_first_node'
import { find_last_key } from '../methods/find_last_key'

export type InnerCursor = {
  node: number
  pos: number
  value: any
}
export type Cursor = {
  node: number
  pos: number
  value: any
}

export function get_current_value(tree: BPlusTree, location: Cursor) {
  const node = tree.nodes.get(location.node)
  if (node) {
    return node.pointers[location.pos]
  } else {
    throw new Error('invalid cursor')
  }
}

export function get_next_value(tree: BPlusTree, location: Cursor): Cursor {
  let node = tree.nodes.get(location.node)
  if (node) {
    let next = location.pos + 1
    if (next == node.pointers.length) {
      if (node.right) {
        node = node.right
        next = 0
      }
    }
    return { node: node.id, pos: next, value: node.pointers[next] }
  } else {
    throw new Error('invalid cursor')
  }
}

export function get_previous_value(tree: BPlusTree, location: Cursor) {
  let node = tree.nodes.get(location.node)
  if (node) {
    let next = location.pos - 1
    if (next == -1) {
      if (node.left) {
        node = node.left
        next = 0
      }
    }
    return { node: node.id, pos: next, value: node.pointers[next] }
  } else {
    throw new Error('invalid cursor')
  }
}

// можно использовать скип, относительное перемещение по страницам... зная их размер,можно просто пропускать сколько нужно
// можно в курсорах указывать: отсюда и 10 элементов
// перемещаться так же можно по ключу --- значению

/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */

export class BPlusTree {
  public t: number // минимальная степень дерева
  public root: Node // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node>()
  constructor(t: number, unique: boolean) {
    this.t = t
    this.unique = unique
    this.root = Node.createLeaf(this)
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
    const node = find_first_node(this, key)
    const index = find_first_key(node.keys, key)
    return node.pointers[index]
  }

  findLast(key: ValueType) {
    const node = find_last_node(this, key)
    const index = find_last_key(node.keys, key)
    return node.pointers[index]
  }

  cursor(key: ValueType): Cursor {
    const node = find_last_node(this, key)
    const index = find_last_key(node.keys, key)
    return { node: node.id, pos: index, value: node.pointers[index] }
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
