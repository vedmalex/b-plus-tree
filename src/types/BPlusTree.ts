import { Node } from './Node'
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
import { sourceIn } from './source/sourceIn'
import { sourceEq } from './source/sourceEq'
import { sourceRange } from './source/sourceRange'
import { sourceEach } from './source/sourceEach'
import { sourceGt } from './source/sourceGt'
import { sourceGte } from './source/sourceGte'
import { sourceLt } from './source/sourceLt'
import { sourceLte } from './source/sourceLte'
import { ValueType } from './ValueType'

export class BPlusTree<T, K extends ValueType> {
  public t: number // минимальная степень дерева
  public root: number // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node<T, K>>()
  protected next_node_id = 0
  get_next_id() {
    return this.next_node_id++
  }

  includes(keys: Array<K>) {
    return sourceIn<T, K>(keys)
  }

  equals(key: K) {
    return sourceEq<T, K>(key)
  }

  range(from: K, to: K, fromIncl: boolean = true, toIncl: boolean = true) {
    return sourceRange<T, K>(from, to, fromIncl, toIncl)
  }

  each(forward: boolean = true) {
    return sourceEach<T, K>(forward)
  }

  gt(key: K) {
    return sourceGt<T, K>(key)
  }
  gte(key: K) {
    return sourceGte<T, K>(key)
  }
  lt(key: K) {
    return sourceLt<T, K>(key)
  }
  lte(key: K) {
    return sourceLte<T, K>(key)
  }

  constructor(t?: number, unique?: boolean) {
    this.t = t ?? 32
    this.unique = unique ?? false
    this.root = Node.createLeaf(this).id
  }

  static serialize<T, K extends ValueType>(
    tree: BPlusTree<T, K>,
  ): PortableBPlusTree<T, K> {
    const { t, root, unique, nodes, next_node_id } = tree
    return {
      t,
      next_node_id,
      root,
      unique,
      nodes: [...nodes.values()].map((n) => Node.serialize(n)),
    }
  }
  static createFrom<T, K extends ValueType>(stored: PortableBPlusTree<T, K>) {
    let res = new BPlusTree()
    BPlusTree.deserialize(res, stored)
    return res
  }
  static deserialize<T, K extends ValueType>(
    tree: BPlusTree<T, K>,
    stored: PortableBPlusTree<T, K>,
  ) {
    tree.nodes.clear()
    const { t, next_node_id, root, unique, nodes } = stored
    tree.t = t
    tree.next_node_id = next_node_id
    tree.root = root
    tree.unique = unique
    nodes.forEach((n) => {
      const node = Node.deserialize<T, K>(n)
      node.tree = tree
      tree.nodes.set(n.id, node)
    })
  }

  find(
    key?: K,
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

  findFirst(key: K) {
    const node = find_first_node(this, key)
    const index = find_first_key(node.keys, key)
    return node.pointers[index]
  }

  findLast(key: K) {
    const node = find_last_node(this, key)
    const index = find_last_key(node.keys, key)
    return node.pointers[index]
  }

  cursor(key: K): Cursor<T, K> {
    const node = find_last_node(this, key)
    const index = find_first_key(node.keys, key)
    const value = node.pointers[index]
    return { node: node.id, pos: index, key, value, done: value === undefined }
  }

  reset() {
    this.next_node_id = 0
    this.nodes.clear()
    this.root = Node.createLeaf(this).id
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
  count(key: K) {
    return count(key, this.nodes.get(this.root))
  }
  insert(key: K, value: any): boolean {
    return insert(this, key, value)
  }

  removeSpecific(key: K, specific: (pointers: T) => true) {
    return remove(this, key, false)
  }
  remove(key: K) {
    return remove(this, key, false)
  }

  removeMany(key: K) {
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
