import { Node } from './Node'
import type { PortableBPlusTree } from './PortableBPlusTree'
import type { Cursor } from './eval/Cursor'
import { remove } from './methods/remove'
import { remove_specific } from './methods/remove_specific'
import { insert } from './methods/insert'
import { count } from './methods/count'
import { size } from './methods/size'
import { find_last_node } from './methods/find_last_node'
import { find_first_key } from './methods/find_first_key'
import { find_first_node } from './methods/find_first_node'
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
import type { ValueType } from './ValueType'
import { sourceEqNulls } from './source/sourceEqNulls'
import { find_first_item } from './methods/find_first_item'
import { find_last_item } from './methods/find_last_item'
import type { PortableNode } from './Node/PortableNode'
import type { Comparator } from './types'
import { compare_keys_primitive } from '../methods/utils/comparator_primitive'
/**
 * tree
 * T - value to be stored
 * K - key
 */
export class BPlusTree<T, K extends ValueType> {
  public t: number // минимальная степень дерева
  public root: number // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node<T, K>>()
  public comparator: Comparator<K>
  public defaultEmpty: K
  public keySerializer: (keys: Array<K>) => any
  public keyDeserializer: (keys: any) => Array<K>
  protected next_node_id = 0
  get_next_id(): number {
    return this.next_node_id++
  }

  includes(
    keys: Array<K>,
  ): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceIn<T, K>(keys)
  }

  equals(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceEq<T, K>(key)
  }

  equalsNulls(
    key: K,
  ): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceEqNulls<T, K>(key)
  }

  range(
    from: K,
    to: K,
    fromIncl = true,
    toIncl = true,
  ): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceRange<T, K>(from, to, fromIncl, toIncl)
  }

  each(
    forward = true,
  ): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceEach<T, K>(forward)
  }

  gt(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceGt<T, K>(key)
  }
  gte(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceGte<T, K>(key)
  }
  lt(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceLt<T, K>(key)
  }
  lte(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>, void> {
    return sourceLte<T, K>(key)
  }

  constructor(
    t?: number,
    unique?: boolean,
    comparator?: (a: K, b: K) => number,
    defaultEmpty?: K,
    keySerializer?: (keys: Array<K>) => any,
    keyDeserializer?: (keys: any) => Array<K>,
  ) {
    this.t = t ?? 32
    this.unique = unique ?? false
    this.root = Node.createLeaf(this).id
    this.comparator = comparator ?? compare_keys_primitive
    this.defaultEmpty =
      defaultEmpty ?? (Number.NEGATIVE_INFINITY as unknown as K)
    this.keySerializer = keySerializer ?? ((keys: Array<K>) => keys)
    this.keyDeserializer = keyDeserializer ?? ((keys: any) => keys as Array<K>)
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
  static createFrom<T, K extends ValueType>(
    stored: PortableBPlusTree<T, K>,
  ): BPlusTree<T, K> {
    const res = new BPlusTree<T, K>()
    BPlusTree.deserialize(res, stored)
    return res
  }
  static deserialize<T, K extends ValueType>(
    tree: BPlusTree<T, K>,
    stored: PortableBPlusTree<T, K>,
  ): void {
    const { t, next_node_id, root, unique, nodes } = stored
    if (t) {
      tree.nodes.clear()
      tree.t = t
      tree.next_node_id = next_node_id
      tree.root = root
      tree.unique = unique
      nodes.forEach((n) => {
        const node = Node.deserialize<T, K>(n, tree)
        tree.nodes.set(n.id, node)
      })
    } else {
      // key pair serialiation
      for (const [key, value] of Object.entries(stored)) {
        tree.insert(key as K, value as unknown as T)
      }
    }
  }

  find(
    key?: K,
    {
      skip = 0,
      take = -1,
      forward = true,
    }: { skip?: number; take?: number; forward?: boolean } = {},
  ): Array<T> {
    return find(this, key, { skip, take, forward })
  }

  list({
    skip = 0,
    take = -1,
    forward = true,
  }: { skip?: number; take?: number; forward?: boolean } = {}): Array<T> {
    return list(this, { skip, take, forward })
  }

  findFirst(key: K): T {
    const node = find_first_node(this, key)
    const index = find_first_item(node.keys, key, this.comparator)
    return node.pointers[index]
  }

  findLast(key: K): T {
    const node = find_last_node(this, key)
    const index = find_last_item(node.keys, key, this.comparator)
    return node.pointers[index]
  }

  cursor(key: K): Cursor<T, K> {
    const node = find_last_node(this, key)
    const index = find_first_key(node.keys, key, this.comparator)
    const value = node.pointers[index]
    return { node: node.id, pos: index, key, value, done: value === undefined }
  }

  reset(): void {
    this.next_node_id = 0
    this.nodes.clear()
    this.root = Node.createLeaf(this).id
  }

  get min(): K {
    return this.nodes.get(this.root).min
  }
  get max(): K {
    return this.nodes.get(this.root).max
  }
  get size(): number {
    return size(this.nodes.get(this.root))
  }
  node(id: number): Node<T, K> {
    return this.nodes.get(id)
  }
  count(key: K): number {
    if (key == undefined) key = null
    return count(key, this.nodes.get(this.root))
  }
  insert(key: K, value: T): boolean {
    if (key == null) key = this.defaultEmpty
    return insert(this, key, value)
  }

  removeSpecific(key: K, specific: (pointers: T) => boolean): Array<[K, T]> {
    //TODO: допилить эту штуку
    if (key == undefined) key = null
    return remove_specific(this, key, specific)
  }
  remove(key: K): Array<[K, T]> {
    if (key == undefined) key = null
    return remove(this, key, false)
  }

  removeMany(key: K): Array<[K, T]> {
    if (key == undefined) key = null
    return remove(this, key, true)
  }

  toJSON(): {
    t: number
    unique: boolean
    root: PortableNode<T, K> & { errors: Array<string> }
  } {
    return {
      t: this.t,
      unique: this.unique,
      root: this.nodes.get(this.root).toJSON(),
    }
  }
}
