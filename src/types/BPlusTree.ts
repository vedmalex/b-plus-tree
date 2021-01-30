import print from 'print-tree'
import { Node, PortableNode } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { count } from '../methods/count'
import { size } from '../methods/size'
import { find_last_node } from '../methods/find_last_node'
import { find_first_key } from '../methods/find_first_key'
import { find_first_node } from '../methods/find_first_node'
import { find_last_key } from '../methods/find_last_key'
import { find_first_item } from '../methods/find_first_item'

export type Cursor = {
  node: number
  pos: number
  key: ValueType
  value: any
}

export function evaluate(tree: BPlusTree, id: number, pos: number): Cursor {
  let cur = tree.nodes.get(id)
  while (cur) {
    let len = cur.pointers.length
    if (pos >= len) {
      cur = cur.right
      pos -= len
    } else if (len < 0) {
      cur = cur.left
      pos += cur.pointers.length
    } else {
      return get_current(cur, pos)
    }
  }
  // throw new Error('invalid cursor')
}

export function get_current(cur: Node, pos: number) {
  return { node: cur.id, pos, key: cur.keys[pos], value: cur.pointers[pos] }
}

export function eval_current(tree: BPlusTree, id: number, pos: number) {
  return evaluate(tree, id, pos)
}

export function eval_next(tree: BPlusTree, id: number, pos: number) {
  return evaluate(tree, id, pos + 1)
}

export function eval_previous(tree: BPlusTree, id: number, pos: number) {
  return evaluate(tree, id, pos - 1)
}

export type SearchOptions = { skip: number; take: number; forward: boolean }

export function find_first(
  tree: BPlusTree,
  key: ValueType,
  forward: boolean = true,
): Cursor {
  let node: Node, index: number
  if (forward) {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key)
  } else {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key)
  }
  return { node: node.id, pos: index, key, value: node.pointers[index] }
}

// можно сделать мемоизацию на операцию, кэш значений для поиска

export function find(
  tree: BPlusTree,
  key: ValueType,
  options?: Partial<SearchOptions>,
) {
  let { skip = 0, take = -1, forward = true } = options ?? {}
  const result = []
  const cursor = find_first(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor
    if (skip == 0) {
      cur = cursor
    } else {
      cur = evaluate(tree, cursor.node, cursor.pos + (forward ? skip : -skip))
    }
    if (cur?.key == key) {
      if (take == -1) {
        result.push(cur.value)
      } else {
        while (cur || take == 0) {
          if (cur.pos >= 0) {
            result.push(cur.value)
            take -= 1
            cur = evaluate(tree, cur.node, cur.pos + (forward ? 1 : -1))
          } else {
            break
          }
        }
      }
    }
  }
  return result
}

export function list(tree: BPlusTree, options?: Partial<SearchOptions>) {
  let { skip = 0, take = -1, forward = true } = options ?? {}
  const result = []
  const key = options.forward ? tree.min() : tree.max()
  const cursor = find_first(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor
    if (skip == 0) {
      cur = cursor
    } else {
      cur = evaluate(tree, cursor.node, cursor.pos + (forward ? skip : -skip))
    }
    if (cur) {
      if (take == -1) {
        result.push(cur.value)
      } else {
        while (cur && take != 0) {
          if (cur.pos >= 0) {
            result.push(cur.value)
            take -= 1
            cur = evaluate(tree, cur.node, cur.pos + (forward ? 1 : -1))
          } else {
            break
          }
        }
      }
    }
  }
  return result
}

// можно использовать скип, относительное перемещение по страницам... зная их размер,можно просто пропускать сколько нужно
// можно в курсорах указывать: отсюда и 10 элементов
// перемещаться так же можно по ключу --- значению

/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */

export type PortableBPlusTree = {
  t: number
  next_node_id: number
  root: number
  unique: boolean
  nodes: PortableNode[]
}

export class BPlusTree {
  public t: number // минимальная степень дерева
  public root: number // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node>()
  protected next_node_id = 0
  get_next_id() {
    return this.next_node_id++
  }
  constructor(t: number, unique: boolean) {
    this.t = t
    this.unique = unique
    this.root = Node.createLeaf(this).id
  }

  static serialize(tree: BPlusTree): PortableBPlusTree {
    const { t, root, unique, nodes, next_node_id } = tree
    return {
      t,
      next_node_id,
      root,
      unique,
      nodes: [...nodes.values()].map((n) => Node.serialize(n)),
    }
  }

  static deserialize(tree: BPlusTree, stored: PortableBPlusTree) {
    tree.nodes.clear()
    const { t, next_node_id, root, unique, nodes } = stored
    tree.t = t
    tree.next_node_id = next_node_id
    tree.root = root
    tree.unique = unique
    nodes.forEach((n) => {
      const node = Node.deserialize(n)
      node.tree = tree
      tree.nodes.set(n.id, node)
    })
  }

  find(
    key?: ValueType,
    {
      skip = 0,
      take = -1,
      forward = true,
    }: { skip?: number; take?: number; forward?: boolean } = {},
  ) {
    return find(this, key, { skip, take, forward })
  }

  list({
    skip = 0,
    take = -1,
    forward = true,
  }: { skip?: number; take?: number; forward?: boolean } = {}) {
    return list(this, { skip, take, forward })
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
    return { node: node.id, pos: index, key, value: node.pointers[index] }
  }

  count(key: ValueType) {
    return count(key, this.nodes.get(this.root))
  }
  size() {
    return size(this.nodes.get(this.root))
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
    return this.nodes.get(this.root).min
  }
  max() {
    return this.nodes.get(this.root).max
  }
  toJSON() {
    return {
      t: this.t,
      unique: this.unique,
      root: this.nodes.get(this.root).toJSON(),
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
