import { Node } from './Node'
import { ValueType } from './ValueType'
import { PortableBPlusTree } from './PortableBPlusTree'
import { Cursor } from './eval/Cursor'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { count } from '../methods/count'
import { size } from '../methods/size'
import { find_last_node } from '../methods/find_last_node'
import { find_first_key } from '../methods/find_first_key'
import { find_first_node } from '../methods/find_first_node'
import { find_last_key } from '../methods/find_last_key'
import { find } from './eval/find'
import { list } from './eval/list'

export class BPlusTree<T> {
  public t: number // минимальная степень дерева
  public root: number // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node<T>>()
  protected next_node_id = 0
  get_next_id() {
    return this.next_node_id++
  }
  constructor(t: number, unique: boolean) {
    this.t = t
    this.unique = unique
    this.root = Node.createLeaf(this).id
  }

  static serialize<T>(tree: BPlusTree<T>): PortableBPlusTree<T> {
    const { t, root, unique, nodes, next_node_id } = tree
    return {
      t,
      next_node_id,
      root,
      unique,
      nodes: [...nodes.values()].map((n) => Node.serialize(n)),
    }
  }

  static deserialize<T>(tree: BPlusTree<T>, stored: PortableBPlusTree<T>) {
    tree.nodes.clear()
    const { t, next_node_id, root, unique, nodes } = stored
    tree.t = t
    tree.next_node_id = next_node_id
    tree.root = root
    tree.unique = unique
    nodes.forEach((n) => {
      const node = Node.deserialize<T>(n)
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

  cursor(key: ValueType): Cursor<T> {
    const node = find_last_node(this, key)
    const index = find_first_key(node.keys, key)
    const value = node.pointers[index]
    return { node: node.id, pos: index, key, value, done: value === undefined }
  }

  get min() {
    return this.nodes.get(this.root).min
  }
  get max() {
    return this.nodes.get(this.root).max
  }
  get size() {
    return size(this.nodes.get(this.root))
  }
  node(id: number) {
    return this.nodes.get(id)
  }
  count(key: ValueType) {
    return count(key, this.nodes.get(this.root))
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

  toJSON() {
    return {
      t: this.t,
      unique: this.unique,
      root: this.nodes.get(this.root).toJSON(),
    }
  }
}
