import { Cursor, find, list } from './eval'
import { compare_keys_primitive, find_first_node, find_first_item, find_last_node, find_last_item, find_first_key, size, insert, remove_specific, remove, count } from './methods'
import { Node, PortableNode, ValueType } from './Node'
import { sourceIn, sourceEq, sourceEqNulls, sourceRange, sourceEach, sourceGt, sourceGte, sourceLt, sourceLte } from './source'
import { Comparator } from './types'
import { evaluate } from './eval'
import { IBPlusTree } from './IBPlusTree'
/**
 * tree
 * T - value to be stored
 * K - key
 */
export class BPlusTree<T, K extends ValueType> implements IBPlusTree<T, K> {
  public t: number // минимальная степень дерева
  public root: number // указатель на корень дерева
  public unique: boolean
  public nodes = new Map<number, Node<T, K>>()
  public readonly comparator: Comparator<K>
  protected readonly defaultEmpty: K
  public readonly keySerializer: (keys: Array<K>) => any
  public readonly keyDeserializer: (keys: any) => Array<K>
  public next_node_id = 0 // Made public for serialization utils
  public get_next_id(): number { // Keep internal getter protected
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

  range2(from: K, to: K): Array<K> {
    const startNode = find_first_node(this, from)
    if (!startNode) {
        return []; // If no node could possibly contain 'from', the range is empty
    }

    let cur = startNode
    const result: K[] = [] // Specify type K for the result array

    while (cur) {
        // Efficiently find the starting index within the current node
        // We need the index of the first key >= 'from'
        const startIndex = find_first_key(cur.keys, from, this.comparator)

        // Iterate through keys from the starting index in the current node
        for (let kIdx = startIndex; kIdx < cur.keys.length; kIdx++) {
            const k = cur.keys[kIdx];
            // Check if the key is within the desired range [from, to]
            if (this.comparator(k, to) <= 0) { // k <= to
                // Only add if k >= from (implicit from find_first_node and startIndex logic)
                if (this.comparator(k, from) >= 0) { // k >= from
                   result.push(k);
                }
            } else {
                // Since keys are sorted, if k > to, no further keys in this node
                // or subsequent nodes will be in the range. Stop the search.
                cur = null; // Set cur to null to break the outer while loop
                break; // Exit the inner for loop
            }
        }

        // If the outer loop wasn't broken and there's a right sibling, move to it
        if (cur && cur._right) {
           const nextNode = this.nodes.get(cur._right);
           if (nextNode) {
               cur = nextNode;
           } else {
               // Should not happen in a consistent tree, but handle defensively
               break;
           }
        } else {
             // No right sibling or the loop was intentionally broken (k > to)
             break;
        }
    }
    return result; // Return the collected keys
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
    // console.log(`[findFirst] Searching for key: ${key}`);
    const node = find_first_node(this, key)
    // console.log(`[findFirst] Found node: ${node?.id}, leaf: ${node?.leaf}`);
    const index = find_first_item(node.keys, key, this.comparator)
    // console.log(`[findFirst] Found index in node ${node?.id}: ${index} for key ${key}. Node keys: [${node?.keys}]`);
    // Check if a valid index was found before accessing pointers
    if (index !== -1 && index < node.pointers.length) {
        const value = node.pointers[index];
        // console.log(`[findFirst] Returning value: ${value}`);
        return value;
    }
    // Return undefined if the key wasn't found in the expected node
    // console.log(`[findFirst] Returning undefined (invalid index)`);
    return undefined;
  }

  findLast(key: K): T {
    const node = find_last_node(this, key)
    if (!node) {
        return undefined;
    }
    const index = find_last_item(node.keys, key, this.comparator)
    if (index === -1 || index >= node.pointers.length) {
        return undefined;
    }
    const value = node.pointers[index]
    return value;
  }

  cursor(key: K): Cursor<T, K> {
    // Use find_first_node to find the leaf node containing the first key >= input key
    const node = find_first_node(this, key)
    // find_first_key finds the index of the first key >= input key within that node
    const index = find_first_key(node.keys, key, this.comparator)

    // Adjust index and node if the index is out of bounds for the found node
    // This means the key is greater than all keys in this leaf, so we need the next leaf.
    // However, evaluate handles this boundary crossing.

    // Use evaluate to get the correct cursor, handling node boundaries
    const cursorResult = evaluate(this, node.id, index);

    // Ensure the returned cursor isn't marked done incorrectly if evaluate returns a valid position
    // but the value happens to be undefined (shouldn't happen with B+ tree pointers usually)
    if (cursorResult.node !== undefined && cursorResult.pos !== undefined) {
        return {
            ...cursorResult,
            done: false // Assume if evaluate returns a node/pos, it's not 'done'
        };
    }

    // If evaluate couldn't find a valid position (e.g., past end of tree)
    return {
        node: undefined,
        pos: undefined,
        key: undefined,
        value: undefined,
        done: true,
    };
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
  public node(id: number): Node<T, K> {
    return this.nodes.get(id)
  }
  count(key: K): number {
    const searchKey = (key === undefined ? null : key) as K;
    if (searchKey === null && this.defaultEmpty !== undefined) {
        return count(this.defaultEmpty, this.nodes.get(this.root), this.comparator);
    } else {
        return count(searchKey, this.nodes.get(this.root), this.comparator);
    }
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
