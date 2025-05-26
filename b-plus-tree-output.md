# b-plus-tree

## Структура файловой системы

```
└── b-plus-tree/
    ├── src/
    │   ├── actions.ts
    │   ├── BPlusTree.ts
    │   ├── BPlusTreeUtils.ts
    │   ├── eval.ts
    │   ├── IBPlusTree.ts
    │   ├── index.ts
    │   ├── methods.ts
    │   ├── minimal.ts
    │   ├── Node.ts
    │   ├── print_node.ts
    │   ├── print-tree.ts
    │   ├── query.ts
    │   ├── source.ts
    │   └── types.ts
    └── build.ts
```

## Список файлов

`src/actions.ts`

```ts
import type { Cursor } from './eval'
import type { BPlusTree } from './BPlusTree'
import type { ValueType } from './Node'
import { replace_max, update_state } from './Node'
import { replace_min } from './Node'
import { direct_update_value, reflow, try_to_pull_up_tree } from './methods'

export function remove<T, K extends ValueType>(tree: BPlusTree<T, K>) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<[K, T], void> {
    const result: Array<[K, T]> = []
    const touched_nodes = new Set<number>()
    // сначала удаляем все записи какие есть
    for await (const cursor of source) {
      const node = tree.nodes.get(cursor.node)
      const { key, pos } = cursor
      result.push([key, node.pointers.splice(pos, 1, undefined)[0]])
      node.keys.splice(pos, 1, undefined)
      touched_nodes.add(cursor.node)
    }
    // обновляем все записи в дереве
    for (const node_id of touched_nodes) {
      const node = tree.nodes.get(node_id)
      const new_keys = []
      const new_pointers = []
      for (let i = 0; i < node.size; i++) {
        if (node.keys[i] !== undefined) {
          new_keys.push(node.keys[i])
          new_pointers.push(node.pointers[i])
        }
      }

      node.keys = new_keys
      node.pointers = new_pointers

      update_state(node)
      if (node.min != node.keys[0]) {
        replace_min(node, node.keys[0])
      }
      if (node.max != node.keys[node.keys.length - 1]) {
        replace_max(node, node.keys[node.keys.length - 1])
      }
    }
    // обновляем дерево
    for (const node_id of touched_nodes) {
      const node = tree.nodes.get(node_id)
      if (node) {
        reflow(tree, node)
        try_to_pull_up_tree(tree)
      }
    }
    for (const res of result) {
      yield res
    }
  }
}

export function update<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  action: (inp: [K, T]) => T | Promise<T>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<void, void> {
    for await (const cursor of source) {
      const result = action([cursor.key, cursor.value])
      // здесь надо проверить не поменялся ли ключ данного объекта
      // что-то надо придумать, чтобы обновить значение правильно...
      // похоже Cursor должен быть со ссылкой на дерево
      direct_update_value(tree, cursor.node, cursor.pos, result)
      yield
    }
  }
}

```

`src/BPlusTree.ts`

```ts
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

```

`src/BPlusTreeUtils.ts`

```ts
import { BPlusTree } from './BPlusTree';
import { Node, PortableBPlusTree, ValueType, PortableNode } from './Node';
import { Comparator } from './types'; // Assuming Comparator might be needed for createFrom options eventually
// import { IBPlusTree } from './IBPlusTree'; // Import the interface

/**
 * Serializes a BPlusTree instance into a portable format.
 * @param tree The BPlusTree instance (or conforming object) to serialize.
 * @returns A portable object representing the tree's state.
 */
export function serializeTree<T, K extends ValueType>(
  // Accept a wider type, but require the necessary public properties for serialization.
  // We know the concrete BPlusTree class has these.
  tree: Pick<BPlusTree<T, K>, 't' | 'root' | 'unique' | 'nodes' | 'next_node_id'>
): PortableBPlusTree<T, K> {
  // Access public properties directly from the tree instance
  const { t, root, unique, nodes, next_node_id } = tree;
  return {
    t,
    next_node_id, // Assuming next_node_id remains needed for serialization state
    root,
    unique,
    nodes: [...nodes.values()].map((n) => Node.serialize(n)), // Node.serialize is still static
  };
}

/**
 * Deserializes data from a portable format into an existing BPlusTree instance.
 * @param tree The BPlusTree instance to populate.
 * @param stored The portable object containing the tree's state.
 */
export function deserializeTree<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  stored: PortableBPlusTree<T, K> | Record<string, T> // Allow object format too
): void {
    // Check if it's the full PortableBPlusTree format
    if (stored && typeof stored === 'object' && 't' in stored && 'root' in stored && 'nodes' in stored) {
        const { t, next_node_id, root, unique, nodes } = stored as PortableBPlusTree<T, K>;
        tree.nodes.clear(); // Clear existing nodes
        tree.t = t;
        tree.next_node_id = next_node_id; // Assuming next_node_id is public or accessible
        tree.root = root;
        tree.unique = unique;
        nodes.forEach((n: PortableNode<T,K>) => {
            const node = Node.deserialize<T, K>(n, tree); // Node.deserialize needs tree instance
            tree.nodes.set(n.id, node);
        });
    } else if (stored && typeof stored === 'object') {
        // Handle simple key-value pair object serialization (like original deserialize part)
         tree.reset(); // Start fresh for key-value loading
        for (const [key, value] of Object.entries(stored)) {
            // We might need type assertions or checks here if K isn't string
            tree.insert(key as K, value as T);
        }
    } else {
        console.warn("Invalid data format provided for deserialization.");
    }
}

/**
 * Creates a new BPlusTree instance from serialized data.
 * @param stored The portable object containing the tree's state.
 * @param options Optional parameters for the new tree constructor (e.g., t, unique, comparator).
 *                These will be overridden by values in 'stored' if present in the full format.
 * @returns A new BPlusTree instance populated with the deserialized data.
 */
export function createTreeFrom<T, K extends ValueType>(
  stored: PortableBPlusTree<T, K> | Record<string, T>,
  options?: {
      t?: number;
      unique?: boolean;
      comparator?: Comparator<K>;
      defaultEmpty?: K;
      keySerializer?: (keys: Array<K>) => any;
      keyDeserializer?: (keys: any) => Array<K>;
  }
): BPlusTree<T, K> {
  // Create a new tree with provided options or defaults
  const res = new BPlusTree<T, K>(
      options?.t,
      options?.unique,
      options?.comparator,
      options?.defaultEmpty,
      options?.keySerializer,
      options?.keyDeserializer
  );
  // Deserialize the data into the new tree
  deserializeTree(res, stored);
  return res;
}
```

`src/eval.ts`

```ts
import type { ValueType } from './Node'
import type { BPlusTree } from './BPlusTree'
import type { Node } from './Node'
import { find_first_item, find_first_item_remove, find_first_key, find_first_node, find_last_key, find_last_node } from './methods'
import { sourceEach } from './source'

export type Cursor<T, K extends ValueType, R = T> = {
  node: number
  pos: number
  key: K
  value: R
  done: boolean
}

export const EmptyCursor = {
  done: true,
  key: undefined,
  pos: undefined,
  node: undefined,
  value: undefined,
}

export function eval_current<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate(tree, id, pos)
}

export function eval_next<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate(tree, id, pos + 1)
}

export function eval_previous<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate<T, K>(tree, id, pos - 1)
}

export function evaluate<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  let cur = tree.nodes.get(id)
  while (cur) {
    const len = cur.pointers.length
    if (pos >= len) {
      cur = cur.right
      pos -= len
    } else if (pos < 0) {
      cur = cur.left
      if (cur) {
        pos += cur.pointers.length
      }
    } else {
      return get_current(cur, pos)
    }
  }
  return {
    node: undefined,
    pos: undefined,
    key: undefined,
    value: undefined,
    done: true,
  }
}

export function find_first_remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  forward = true,
): Cursor<T, K> {
  let node: Node<T, K>
  let index: number
  if (forward) {
    node = find_first_node(tree, key)
    if (key != null) {
      index = find_first_item_remove(node.keys, key, tree.comparator)
    } else {
      index = find_first_item(node.keys, key, tree.comparator)
    }
  } else {
    node = find_last_node(tree, key)
    if (key != null) {
      index = find_first_item_remove(node.keys, key, tree.comparator)
    } else {
      index = find_first_item(node.keys, key, tree.comparator)
    }
  }
  const value = node.pointers[index]
  return { node: node.id, pos: index, key, value, done: value === undefined }
}

export function find_first<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  forward = true,
): Cursor<T, K> {
  let node: Node<T, K>
  let index: number
  if (forward) {
    node = find_first_node(tree, key)
    index = find_first_item(node.keys, key, tree.comparator)
  } else {
    node = find_last_node(tree, key)
    index = find_first_item(node.keys, key, tree.comparator)
  }
  const value = node.pointers[index]
  return { node: node.id, pos: index, key, value, done: value === undefined }
}

export function find_range_start<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  include: boolean,
  forward = true,
): Cursor<T, K> {
  let node: Node<T, K>
  let index: number
  if (forward) {
    node = find_first_node(tree, key)
    if (include) {
      // Find the first key >= specified key
      index = find_first_key(node.keys, key, tree.comparator) // Binary search for first >= key
      if (index === -1) { // Handle case where find_first_key returns -1 (e.g., key > all keys in node)
          index = node.keys.length; // Start search from next node
      }
    } else {
      // Find the first key > specified key
      let firstGTE = find_first_key(node.keys, key, tree.comparator); // Find first >= key
       if (firstGTE !== -1 && firstGTE < node.keys.length && tree.comparator(node.keys[firstGTE], key) === 0) {
           // Found the key exactly, start at the next position
           index = firstGTE + 1;
       } else if (firstGTE !== -1 && firstGTE < node.keys.length) {
            // Found a key greater than the searched key, start there
            index = firstGTE;
       } else {
            // All keys in node are smaller, or node is empty. Start search from next node.
            // Assuming find_first_key returns -1 or node.keys.length in this case.
            index = node.keys.length; // This triggers evaluate to move to the next node
       }
    }
  } else {
    node = find_last_node(tree, key)
    if (include) {
      index = find_last_key(node.keys, key, tree.comparator) - 1
    } else {
      index = find_first_key(node.keys, key, tree.comparator) - 1
    }
  }
  return evaluate(tree, node.id, index)
}

// можно сделать мемоизацию на операцию, кэш значений для поиска
export function find<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  options?: Partial<SearchOptions>,
): Array<T> {
  const { skip = 0, forward = true, take: initial_take = -1 } = options ?? {}
  let take = initial_take === -1 ? Infinity : initial_take; // Use Infinity for "take all"
  const result: Array<T> = []

  // Find the first potential match
  const startCursor = find_first<T, K>(tree, key, forward)

  if (!startCursor.done && startCursor.pos >= 0) {
      let currentCursor: Cursor<T, K>
      let skippedCount = 0;

      // Iterate to skip elements if necessary
      currentCursor = startCursor;
      while (!currentCursor.done && skippedCount < skip) {
         // Check if the key still matches before skipping
         if (tree.comparator(currentCursor.key, key) !== 0) {
             // If the key changes while skipping, the target key range has ended
             currentCursor = EmptyCursor; // Mark as done
             break;
         }
         // Move to the next/previous item
         currentCursor = forward
             ? evaluate(tree, currentCursor.node, currentCursor.pos + 1)
             : evaluate(tree, currentCursor.node, currentCursor.pos - 1);
         skippedCount++;
      }


      // Now collect elements according to 'take' limit
      while (!currentCursor.done && take > 0) {
          // Check if the key still matches
          if (tree.comparator(currentCursor.key, key) === 0) {
              result.push(currentCursor.value);
              take--;
          } else {
              // Key no longer matches, stop collecting
              break;
          }

          // Move to the next/previous item
          currentCursor = forward
              ? evaluate(tree, currentCursor.node, currentCursor.pos + 1)
              : evaluate(tree, currentCursor.node, currentCursor.pos - 1);
      }
  }

  return result
}

export function get_current<T, K extends ValueType>(
  cur: Node<T, K>,
  pos: number,
): Cursor<T, K> {
  const value = cur.pointers[pos]
  return {
    node: cur.id,
    pos,
    key: cur.keys[pos],
    value,
    done: value === undefined,
  }
}

export function list<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  options?: Partial<SearchOptions>,
): Array<T> {
  let { take = -1 } = options ?? {}
  const { skip = 0, forward = true } = options ?? {}
  const result: Array<T> = []
  // const key = forward ? tree.min : tree.max // Start key
  // Use the appropriate source function based on direction
  const source = forward ? sourceEach<T,K>(true) : sourceEach<T,K>(false);
  let count = 0;
  let taken = 0;

  for (const cursor of source(tree)) {
      if (cursor.done) break; // Should not happen with sourceEach but good practice

      // Handle skip
      if (count < skip) {
          count++;
          continue;
      }

      // Handle take
      if (take === -1 || taken < take) {
          result.push(cursor.value);
          taken++;
      } else {
          // If take is reached, stop iteration
          break;
      }
  }
  return result;
}

export type SearchOptions = { skip: number; take: number; forward: boolean }

```

`src/IBPlusTree.ts`

```ts
import { Cursor } from './eval';
import { ValueType } from './Node';

/**
 * Interface describing the public API of a B+ Tree.
 * T - Type of the value stored in the tree.
 * K - Type of the key used for indexing (must extend ValueType).
 */
export interface IBPlusTree<T, K extends ValueType> {
    /** Minimum key in the tree. */
    readonly min: K | undefined;
    /** Maximum key in the tree. */
    readonly max: K | undefined;
    /** Number of items stored in the tree. */
    readonly size: number;

    // --- Query Source Methods --- //
    // These methods return functions that generate iterators (sources) for queries.

    /** Creates a source generator for keys included in the provided array. */
    includes(keys: Array<K>): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items matching the exact key. */
    equals(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items matching the key, handling nulls specifically. */
    equalsNulls(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items within a key range. */
    range(from: K, to: K, fromIncl?: boolean, toIncl?: boolean): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator to iterate over all items. */
    each(forward?: boolean): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys greater than the specified key. */
    gt(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys greater than or equal to the specified key. */
    gte(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys less than the specified key. */
    lt(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys less than or equal to the specified key. */
    lte(key: K): (tree: this) => Generator<Cursor<T, K>, void>;

    // --- Direct Access Methods --- //

    /** Finds all values associated with a specific key. */
    find(key?: K, options?: { skip?: number; take?: number; forward?: boolean }): Array<T>;
    /** Lists values in the tree, optionally skipping/taking a subset. */
    list(options?: { skip?: number; take?: number; forward?: boolean }): Array<T>;
    /** Finds the first value associated with the key (implementation-dependent order for duplicates). */
    findFirst(key: K): T | undefined;
    /** Finds the last value associated with the key (implementation-dependent order for duplicates). */
    findLast(key: K): T | undefined;
    /** Creates a cursor pointing to the first item with a key >= the specified key. */
    cursor(key: K): Cursor<T, K>;
    /** Counts the number of items associated with a specific key. */
    count(key: K): number;

    // --- Modification Methods --- //

    /** Inserts a key-value pair into the tree. Returns true if successful, false otherwise (e.g., duplicate in unique tree). */
    insert(key: K, value: T): boolean;
    /** Removes items matching a key based on a predicate function. Returns removed [key, value] pairs. */
    removeSpecific(key: K, specific: (value: T) => boolean): Array<[K, T]>;
    /** Removes the first item matching the key. Returns removed [key, value] pairs (at most one). */
    remove(key: K): Array<[K, T]>;
    /** Removes all items matching the key. Returns removed [key, value] pairs. */
    removeMany(key: K): Array<[K, T]>;
    /** Clears the tree, removing all nodes and data. */
    reset(): void;

    // --- Utility Methods --- //
    /** Returns a JSON representation of the tree structure (primarily for debugging). */
    toJSON(): unknown; // Return type can be complex, keep generic for interface

    // Potentially add other core methods/properties if deemed essential for the public interface.
}
```

`src/index.ts`

```ts
export type { PortableBPlusTree } from './Node'
export { BPlusTree } from './BPlusTree'
export { print_node } from './print_node'
export * from './Node'
export { query } from './types'
export * from './query'
export * from './source'
// export * from './methods'
export * from './eval'
export * from './actions'

```

`src/methods.ts`

```ts
import { BPlusTree } from './BPlusTree'
import { Cursor } from './eval'
// import { sourceEq } from './source'
import {
  Node,
  remove_node,
  replace_max,
  replace_min,
  update_min_max,
  update_state,
  ValueType,
  merge_with_left,
  merge_with_right,
  // unregister_node
} from './Node'
import { Comparator } from './types'

export function add_initial_nodes<T, K extends ValueType>(
  obj: Node<T, K>,
  nodes: Array<Node<T, K>>,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const right = nodes[i]
    obj.children.push(right.id)
    obj.keys.push(right.min)
    right.parent = obj
  }
  // always remove first
  obj.keys.shift()

  // update node
  update_state(obj)

  // update and push all needed max and min
  update_min_max(obj)
}

export function attach_one_to_right_after<T, K extends ValueType>(
  obj: Node<T, K>,
  right: Node<T, K>,
  after: Node<T, K>,
): void {
  const pos = obj.children.indexOf(after.id)
  obj.children.splice(pos + 1, 0, right.id)
  right.parent = obj

  // update node state (size, key_num)
  // min/max update happens in split after key insertion
  update_state(obj)

  // update and push all needed max and min - Moved to split
  // update_min_max(obj)
}

export function can_borrow_left<T, K extends ValueType>(
  node: Node<T, K>,
): number {
  const cur = node
  // Check if left sibling exists and has more keys than the minimum required (t-1)
  if (cur.left && cur.left.size > cur.t - 1) {
    return 1; // Can borrow one element
  }
  return 0
}

export function can_borrow_right<T, K extends ValueType>(
  node: Node<T, K>,
): number {
  const cur = node
  // Check if right sibling exists and has more keys than the minimum required (t-1)
  if (cur.right && cur.right.size > cur.t - 1) {
    return 1; // Can borrow one element
  }
  return 0
}

export type Chainable = {
  left: Chainable
  right: Chainable
}

export function add_sibling(
  a: Chainable,
  b: Chainable,
  order: 'right' | 'left',
): void {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  b[right] = a[right]
  if (a[right]) {
    b[right][left] = b
  }
  a[right] = b
  b[left] = a
}

export function remove_sibling(a: Chainable, order: 'right' | 'left'): void {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  if (a[right]) {
    const b = a[right]
    a[right] = b[right]
    if (b[right]) {
      b[right][left] = a
    }
    b[left] = undefined
    b[right] = undefined
  }
}

export function compare_keys_array_reverse<K extends Array<ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Compare the keys element by element until a difference is found
    const minLength = Math.min(key1.length, key2.length)
    for (let i = 0; i < minLength; i++) {
      if (key1[i] < key2[i]) {
        return 1
      } else if (key1[i] > key2[i]) {
        return -1
      }
    }

    // If all elements are equal, compare the lengths of the keys
    if (key1.length < key2.length) {
      return 1
    } else if (key1.length > key2.length) {
      return -1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_array<K extends Array<ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Compare the keys element by element until a difference is found
    const minLength = Math.min(key1.length, key2.length)
    for (let i = 0; i < minLength; i++) {
      if (key1[i] < key2[i]) {
        return -1
      } else if (key1[i] > key2[i]) {
        return 1
      }
    }

    // If all elements are equal, compare the lengths of the keys
    if (key1.length < key2.length) {
      return -1
    } else if (key1.length > key2.length) {
      return 1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function compare_keys_object_reverse<
  K extends Record<string, ValueType>,
>(key1: K, key2: K): number {
  if (key1 != null && key2 != null) {
    // Iterate over all of the properties in the key objects
    for (const prop of Object.keys(key1)) {
      // If the second key object does not have the property, the first key is greater
      if (!(prop in key2)) {
        return -1
      }

      // If the values of the properties are not equal, return the comparison of the values
      if (key1[prop] !== key2[prop]) {
        return key1[prop] < key2[prop] ? 1 : -1
      }
    }

    // If all of the properties are equal, but the second key object has additional properties,
    // the first key is less
    if (Object.keys(key2).length > Object.keys(key1).length) {
      return 1
    }

    // If all of the properties are equal, the keys are equal
    return 0
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_object<K extends Record<string, ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Iterate over all of the properties in the key objects
    for (const prop of Object.keys(key1)) {
      // If the second key object does not have the property, the first key is greater
      if (!(prop in key2)) {
        return 1
      }

      // If the values of the properties are not equal, return the comparison of the values
      if (key1[prop] !== key2[prop]) {
        return key1[prop] < key2[prop] ? -1 : 1
      }
    }

    // If all of the properties are equal, but the second key object has additional properties,
    // the first key is less
    if (Object.keys(key2).length > Object.keys(key1).length) {
      return -1
    }

    // If all of the properties are equal, the keys are equal
    return 0
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function compare_keys_primitive_reverse<K extends ValueType>(
  key1?: K,
  key2?: K,
): number {
  if (key1 != null && key2 != null) {
    if (key1 < key2) {
      return 1
    } else if (key1 > key2) {
      return -1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_primitive<K extends ValueType>(
  key1?: K,
  key2?: K,
): number {
  if (key1 != null && key2 != null) {
    if (key1 < key2) {
      return -1
    } else if (key1 > key2) {
      return 1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function count<T, K extends ValueType>(
  key: K,
  node: Node<T, K>,
  comparator: Comparator<K>
): number {
  if (!node) return 0;
  // console.log(`[COUNT] Checking node ${node.id} (leaf=${node.leaf}) for key ${JSON.stringify(key)}`);

  // Use the key directly. Null/undefined check should happen in the BPlusTree wrapper.
  const searchKey = key;

  if (node.leaf) {
    let totalCount = 0;
    // Iterate through keys in the leaf and count exact matches
    for (let i = 0; i < node.key_num; i++) {
      const comparison = comparator(node.keys[i], searchKey);
      if (comparison === 0) {
        totalCount++;
      } else if (comparison > 0) {
        // Since keys are sorted, we can stop if we go past the searchKey
        break;
      }
    }
    // console.log(`[COUNT] Found ${totalCount} matches in leaf node ${node.id}`);
    return totalCount;
  } else {
    // Internal node: Sum counts from relevant children
    let totalCount = 0;
    // console.log(`[COUNT] Internal node ${node.id}. Checking children: ${JSON.stringify(node.children)}`);
    for (let i = 0; i < node.children.length; i++) {
      const childNodeId = node.children[i];
      const childNode = node.tree.nodes.get(childNodeId);
      if (!childNode) continue;
      // console.log(`[COUNT] Checking child ${childNode.id} (min=${JSON.stringify(childNode.min)}, max=${JSON.stringify(childNode.max)})`);

      // --- REVISED LOGIC for checking child range ---
      const childMin = childNode.min;
      const childMax = childNode.max;

      // Skip if the node is completely empty (both min and max are undefined)
      if (childMin === undefined && childMax === undefined) {
          // console.log(`[COUNT] Skipping empty child ${childNode.id}`);
          continue;
      }

      // Skip if the search key is strictly less than the child's minimum (if defined)
      if (childMin !== undefined && comparator(searchKey, childMin) < 0) {
          // console.log(`[COUNT] Skipping child ${childNode.id} because key < min`);
          continue;
      }

      // Skip if the search key is strictly greater than the child's maximum (if defined)
      if (childMax !== undefined && comparator(searchKey, childMax) > 0) {
          // console.log(`[COUNT] Skipping child ${childNode.id} because key > max`);
          continue;
      }

      // In all other cases (key is within defined [min, max], or min/max is undefined),
      // we must descend into the child node as the key might be present.
      // console.log(`[COUNT] Descending into child ${childNode.id}`);
      totalCount += count(searchKey, childNode, comparator);

      /* // OLD LOGIC REMOVED
      // Check if the child node's range could possibly contain the key
      const minComp = comparator(searchKey, childNode.min);
      const maxComp = comparator(searchKey, childNode.max);

      // If searchKey is within the child's range [min, max] (inclusive)
      if (minComp >= 0 && maxComp <= 0) {
        totalCount += count(searchKey, childNode, comparator);
      }
      */
      // --- END REVISED LOGIC ---
    }
    // console.log(`[COUNT] Total ${totalCount} matches found under internal node ${node.id}`);
    return totalCount;
  }
}

export function delete_by_cursor_list<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursors: Array<Cursor<T, K>>,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  const touched_nodes = new Set<number>()
  // console.log(`[delete_by_cursor_list] Deleting ${cursors.length} cursors.`); // Remove log
  // сначала удаляем все записи какие есть
  for (const cursor of cursors) {
    const node = tree.nodes.get(cursor.node)
    const { key, pos } = cursor
    result.push([key, node.pointers.splice(pos, 1, undefined)[0]])
    node.keys.splice(pos, 1, undefined)
    touched_nodes.add(cursor.node)
  }
  // console.log(`[delete_by_cursor_list] Marked ${touched_nodes.size} nodes as touched.`); // Add log
  // обновляем все записи в дереве
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    const new_keys = []
    const new_pointers = []
    for (let i = 0; i < node.size; i++) {
      if (node.keys[i] !== undefined) {
        new_keys.push(node.keys[i])
        new_pointers.push(node.pointers[i])
      }
    }

    node.keys = new_keys
    node.pointers = new_pointers

    update_state(node)
    // Ensure min/max are updated based on potentially new first/last keys
    // Use nullish coalescing for safety if keys array could become empty
    const newMin = node.keys[0] ?? undefined;
    const newMax = node.keys[node.keys.length - 1] ?? undefined;
    if (node.min !== newMin) {
        replace_min(node, newMin);
    }
    if (node.max !== newMax) {
        replace_max(node, newMax);
    }
  }

  // Reflow AFTER all nodes have been cleaned up
  // console.log(`[delete_by_cursor_list] Reflowing ${touched_nodes.size} touched nodes...`); // Remove log
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    if (node) { // Check if node still exists (might have been merged/deleted by a previous reflow)
        reflow(tree, node)
    } // No need to pull up tree here, reflow handles propagation
  }
  try_to_pull_up_tree(tree); // Try pulling up tree once after all reflows are done

  // console.log(`[delete_by_cursor_list] Finished reflowing. Returning ${result.length} items.`); // Remove log
  return result
}

export function delete_by_cursor<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursor: Cursor<T, K>,
): Array<[K, T]> {
  const node = tree.nodes.get(cursor.node)
  const { key, pos } = cursor
  const res: [K, T] = [key, node.pointers.splice(pos, 1)[0]]
  node.keys.splice(pos, 1)
  update_state(node)

  if (pos == 0) {
    replace_min(node, node.keys[0])
  }
  // as far as we splice last item from node it is now at length position
  if (pos == node.keys.length) {
    replace_max(node, node.keys[pos - 1])
  }

  reflow(tree, node)

  try_to_pull_up_tree(tree)
  return [res]
}

export function delete_in_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
  key: K,
  all = false,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  if (all) {
    // Удаляем все в цикле в текущем узле
    let changed = false;
    let current_node = node; // Start with the initial node

    // Iterate through the current node and potentially its right siblings
    while (current_node) {
        let node_changed_in_loop = false;
        // Delete all occurrences in the current node
        while (true) {
          // Use find_first_item_remove for potential optimization? No, find_first_item is fine.
          const pos = find_first_item(current_node.keys, key, tree.comparator);
          if (pos > -1) {
              result.push([current_node.keys[pos], current_node.pointers.splice(pos, 1)[0]]);
              current_node.keys.splice(pos, 1);
              changed = true; // Mark overall change
              node_changed_in_loop = true; // Mark change in this specific node
          } else {
              break; // Key not found in this node, exit inner loop
          }
        }

        // Update state and min/max only if the node changed in this loop iteration
        if (node_changed_in_loop) {
            update_state(current_node);
            update_min_max(current_node);
        }

        // --- CORRECTED SIBLING TRAVERSAL ---
        // Check if we should move to the right sibling
        const rightSibling = current_node.right;
        if (rightSibling && tree.comparator(key, rightSibling.min) === 0) {
            // If the key matches the minimum of the right sibling,
            // it *might* exist there. Continue to the right sibling.
            current_node = rightSibling;
        } else {
            // If no right sibling, or the key is definitely smaller than
            // the right sibling's minimum, stop traversing rightwards.
            current_node = undefined; // End the outer loop
        }
        // --- END CORRECTION ---
    } // End of while (current_node) loop


    // --- REFLOW LOGIC ---
    // Reflow needs to be called on all nodes that were modified.
    // We need to track which nodes were changed.
    // The simplest (though potentially less efficient) way is to reflow
    // the *initial* node passed to the function, as reflow propagates upwards.
    // If the initial node was potentially merged away, we need a more robust way,
    // perhaps reflowing the parent of the initial node if it exists.
    if (changed) {
        // Attempt to reflow the original starting node.
        // Need to check if 'node' still exists in the tree map after potential merges.
        const initialNodeStillExists = tree.nodes.has(node.id);
        if (initialNodeStillExists) {
             reflow(tree, node);
        } else {
            // If the original node was merged/deleted, try reflowing its original parent.
            // This is complex as the parent link might be broken or the parent itself merged.
            // A safer alternative might be to not reflow here and let higher-level calls handle it,
            // but that breaks encapsulation.
            // For now, let's stick to reflowing the initial node if it exists.
            // If it doesn't exist, the merge operation that removed it should have already triggered reflow upwards.
             console.warn(`[delete_in_node all=true] Initial node ${node.id} no longer exists after deletion loop. Reflow might have already occurred.`);
        }
    }
    // --- END REFLOW LOGIC ---

  } else {
    // Удаляем только ПЕРВЫЙ найденный
    const pos = find_first_item(node.keys, key, tree.comparator); // Ищем ПЕРВЫЙ
    if (pos > -1) {
        // console.log(`[delete_in_node] Node ${node.id} BEFORE delete: keys=${JSON.stringify(node.keys)}, key_num=${node.key_num}`);
        const removedValue = node.pointers.splice(pos, 1)[0];
        const removedKey = node.keys.splice(pos, 1)[0];
        result.push([removedKey, removedValue]);
        update_state(node); // Обновляем состояние узла
        // console.log(`[delete_in_node] Node ${node.id} AFTER delete+update_state: keys=${JSON.stringify(node.keys)}, key_num=${node.key_num}`);
        update_min_max(node); // Обновляем min/max узла
        // Call reflow AFTER state updates if changes were made
        reflow(tree, node);
    } else {
      // Key not found in the initial node. Check the right sibling.
      const rightSibling = node.right;
      if (rightSibling && tree.comparator(key, rightSibling.min) >= 0) {
          // Try deleting from the right sibling instead
          // console.log(`[REMOVE SINGLE] Key ${key} not found in node ${node.id}, trying right sibling ${rightSibling.id} because key >= sibling.min`);
          // Call delete_in_node on the sibling, still with all=false
          return delete_in_node(tree, rightSibling, key, false);
      }
      // If not found in initial node AND not in right sibling's min range, return empty
      return result; // Возвращаем пустой массив, если ничего не удалено
    }
  }

  // try_to_pull_up_tree вызывается в конце reflow, если нужно

  // Validate the node after potential changes and reflow
  // runValidation(node, 'delete_in_node'); // Temporarily disable validation here if needed

  return result
}

export function direct_update_value<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
  value: T,
): Cursor<T, K> {
  const node = tree.nodes.get(id)
  if (!node.leaf) throw new Error('can not set node')
  node.pointers[pos] = value
  return { done: false, key: node.keys[pos], value: value, node: id, pos: pos }
}

export function find_first_item_remove<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (comparator(key, a[m]) <= 0) {
      r = m
    } else {
      l = m // Сужение границ
    }
  }
  return comparator(a[r], key) == 0 ? r : -1
}

/**
 * fast search in ordered array
 * @param a array
 * @param key key to find
 * @returns
 */
export function find_first_item<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (comparator(key, a[m]) > 0) {
      l = m // Сужение границ
    } else {
      r = m
    }
  }
  return comparator(a[r], key) == 0 ? r : -1
}

/**
 * search index of first appearance of the item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_first_key<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) > 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  return r
}

export function find_first_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
): Node<T, K> {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)
  // if (!cur) return undefined; // Handle empty tree

  const comparator = tree.comparator

  while (cur && cur.leaf != true) {
    const i = find_first_key(cur.keys, key, comparator);
    let childNodeId;

    // If the search key is equal to the separator key at index `i`,
    // we need to go to the right child subtree (index i + 1).
    // Otherwise, we go to the left child subtree (index i).
    if (i < cur.keys.length && comparator(key, cur.keys[i]) === 0) {
        childNodeId = cur.children[i + 1];
    } else {
        childNodeId = cur.children[i];
    }

    // Add check for valid childNodeId and existence in nodes map
    if (childNodeId === undefined || !nodes.has(childNodeId)) {
        console.error(`[find_first_node] Error: Invalid child node ID ${childNodeId} found in node ${cur.id}. Parent keys: ${JSON.stringify(cur.keys)}, search key: ${JSON.stringify(key)}, index i: ${i}`);
        // Attempt to recover or return current node?
        // Returning undefined might be safer if the structure is broken.
        return undefined; // Indicate failure to find the correct path
    }

    cur = nodes.get(childNodeId);

    // If cur becomes undefined, break the loop or return error
    if (!cur) {
        console.error(`[find_first_node] Error: Child node ID ${childNodeId} not found in nodes map.`);
        return undefined;
    }
  }
  // 'cur' now points to the leaf node found by descending the tree.

  // For non-unique trees, we need the *leftmost* leaf node that could contain the key.
  // Navigate left as long as the left sibling exists and its max key is >= the search key.
  if (!tree.unique && cur) {
    while (cur.left && comparator(key, cur.left.max) <= 0) {
        cur = cur.left;
        // Safety check in case sibling links are broken
        if (!cur) {
            console.error("[find_first_node] Error: Current node became undefined during left sibling traversal.");
            return undefined;
        }
    }
  }

  // Final safety check before returning
  if (!cur) {
      console.error("[find_first_node] Error: Current node is undefined after search.");
      return undefined;
  }
  return cur
}

/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_item<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) >= 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  // Check index `l` after the loop.
  // If l is valid and a[l] matches the key, it's the last occurrence.
  return l >= 0 && l < a.length && comparator(a[l], key) === 0 ? l : -1
}

/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) >= 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  return r
}


export function find_last_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
): Node<T, K> {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)

  while (cur.leaf != true) {
    const i = find_last_key(cur.keys, key, tree.comparator)
    cur = nodes.get(cur.children[i])
  }
  return cur
}

export function get_items_from_array_slice<T, K>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}): Array<T> {
  let result: Array<T>
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    result = array.slice(start, end)
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    result = array.slice(start, end)
    result.reverse()
  }
  return result
}

export function get_items_from_Array<T>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}): Array<T> {
  const result = []
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    for (let i = start; i < end; i++) result.push(array[i])
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    for (let i = start; i > end; i--) result.push(array[i])
  }
  return result
}

export function get_items<T, K extends ValueType>(
  node: Node<T, K>,
  key: K = undefined,
): Array<T> {
  const start = find_first_item(node.keys, key, node.tree.comparator)
  let i = start
  if (node.leaf) {
    if (key === undefined) {
      return node.pointers
    } else {
      const lres = []
      while (node.keys[i] == key) {
        lres.push(node.pointers[i])
        i++
      }
      return lres
    }
  } else throw new Error('can be uses on leaf nodes only')
}

export function insert<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  value: T,
): boolean {
  const leaf = find_first_node(tree, key)
  // console.log(`[insert] Found leaf node ${leaf.id} for key ${key}. Leaf size before insert: ${leaf.size}, t=${tree.t}, isFull threshold=${2 * tree.t - 1}`);

  // Check for uniqueness before insertion
  if (tree.unique) {
      const existingIndex = find_first_item(leaf.keys, key, tree.comparator);
      if (existingIndex !== -1 && leaf.keys[existingIndex] !== undefined && tree.comparator(leaf.keys[existingIndex], key) === 0) {
          // console.log(`[insert] Unique constraint violation for key ${key}. Insert failed.`);
          return false;
      }
  }

  // Insert key and value into the leaf node at the correct sorted position
  // (Assuming direct manipulation or a method like leaf.insert handles this)
  const insertIndex = find_last_key(leaf.keys, key, tree.comparator); // Find position to insert
  leaf.keys.splice(insertIndex, 0, key);
  leaf.pointers.splice(insertIndex, 0, value);
  update_state(leaf); // Update leaf properties (size, key_num)
  // update_min_max is likely called within update_state or should be called here if needed
  // Let's assume update_state handles min/max updates or they happen in split/reflow
  update_min_max(leaf); // Explicitly update min/max after insertion

  // console.log(`[insert] Inserted [${key}, ${JSON.stringify(value)}] into leaf ${leaf.id}. Leaf size after insert: ${leaf.size}`);

  // Check if the leaf node is full after insertion
  if (leaf.isFull) { // isFull likely checks leaf.key_num >= 2 * tree.t - 1
    // console.log(`[insert] Leaf node ${leaf.id} is full (size=${leaf.size}). Calling split...`);
    split(tree, leaf) // split handles splitting the node and updating/splitting parent if necessary
  } else {
      runValidation(leaf, 'insert_no_split'); // Validate leaf if no split occurred
  }
  // split() will call validation internally after its operations
  return true // Return true because insertion was successful
}

// Helper function to run validation and log errors
export function runValidation<T, K extends ValueType>(node: Node<T, K>, operationName: string) {
    if (!node) return; // Skip if node is undefined
    const errors = node.errors; // Use the getter which calls validate_node
    if (errors.length > 0) {
        // console.error(`[VALIDATION FAIL] ${operationName} on Node ${node.id}:`, errors);
    }
}

export function max<T, K extends ValueType>(node: Node<T, K>): K {
  const nodes = node.tree.nodes

  return node.leaf
    ? (node.keys[node.key_num - 1] ?? undefined)
    : node.children?.length
      ? nodes.get(node.children[node.size - 1]).max
      : undefined
}

export function min<T, K extends ValueType>(node: Node<T, K>): K {
  const nodes = node.tree.nodes
  return node.leaf
    ? (node.keys[0] ?? undefined)
    : node.children?.length
      ? nodes.get(node.children[0]).min
      : undefined
}

export function reflow<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (!node) {
      // console.warn('[REFLOW] Called with undefined node.');
      return;
  }
  // console.log(`[REFLOW START] Node ID: ${node.id}, Leaf: ${node.leaf}, Keys: ${node.key_num}, MinKeys: ${node.t - 1}, Parent: ${node._parent}`);

  // Check if the node has fallen below the minimum number of keys
  // Root node has special handling (can have < t-1 keys)
  if (node.id !== tree.root && node.key_num < node.t - 1) {
    // console.log(`[REFLOW UNDERFLOW] Node ${node.id} has underflow (${node.key_num} < ${node.t - 1}). Attempting rebalancing.`);
    const parent = node.parent;
    if (!parent) {
        // console.warn(`[REFLOW] Node ${node.id} has underflow but no parent (and is not root). This should not happen.`);
        node.commit();
        return;
    }

    // --- Find ACTUAL siblings via parent ---
    const nodeIndex = parent.children.indexOf(node.id);
    let actual_left_sibling: Node<T, K> | undefined = undefined;
    let actual_right_sibling: Node<T, K> | undefined = undefined;

    if (nodeIndex > 0) {
      const leftSiblingId = parent.children[nodeIndex - 1];
      actual_left_sibling = tree.nodes.get(leftSiblingId);
    }
    if (nodeIndex < parent.children.length - 1) {
      const rightSiblingId = parent.children[nodeIndex + 1];
      actual_right_sibling = tree.nodes.get(rightSiblingId);
    }
    // console.log(`[REFLOW SIBLINGS CHECK] Node ${node.id} (index ${nodeIndex}): Actual Left=${actual_left_sibling?.id}, Actual Right=${actual_right_sibling?.id}`);
    // --- End Find ACTUAL siblings ---

    // Prioritize borrowing over merging
    // Try borrowing from ACTUAL left sibling
    if (actual_left_sibling && actual_left_sibling.key_num > actual_left_sibling.t - 1) {
      // console.log(`[REFLOW BORROW LEFT] Attempting to borrow from actual left sibling ${actual_left_sibling.id} (keys: ${actual_left_sibling.key_num})`);
      borrow_from_left(node, actual_left_sibling);
      // console.log(`[REFLOW BORROW LEFT DONE] Node ${node.id} keys after borrow: ${node.key_num}`);
      node.commit();
      actual_left_sibling.commit();
      parent.commit();
      return; // Node is balanced
    }

    // Try borrowing from ACTUAL right sibling
    if (actual_right_sibling && actual_right_sibling.key_num > actual_right_sibling.t - 1) {
      // console.log(`[REFLOW BORROW RIGHT] Attempting to borrow from actual right sibling ${actual_right_sibling.id} (keys: ${actual_right_sibling.key_num})`);
      borrow_from_right(node, actual_right_sibling);
      // console.log(`[REFLOW BORROW RIGHT DONE] Node ${node.id} keys after borrow: ${node.key_num}`);
      node.commit();
      actual_right_sibling.commit();
      parent.commit();
      return; // Node is balanced
    }

    // If borrowing failed, try merging
    // console.log(`[REFLOW MERGE] Borrowing failed for node ${node.id}. Attempting merge.`);

    // Try merging with ACTUAL left sibling
    if (actual_left_sibling) {
        // Ensure nodeIndex > 0 is still implicitly true because actual_left_sibling exists
        const separatorIndex = nodeIndex - 1;
        if (separatorIndex >= 0 && separatorIndex < parent.keys.length) {
            const separatorKey = parent.keys[separatorIndex];
            // console.log(`[REFLOW MERGE LEFT] Merging node ${node.id} with actual left sibling ${actual_left_sibling.id}. Separator: ${JSON.stringify(separatorKey)}`);

            merge_with_left(node, actual_left_sibling, separatorKey); // node absorbs actual_left_sibling

            // Explicitly remove actual_left_sibling and correct separator key
            const leftSiblingIndex = parent.children.indexOf(actual_left_sibling.id);
            if (leftSiblingIndex !== -1) {
                parent.children.splice(leftSiblingIndex, 1);
            } else {
                 console.error(`[REFLOW MERGE LEFT] CRITICAL Error: Actual Left sibling ${actual_left_sibling.id} not found in parent ${parent.id} children during merge!`);
            }
            if (separatorIndex < parent.keys.length) {
                 parent.keys.splice(separatorIndex, 1);
            } else {
                 console.error(`[REFLOW MERGE LEFT] CRITICAL Error: Invalid separator index ${separatorIndex} for parent ${parent.id} keys (length ${parent.keys.length})`);
            }
            // Sibling links are updated by merge_with_left or should be handled here/in delete?
            // Let's rely on Node.delete to update neighbors of the deleted sibling

            update_state(parent);
            update_min_max(parent);

            actual_left_sibling.delete(tree); // Delete the merged sibling

            node.commit();
            reflow(tree, parent);
            return;
        } else {
             console.error(`[REFLOW MERGE LEFT] Error: Could not find separator key at index ${separatorIndex} for parent ${parent.id}.`);
             node.commit();
        }
    }
    // Try merging with ACTUAL right sibling
    else if (actual_right_sibling) {
        const separatorIndex = nodeIndex; // Key is at the same index as the node itself
        if (separatorIndex >= 0 && separatorIndex < parent.keys.length) {
            const separatorKey = parent.keys[separatorIndex];
            // console.log(`[REFLOW MERGE RIGHT] Merging node ${node.id} with actual right sibling ${actual_right_sibling.id}. Separator: ${JSON.stringify(separatorKey)}`);

            merge_with_right(node, actual_right_sibling, separatorKey); // node absorbs actual_right_sibling

            // Remove actual_right_sibling from parent
            // remove_node handles keys/children correctly here if passed the correct sibling
            remove_node(parent, actual_right_sibling);

            // update_min_max(node); // merge_with_right should update node min/max
            // Parent was updated by remove_node

            actual_right_sibling.delete(tree); // Delete the merged sibling

            node.commit();
            reflow(tree, parent);
            return;
        } else {
            console.error(`[REFLOW MERGE RIGHT] Error: Could not find separator key at index ${separatorIndex} for parent ${parent.id}.`);
            node.commit();
        }
    }
    // Special case: Node is empty, has no *actual* siblings it could merge with.
    else if (node.isEmpty && parent && parent.children.length === 1 && parent.children[0] === node.id) {
        // console.log(`[REFLOW EMPTY LAST CHILD] Node ${node.id} is empty and the last child of parent ${parent.id}. Removing node and reflowing parent.`);
        remove_node(parent, node); // Remove the empty node from parent
        node.delete(tree); // Delete the node itself
        // console.log(`[REFLOW EMPTY LAST CHILD] Triggering reflow for parent ${parent.id}`);
        reflow(tree, parent); // Reflow the parent, which might become empty or need merging
        return;
    } else {
      // Should not happen if node has underflow but siblings exist or it's root
       // console.warn(`[REFLOW] Unhandled merge/borrow scenario for node ${node.id}. Node state: keys=${node.key_num}, parent=${parent?.id}, left=${actual_left_sibling?.id}, right=${actual_right_sibling?.id}`);
       node.commit();
    }
  } else {
    // Node does not have underflow (or is root)
    // console.log(`[REFLOW OK/ROOT] Node ${node.id} has sufficient keys (${node.key_num} >= ${node.t}) or is root. Committing.`);
    node.commit(); // Commit its current state
    // Check if the root needs to be pulled up (height reduction)
    if (node.id === tree.root) {
        try_to_pull_up_tree(tree);
    }
  }
  // console.log(`[REFLOW END] Node ID: ${node.id}`);
}

export function remove_specific<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  specific: (pointers: T) => boolean,
): Array<[K, T]> {
  const cursors: Array<Cursor<T, K>> = []
  for (const the_one of tree.equalsNulls(key)(tree)) {
    if (specific(the_one.value)) {
      cursors.push(the_one)
    }
  }
  return delete_by_cursor_list<T, K>(tree, cursors)
}

export function remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  all = false,
): Array<[K, T]> {
  // Обработка undefined ключа
  const searchKey = (key === undefined ? null : key) as K;
  const finalKey = searchKey;

  // console.log(`[remove entry] Removing key: ${JSON.stringify(finalKey)}, all=${all}`);

  if (all) {
    // --- CORRECTED LOGIC for all=true ---
    // Find the first potential leaf node
    const leaf = find_first_node(tree, finalKey);
    if (!leaf) {
      return []; // Key range not found
    }
    // Call delete_in_node with all=true; it handles recursion internally
    return delete_in_node(tree, leaf, finalKey, true);

    /* // OLD do...while loop removed
    const allRemoved: Array<[K, T]> = [];
    let removedSingle: Array<[K, T]>;
    do {
      removedSingle = remove(tree, finalKey, false);
      if (removedSingle.length > 0) {
        allRemoved.push(...removedSingle);
      }
    } while (removedSingle.length > 0);
    return allRemoved;
    */

  } else {
    // --- Логика для удаления ОДНОГО элемента ---
    const leaf = find_first_node(tree, finalKey);
    // console.log(`[remove single] Found leaf node ${leaf?.id} for key ${JSON.stringify(finalKey)}`);
    if (!leaf) {
        return [];
    }
    // Directly call delete_in_node. It will handle finding the item
    // and checking the right sibling if necessary.
    const deletedItems = delete_in_node(tree, leaf, finalKey, false);
    // console.log(`[remove single] delete_in_node returned ${deletedItems.length} items. Target leaf ${leaf.id} state: key_num=${leaf.key_num}, keys=${JSON.stringify(leaf.keys)}`);
    return deletedItems;
  }
}

export function size<T, K extends ValueType>(node: Node<T, K>): number {
  let lres = 0
  const start = 0
  let i = start
  if (node.leaf) {
    return node.key_num
  } else {
    const nodes = node.tree.nodes
    const len = node.size
    while (i < len) {
      const res = size(nodes.get(node.children[i]))
      lres += res
      i++
    }
    return lres
  }
}

export function split<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  // console.log(`[split] Splitting node ${node.id} (leaf=${node.leaf}, size=${node.size}, key_num=${node.key_num})`); // Log start of split

  // Create the new sibling node
  const new_node = node.leaf ? Node.createLeaf(tree) : Node.createNode(tree)
  // console.log(`[split] Created new node ${new_node.id}`);

  // Link siblings
  add_sibling(node, new_node, 'right')
  // console.log(`[split] Linked siblings: node ${node.id} <-> node ${new_node.id}`);

  // Calculate split point
  const splitIndex = Math.floor(node.key_num / 2);
  let keyToInsertInParent: K;

  // Move the second half of keys and pointers/children to the new node
  if (node.leaf) {
    // Leaf node split:
    // Key at splitIndex is COPIED up (it remains in the new_node)
    keyToInsertInParent = node.keys[splitIndex]; // Key to copy up
    const splitKeyIndex = splitIndex; // Start moving keys/pointers from this index
    new_node.keys = node.keys.splice(splitKeyIndex);
    new_node.pointers = node.pointers.splice(splitKeyIndex);
  } else {
    // Internal node split:
    // Key at splitIndex MOVES up
    keyToInsertInParent = node.keys[splitIndex]; // Key to move up

    // Move keys AFTER splitIndex to new_node
    new_node.keys = node.keys.splice(splitIndex + 1);
    // Move children AFTER splitIndex pointer to new_node
    new_node.children = node.children.splice(splitIndex + 1);

    // Remove the key that moved up (at splitIndex) from the original node
    node.keys.splice(splitIndex);

    // Re-assign parent for moved children
    new_node.children.forEach(childId => {
        const childNode = tree.nodes.get(childId);
        if (childNode) childNode.parent = new_node;
    });
  }

  // console.log(`[split] Moved items. Node ${node.id} keys: ${JSON.stringify(node.keys)}, Node ${new_node.id} keys: ${JSON.stringify(new_node.keys)}`);

  // Update state for both nodes
  update_state(node);
  update_state(new_node);
  // console.log(`[split] Updated states. Node ${node.id} size=${node.size}, Node ${new_node.id} size=${new_node.size}`);

  // Update min/max for both nodes (crucial!)
  update_min_max(node);
  update_min_max(new_node);
  // console.log(`[split] Updated min/max. Node ${node.id} min=${node.min},max=${node.max}. Node ${new_node.id} min=${new_node.min},max=${new_node.max}`);


  // Insert the key into the parent or create a new root
  if (node.id == tree.root) {
    // console.log(`[split] Node ${node.id} is root. Creating new root.`);
    // Create a new root with the keyToInsertInParent
    const newRoot = Node.createNode(tree); // New root is always an internal node
    newRoot.keys = [keyToInsertInParent];
    newRoot.children = [node.id, new_node.id];
    node.parent = newRoot;
    new_node.parent = newRoot;
    update_state(newRoot);
    update_min_max(newRoot);
    tree.root = newRoot.id;
    // console.log(`[split] New root is ${newRoot.id}`);
  } else {
    const parent = node.parent
    // console.log(`[split] Inserting key ${keyToInsertInParent} into parent ${parent.id}`);

    // Insert the key into the parent at the correct position
    const keyInsertPos = find_first_key(parent.keys, keyToInsertInParent, tree.comparator);
    parent.keys.splice(keyInsertPos, 0, keyToInsertInParent);

    // Insert child pointer - this always happens
    const nodeIndexInParent = parent.children.indexOf(node.id);
    if (nodeIndexInParent !== -1) {
        // Insert the new_node's ID into the parent's children array immediately after the original node
        parent.children.splice(nodeIndexInParent + 1, 0, new_node.id);
    } else {
        console.error(`[split] FATAL Error: Node ${node.id} not found in parent ${parent.id}'s children during split.`);
    }

    new_node.parent = parent; // Ensure new node's parent is set

    update_state(parent); // Update parent state
    update_min_max(parent); // Update parent min/max

    // Check if parent is now full and needs splitting
    if (parent.isFull) {
      // console.log(`[split] Parent node ${parent.id} is now full. Splitting parent.`);
      split(tree, parent)
    } else {
        runValidation(parent, 'split_parent_updated');
    }
  }
  // Validate nodes involved in the split
  runValidation(node, 'split_node_final');
  runValidation(new_node, 'split_new_node_final');
  // If parent exists, validate it too, as it was modified
  if(node.parent && node.id !== tree.root) {
      runValidation(node.parent, 'split_parent_final');
  }
}

export function try_to_pull_up_tree<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
): void {
  // console.log(`[PULL UP CHECK START] Root ID: ${tree.root}`); // Remove log
  const nodes = tree.nodes
  const root = nodes.get(tree.root)
  // console.log(`[PULL UP CHECK] Root ID: ${root.id}, Size: ${root.size}, Leaf: ${root.leaf}`); // Remove log
  if (root.size == 1 && !root.leaf) {
    // console.log(`[PULL UP ACTION] Root ${root.id} has only one child. Pulling up child ${root.children[0]}`); // Remove log
    const node = nodes.get(tree.root)
    const new_root = nodes.get(root.children.pop())
    tree.root = new_root.id
    new_root.parent = undefined
    // console.log(`[PULL UP ACTION] New root is ${new_root.id}. Deleting old root ${node.id}.`); // Remove log
    node.delete(tree) // <<<--- Pass tree
  } else {
    // console.log(`[PULL UP CHECK] No pull-up needed for root ${root.id}.`); // Remove log
  }
  // console.log(`[PULL UP CHECK END] Root ID: ${tree.root}`); // Remove log
}

export function borrow_from_left<T, K extends ValueType>(
  node: Node<T, K>,
  left_sibling: Node<T, K>,
): void {
  const parent = node.parent;
  if (!parent) return; // Should not happen if siblings exist

  const childIndex = parent.children.indexOf(node.id);
  const separatorIndex = childIndex - 1;

  if (node.leaf) {
    // Move last key/pointer from left sibling to the beginning of node
    const borrowedKey = left_sibling.keys.pop();
    const borrowedPointer = left_sibling.pointers.pop();
    node.keys.unshift(borrowedKey);
    node.pointers.unshift(borrowedPointer);

    // Update parent separator key to the new minimum of the current node
    parent.keys[separatorIndex] = node.keys[0];

  } else {
    // Internal node case
    // Move separator key from parent down to the beginning of node keys
    const parentSeparator = parent.keys[separatorIndex];
    node.keys.unshift(parentSeparator);

    // Move last child from left sibling to the beginning of node children
    const borrowedChildId = left_sibling.children.pop();
    node.children.unshift(borrowedChildId);
    const borrowedChildNode = node.tree.nodes.get(borrowedChildId);
    if (borrowedChildNode) borrowedChildNode.parent = node;

    // Remove the corresponding key from left_sibling (the one before the moved child)
    // This key effectively becomes the new separator in the parent
    const newParentSeparator = left_sibling.keys.pop(); // Key to move up
    parent.keys[separatorIndex] = newParentSeparator;

  }

  // Update states and min/max for node and sibling
  update_state(node);
  update_min_max(node);
  update_state(left_sibling);
  update_min_max(left_sibling);

  // Parent's keys changed, min/max might need update
  update_min_max(parent);

  // Commit changes
  node.commit() // Mark node as processed for reflow
  left_sibling.commit()
  parent.commit()

  // Validate involved nodes
  runValidation(node, 'borrow_from_left');
  runValidation(left_sibling, 'borrow_from_left_sibling');
  runValidation(parent, 'borrow_from_left_parent');
}

export function borrow_from_right<T, K extends ValueType>(
  node: Node<T, K>,
  right_sibling: Node<T, K>,
): void {
    const parent = node.parent;
    if (!parent) return;

    const childIndex = parent.children.indexOf(node.id);
    const separatorIndex = childIndex;

    if (node.leaf) {
        // Move first key/pointer from right sibling to the end of node
        const borrowedKey = right_sibling.keys.shift();
        const borrowedPointer = right_sibling.pointers.shift();
        node.keys.push(borrowedKey);
        node.pointers.push(borrowedPointer);

        // Update parent separator key to the new first key of the right sibling
        if (right_sibling.key_num > 0) {
            parent.keys[separatorIndex] = right_sibling.keys[0];
        } else {
             if (right_sibling.keys.length > 0) { // Double check for safety
                parent.keys[separatorIndex] = right_sibling.keys[0];
             } else {
                // Edge case: right sibling became empty. Reflow/merge will handle parent key.
             }
        }

    } else {
        // Internal node case
        // Move separator key from parent down to the end of node keys
        const parentSeparator = parent.keys[separatorIndex];
        node.keys.push(parentSeparator);

        // Move first child from right sibling to the end of node children
        const borrowedChildId = right_sibling.children.shift();
        node.children.push(borrowedChildId);
        const borrowedChildNode = node.tree.nodes.get(borrowedChildId);
        if (borrowedChildNode) borrowedChildNode.parent = node;

        // Remove the corresponding key from the right sibling (the one after the moved child)
        // This key becomes the new separator in the parent.
        const newParentSeparator = right_sibling.keys.shift(); // Key to move up
        parent.keys[separatorIndex] = newParentSeparator;
    }

    // Update states and min/max
    update_state(node);
    update_min_max(node);
    update_state(right_sibling);
    update_min_max(right_sibling);

    // Parent's keys changed, min/max might need update
    update_min_max(parent);

    // Commit changes
    node.commit()
    right_sibling.commit()
    parent.commit()

    // Validate involved nodes
    runValidation(node, 'borrow_from_right');
    runValidation(right_sibling, 'borrow_from_right_sibling');
    runValidation(parent, 'borrow_from_right_parent');
}

```

`src/minimal.ts`

```ts
// Note: This is an inferred interface based on usage analysis.
// The actual interface might differ.

// Assumed type definition for serialized data
interface PortableBPlusTree<K, V> {
  // Structure depends on the library's serialization format
}

// Assumed structure for the cursor yielded by each()
interface Cursor<K, V> {
    key: K;
    value: V;
    // potentially other properties
}

// Interface for BPlusTree instance methods/properties
interface IBPlusTree<K, V> {
  // Properties/Getters
  readonly min: K | undefined; // Smallest key in the tree
  readonly max: K | undefined; // Largest key in the tree
  readonly size: number;       // Number of elements in the tree

  // Methods
  insert(key: K, value: V): unknown; // Return type still unclear
  remove(key: K): unknown; // Removes all values for the key, return type unclear
  removeSpecific(key: K, predicate: (value: V) => boolean): unknown; // Removes specific value, return type unclear

  findFirst(key: K): V | undefined; // Finds the first value associated with the key
  findLast(key: K): V | undefined; // Finds the last value associated with the key
  find?(key: K): V[] | IterableIterator<V>; // Finds all values (if non-unique), exact signature uncertain

  reset(): void; // Clears the tree

  /** Returns a function that, when called with the tree, provides an iterator. */
  each(forward?: boolean): (tree: this) => IterableIterator<Cursor<K, V>>;

  // Standard iteration protocols are likely also supported
  // [Symbol.iterator](): IterableIterator<[K, V]>;
  // entries?(): IterableIterator<[K, V]>;
  // keys?(): IterableIterator<K>;
  // values?(): IterableIterator<V>;
}

// Interface for BPlusTree static methods (and constructor)
interface IBPlusTreeStatic {
  new <K, V>(order?: number, unique?: boolean): IBPlusTree<K, V>;
  serialize<K, V>(tree: IBPlusTree<K, V>): PortableBPlusTree<K, V>;
  createFrom<K, V>(data: PortableBPlusTree<K, V>): IBPlusTree<K, V>; // Creates a new tree instance
  deserialize<K, V>(targetTree: IBPlusTree<K, V>, data: PortableBPlusTree<K, V>): void; // Modifies targetTree in place
}

// Example usage
// declare const BPlusTree: IBPlusTreeStatic;
// const tree1 = new BPlusTree<string, number>(32, false);
// tree1.insert('a', 1);
// tree1.insert('b', 2);
// const treeSize = tree1.size;
// const serialized = BPlusTree.serialize(tree1);
// const tree2 = new BPlusTree<string, number>();
// BPlusTree.deserialize(tree2, serialized); // tree2 now contains data from tree1
// const iteratorFunc = tree1.each();
// for (const cursor of iteratorFunc(tree1)) {
//     console.log(cursor.key, cursor.value);
// }
// tree1.reset(); // tree1 is now empty
```

`src/Node.ts`

```ts
import type { BPlusTree } from './BPlusTree'
import { runValidation } from './methods'
import { add_initial_nodes, find_first_item, find_last_key, remove_sibling } from './methods'

export type valueOf = { valueOf(): any }
export type ValueType = number | string | boolean | Date | bigint | valueOf
export type Value = unknown

// можно использовать скип, относительное перемещение по страницам... зная их размер,можно просто пропускать сколько нужно
// можно в курсорах указывать: отсюда и 10 элементов
// перемещаться так же можно по ключу --- значению
/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */
export type PortableBPlusTree<T, K extends ValueType> = {
  t: number
  next_node_id: number
  root: number
  unique: boolean
  nodes: Array<PortableNode<T, K>>
}

// TODO: MAKE NODE SIMPLE OBJECT with static methods?????
export class Node<T, K extends ValueType> {
  static createLeaf<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.leaf = true
    // node.t = tree.t
    node.pointers = []
    register_node(tree, node)
    return node
  }
  static createNode<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.children = []
    node.leaf = false
    // node.t = tree.t
    register_node(tree, node)
    return node
  }
  static createRootFrom<T, K extends ValueType>(
    tree: BPlusTree<T, K>,
    ...node: Array<Node<T, K>>
  ): Node<T, K> {
    const root = Node.createNode(tree)
    add_initial_nodes(root, node)
    return root
  }
  static serialize<T, K extends ValueType>(
    node: Node<T, K>,
  ): PortableNode<T, K> {
    const {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys,
      key_num,
      pointers,
      children,
    } = node
    return {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys: node.tree.keySerializer(keys),
      key_num,
      pointers,
      children,
    }
  }
  static deserialize<T, K extends ValueType>(
    stored: PortableNode<T, K>,
    tree: BPlusTree<T, K>,
  ): Node<T, K> {
    const node = new Node<T, K>()
    node.tree = tree
    node.id = stored.id
    node.leaf = stored.leaf
    // node.t = stored.t
    node._parent = stored._parent
    node._left = stored._left
    node._right = stored._right
    node.isEmpty = stored.isEmpty
    node.isFull = stored.isFull
    node.max = stored.max
    node.min = stored.min
    node.size = stored.size
    node.keys = tree.keyDeserializer(stored.keys)
    node.key_num = stored.key_num
    node.pointers = stored.pointers
    node.children = stored.children
    return node
  }

  id: number
  get t(): number {
    return this.tree?.t ?? 32
  }
  //count of containing elements
  length: number // количество элементов в узле
  // t: number
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  size: number // значимый размер узла
  keys: Array<K> // ключи узла
  pointers: Array<T> // если лист — указатели на данные
  min: K
  max: K
  isFull: boolean
  isEmpty: boolean
  tree: BPlusTree<T, K>
  private constructor() {
    this.keys = []

    this.key_num = 0
    this.size = 0
    this.isFull = false
    this.isEmpty = true
    this.min = undefined
    this.max = undefined
  }

  delete(tree: BPlusTree<T, K>): void {
    unregister_node(tree, this)
  }

  insert(item: [K, T]): void {
    const [key, value] = item
    const pos = find_last_key(this.keys, key, this.tree.comparator)
    this.keys.splice(pos, 0, key)
    this.pointers.splice(pos, 0, value)

    update_state(this)

    if (pos == 0) {
      insert_new_min(this, key)
    }
    if (pos == this.size - 1) {
      insert_new_max(this, key)
    }
  }

  remove(item: K): [K, T] {
    const pos = find_first_item(this.keys, item, this.tree.comparator)
    const res: [K, T] = [item, this.pointers.splice(pos, 1)[0]]
    this.keys.splice(pos, 1)
    update_state(this)

    if (pos == 0) {
      replace_min(this, this.keys[0])
    }
    // as far as we splice last item from node it is now at length position
    if (pos == this.keys.length) {
      replace_max(this, this.keys[pos - 1])
    }
    return res
  }

  commit(): void {
    if (this.key_num == 0 && this.size == 1 && this.parent && !this.leaf) {
      push_node_up(this)
      if (this.parent?.size > 0) {
        this.parent.commit()
      }
    }
  }

  get errors(): Array<string> {
    return validate_node(this)
  }

  toJSON(): PortableNode<T, K> & { errors: Array<string> } {
    if (this.leaf) {
      return {
        t: this.t,
        isEmpty: this.isEmpty,
        size: this.size,
        children: [],
        id: this.id,
        leaf: this.leaf,
        keys: this.tree.keySerializer(this.keys),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        pointers: this.pointers,
        _left: this._left,
        _right: this._right,
        _parent: this._parent,
        isFull: this.isFull,
        errors: this.errors,
      }
    } else {
      return {
        id: this.id,
        t: this.t,
        isEmpty: this.isEmpty,
        size: this.size,
        leaf: this.leaf,
        keys: this.tree.keySerializer(this.keys),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        _left: this._left,
        _right: this._right,
        children: this.children,
        pointers: undefined,
        _parent: this._parent,
        isFull: this.isFull,
        errors: this.errors,
      }
    }
  }

  children: Array<number> // ключи на детей узла

  // указатель на отца
  _parent: number

  get parent(): Node<T, K> {
    return this.tree?.nodes.get(this._parent) ?? undefined
  }
  set parent(node: Node<T, K>) {
    this._parent = node?.id ?? undefined
  }
  // указатель на левого брата
  _left: number
  _right: number
  get left(): Node<T, K> {
    return this.tree?.nodes.get(this._left) ?? undefined
  }
  set left(node: Node<T, K>) {
    this._left = node?.id ?? undefined
  }
  // указатель на правого брата
  get right(): Node<T, K> {
    return this.tree?.nodes.get(this._right) ?? undefined
  }
  set right(node: Node<T, K>) {
    this._right = node?.id ?? undefined
  }
}

/**
 * все манипуляции с деревом простое объединение массивов
 * поскольку мы знаем что и откуда надо брать
 * отсюда: все операции это просто функции
 *
 * операции пользователя это вставка... он вставляет только данные а не узлы дерева
 * а это методы дерева
 *
 */

export function validate_node<T, K extends ValueType>(
  node: Node<T, K>,
): Array<string> {
  const res: Array<string> = []
  const nodes = node.tree?.nodes; // Need access to other nodes
  const comparator = node.tree?.comparator;

  if (!nodes || !comparator) {
      res.push(`!FATAL: Node ${node.id} missing tree or comparator for validation`);
      return res;
  }

  // Basic state checks (already existing)
  if (!node.isEmpty) {
    if (!node.leaf) {
      if (node.children.length != node.keys.length + 1) {
        res.push(
          `!children ${node.leaf ? 'L' : 'N'}${node.id} children:${node.children.length} != keys:${node.keys.length}+1`,
        )
      }
      if (node.keys.length != node.key_num) {
        res.push(`!keys ${node.id} key_num:${node.key_num} != keys.length:${node.keys.length}`)
      }
    }
    if (node.size != (node.leaf ? node.key_num : node.children.length)) {
      res.push(`!size ${node.id} size:${node.size} != leaf?key_num:children.length`) // Adjusted msg
    }

    // --- NEW ASSERTIONS ---

    // 1. Check key sorting
    for (let i = 0; i < node.key_num - 1; i++) {
      if (comparator(node.keys[i], node.keys[i+1]) > 0) {
          res.push(`!keys_unsorted N${node.id} idx:${i} ${JSON.stringify(node.keys[i])} > ${JSON.stringify(node.keys[i+1])}`);
      }
    }

    // 2. Check min/max values
    if (node.leaf) {
        if (node.key_num > 0) {
            if (comparator(node.min, node.keys[0]) !== 0) {
                res.push(`!min_leaf N${node.id} node.min:${JSON.stringify(node.min)} != keys[0]:${JSON.stringify(node.keys[0])}`);
            }
            if (comparator(node.max, node.keys[node.key_num - 1]) !== 0) {
                 res.push(`!max_leaf N${node.id} node.max:${JSON.stringify(node.max)} != keys[last]:${JSON.stringify(node.keys[node.key_num - 1])}`);
            }
        }
    } else { // Internal node
        if (node.children.length > 0) {
            const firstChild = nodes.get(node.children[0]);
            const lastChild = nodes.get(node.children[node.children.length - 1]);
            if (firstChild && firstChild.min !== undefined && comparator(node.min, firstChild.min) !== 0) {
                 res.push(`!min_internal N${node.id} node.min:${JSON.stringify(node.min)} != child[0].min:${JSON.stringify(firstChild.min)}`);
            }
            if (lastChild && lastChild.max !== undefined && comparator(node.max, lastChild.max) !== 0) {
                 res.push(`!max_internal N${node.id} node.max:${JSON.stringify(node.max)} != child[last].max:${JSON.stringify(lastChild.max)}`);
            }
        }
    }

    // 3. Check internal node key/child consistency
    if (!node.leaf) {
        for (let i = 0; i < node.key_num; i++) {
            const leftChild = nodes.get(node.children[i]);
            const rightChild = nodes.get(node.children[i+1]);
            const key = node.keys[i];

            if (leftChild && leftChild.max !== undefined && comparator(leftChild.max, key) > 0) {
                 res.push(`!internal_order N${node.id} child[${i}].max:${JSON.stringify(leftChild.max)} > key[${i}]:${JSON.stringify(key)}`);
            }
            // For non-unique trees, right child min CAN be equal to key
            if (rightChild && rightChild.min !== undefined && comparator(key, rightChild.min) > 0) {
                 res.push(`!internal_order N${node.id} key[${i}]:${JSON.stringify(key)} > child[${i+1}].min:${JSON.stringify(rightChild.min)}`);
            }
            // More strict check for unique trees
            if (node.tree.unique) {
                 if (leftChild && leftChild.max !== undefined && comparator(leftChild.max, key) >= 0) {
                     res.push(`!internal_order_unique N${node.id} child[${i}].max:${JSON.stringify(leftChild.max)} >= key[${i}]:${JSON.stringify(key)}`);
                 }
                  if (rightChild && rightChild.min !== undefined && comparator(key, rightChild.min) >= 0) {
                     res.push(`!internal_order_unique N${node.id} key[${i}]:${JSON.stringify(key)} >= child[${i+1}].min:${JSON.stringify(rightChild.min)}`);
                 }
            }
        }
    }

  }
  return res
}

export function insert_new_max<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.max = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    if (parent.children.indexOf(cur.id) == parent.key_num) {
      parent.max = key
      cur = parent
    } else break
  }
}

export function insert_new_min<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.min = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export type PortableNode<T, K extends ValueType> = {
  id: number
  t: number
  _parent: number
  _left: number
  _right: number
  isEmpty: boolean
  isFull: boolean
  leaf: boolean
  max: K
  min: K
  size: number
  keys: any
  key_num: number
  pointers: Array<T>
  children: Array<number>
  errors?: Array<string>
}

export function push_node_up<T, K extends ValueType>(node: Node<T, K>): void {
  const child = node.tree.nodes.get(node.children.pop())
  const parent = node.parent
  // вставляем на прямо на то же место где и был
  const pos = parent.children.indexOf(node.id)
  parent.children[pos] = child.id
  child.parent = parent
  if (node.right) remove_sibling(node.right, 'left')
  if (node.left) remove_sibling(node.left, 'right')
  node.parent = undefined
  node.delete(node.tree)
  parent.commit()
}

export function register_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  node.tree = tree
  node.id = tree.get_next_id()
  tree.nodes.set(node.id, node)
}

export function remove_node<T, K extends ValueType>(
  obj: Node<T, K>, // Parent node
  item: Node<T, K>, // Child node to remove
): Node<T, K> {
  const pos = obj.children.indexOf(item.id);
  if (pos === -1) {
    // Item not found in children, maybe it's a leaf being removed?
    // This case needs clarification or separate handling if applicable.
    // For now, let's assume obj is always the parent.
    console.warn(`[remove_node] Node ${item.id} not found in parent ${obj.id} children.`);
    return item; // Or throw error
  }

  obj.children.splice(pos, 1)
  //
  // let removedKey = null; // Variable to store the removed key for logging
  if (pos == 0) {
    // If removing the first child, remove the key *after* it (which is the first key)
    if (obj.keys.length > 0) { // Check if there are keys to remove
       /* removedKey =  */obj.keys.shift();
    }
  } else {
    // If removing non-first child, remove the key *before* it
    /* removedKey =  */obj.keys.splice(pos - 1, 1)[0]; // Get the removed key
  }
  item.parent = undefined

  const leftSibling = item.left;
  const rightSibling = item.right;

  if (leftSibling) {
    leftSibling.right = rightSibling;
  }
  if (rightSibling) {
    rightSibling.left = leftSibling;
  }

  item.left = undefined;
  item.right = undefined;

  // Update state for the parent node AFTER modifying keys/children
  update_state(obj);

  // --- ADDED: Recalculate parent's min/max based on current children ---
  update_min_max(obj);

  return item
}

export function replace_max<T, K extends ValueType>(
  node: Node<T, K>,
  key: K | undefined,
): void {
  node.max = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos == parent.children.length - 1) {
      parent.max = key
      cur = parent
    } else {
      break
    }
  }
}

export function replace_min<T, K extends ValueType>(
  node: Node<T, K>,
  key: K | undefined,
): void {
  // Handle case where node might become empty after removal
  if (key === undefined && node.key_num === 0) {
       node.min = undefined; // Node is empty, set min to undefined
  } else {
      // Set min only if key is valid (not undefined or handled above)
      // If key is undefined here, it means node is empty, min is already set.
      if (key !== undefined) {
          node.min = key
      }
  }

  // Continue propagation logic regardless of whether the node became empty
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    // If key is undefined (node became empty), we might need to update parent's key
    // with the *next* available minimum from a sibling, but reflow/remove_node handles that.
    // For now, let's focus on propagating the change indication.
    // If the node is empty, what key should replace the parent separator?
    // This seems problematic. Let's stick to propagating the provided key (even if undefined).
    // const effectiveKey = key; // Use the key passed in (might be undefined)

    if (pos > 0) { // If current node is not the first child
      // Update the separator key in the parent to the left of this child
      // If effectiveKey is undefined, what should happen here?
      // This suggests the early return might have been correct, and reflow must handle everything.
      // Let's revert the logic for now and rely on reflow.
      // Reverting: Check if key is defined before updating parent key.
      if (key !== undefined) {
         // Only update parent key if the new min for this subtree actually changes the separator key
         if (parent.keys[pos - 1] !== key) { // Check if update is needed
            parent.keys[pos - 1] = key;
         }
      } // else: If node became empty, reflow will merge/borrow and fix parent keys later.

      // --- RESTORE BREAK ---
      // Change to a parent separator key should not propagate further up as parent's min.
      break;
    } else { // Current node IS the first child
      // Update parent's min and continue propagating up
      // If node became empty, parent's min should also become undefined.
      parent.min = key // Update parent.min regardless of whether key is undefined
      cur = parent
    }
  }
}

export function unregister_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)

  // --- ADDED: Update neighbors' sibling pointers ---
  const leftSibling = node.left;
  const rightSibling = node.right;
  if (leftSibling) {
      leftSibling.right = rightSibling; // Update left neighbor's right pointer
  }
  if (rightSibling) {
      rightSibling.left = leftSibling; // Update right neighbor's left pointer
  }
  // --- END ADDED ---

  node.tree = undefined
  node.left = undefined; // Clear own pointers too
  node.right = undefined;
  node.parent = undefined;
  tree.nodes.delete(node.id)
}

export function update_min_max<T, K extends ValueType>(node: Node<T, K>): void {
  if (!node.isEmpty) {
    const nodes = node.tree.nodes
    if (node.leaf) {
      // Restore original logic for leaf nodes
      replace_min(node, node.keys[0])
      replace_max(node, node.keys[node.key_num - 1]) // Use key_num for correct index
    } else {
      // Keep the checks only for internal nodes
      const firstChild = nodes.get(node.children[0]);
      // Use node.children.length for correct index of last child
      const lastChild = nodes.get(node.children[node.children.length - 1]);

      if (!firstChild) {
        // console.error(`[update_min_max] Error: First child node ${node.children[0]} not found for internal node ${node.id}`);
        replace_min(node, undefined);
      } else {
        if (firstChild.min === undefined) {
            // console.warn(`[update_min_max] Warning: First child ${firstChild.id} of node ${node.id} has undefined min.`);
            // Propagate undefined for now
        }
        replace_min(node, firstChild.min);
      }

      if (!lastChild) {
        //  console.error(`[update_min_max] Error: Last child node ${node.children[node.children.length - 1]} not found for internal node ${node.id}`);
         replace_max(node, undefined);
      } else {
          if (lastChild.max === undefined) {
              // console.warn(`[update_min_max] Warning: Last child ${lastChild.id} of node ${node.id} has undefined max.`);
              // Propagate undefined for now
          }
          replace_max(node, lastChild.max);
      }
    }
  } else {
    node.min = undefined
    node.max = undefined
  }
}

export function update_state<T, K extends ValueType>(node: Node<T, K>): void {
  // Use key_num for fullness check as it represents the number of keys
  node.key_num = node.keys.length
  node.size = node.leaf ? node.key_num : node.children.length

  // Correct fullness check based on key_num and the maximum number of keys (2*t - 1)
  node.isFull = node.key_num >= (2 * node.t - 1) // Node is full if key count reaches the max

  node.isEmpty = node.key_num <= 0 // Node is empty if it has no keys
}

export function merge_with_left<T, K extends ValueType>(
  node: Node<T, K>,
  left_sibling: Node<T, K>,
  separatorKey: K
): void {
  if (node.leaf) {
    node.keys.unshift(...left_sibling.keys.splice(0));
    node.pointers.unshift(...left_sibling.pointers.splice(0));
    update_state(node);
    update_state(left_sibling);
    update_min_max(node);
  } else { // Internal node case
    const originalNodeKeys = [...node.keys];
    const originalNodeChildren = [...node.children];
    const siblingKeys = left_sibling.keys.splice(0);
    const siblingChildren = left_sibling.children.splice(0);
    node.keys = [...siblingKeys, separatorKey, ...originalNodeKeys];
    node.children = [...siblingChildren, ...originalNodeChildren];

    // Reparent moved children
    const nodes = node.tree.nodes;
    siblingChildren.forEach(childId => {
        const childNode = nodes.get(childId);
        if (childNode) childNode.parent = node;
    });

    // Update states
    update_state(node);
    update_state(left_sibling); // Sibling is now empty
    update_min_max(node);
  }

  // Validate node after merge
  runValidation(node, 'merge_with_left_node');
  // left_sibling is likely empty/invalid now, validation might fail or be meaningless
}

export function merge_with_right<T, K extends ValueType>(
  node: Node<T, K>,
  right_sibling: Node<T, K>,
  separatorKey: K
): void {
  // const parentId = node.parent?.id; // Get parent ID before potential changes
  if (node.leaf) {
    // const originalNodeKeys = [...node.keys];
    // const originalSiblingKeys = [...right_sibling.keys];

    const siblingKeys = right_sibling.keys.splice(0);
    const siblingPointers = right_sibling.pointers.splice(0);
    node.keys.push(...siblingKeys);
    node.pointers.push(...siblingPointers);

    update_state(node);
    update_state(right_sibling);
    update_min_max(node);
  } else { // Internal node case
    const originalNodeKeys = [...node.keys];
    // const originalNodeChildren = [...node.children];

    const siblingKeys = right_sibling.keys.splice(0);
    const siblingChildren = right_sibling.children.splice(0);

    // --- CORRECTED MERGE LOGIC FOR KEYS ---
    // Rebuild the keys array to ensure sorted order
    node.keys = [...originalNodeKeys, separatorKey, ...siblingKeys];
    // --- END CORRECTION ---

    // Append children from the right sibling
    node.children.push(...siblingChildren);

    // Reparent moved children
    const nodes = node.tree.nodes;
    siblingChildren.forEach(childId => {
        const childNode = nodes.get(childId);
        if (childNode) {
            childNode.parent = node;
        }
    });

    // Update states
    update_state(node);
    update_state(right_sibling); // Sibling is now empty
    update_min_max(node);
  }

  // Validate nodes after merge
  runValidation(node, 'merge_with_right_node');
  // right_sibling is likely empty/invalid now, validation might fail or be meaningless
}

```

`src/print_node.ts`

```ts
import type { BPlusTree } from './BPlusTree'
import { printTree } from './print-tree'
import type { PortableNode } from './Node'
import type { Node } from './Node'
import type { ValueType } from './Node'

export function print_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node?: Node<T, K>,
): Array<string> {
  if (!node) {
    node = tree.node(tree.root)
  }
  const nodes = tree.nodes
  return printTree(
    node?.toJSON(),
    (node: PortableNode<T, K>) =>
      `${node._parent ? 'N' : ''}${node._parent ?? ''}${
        node._parent ? '<-' : ''
      }${node.isFull ? '!' : ''}${node.leaf ? 'L' : 'N'}${node.id} <${
        JSON.stringify(node.min) ?? ''
      }:${JSON.stringify(node.max) ?? ''}> ${JSON.stringify(node.keys)} L:${
        node.leaf ? 'L' : 'N'
      }${node._left ?? '-'} R:${node.leaf ? 'L' : 'N'}${node._right ?? '-'} ${
        node.leaf ? JSON.stringify(node.pointers) : ''
      } ${node.errors.length == 0 ? '' : `[error]: ${node.errors.join(';')}`}`,
    (node: PortableNode<T, K>) =>
      node.children.map((c) => nodes.get(c).toJSON()),
  )
}

```

`src/print-tree.ts`

```ts
import type { ValueType } from './Node'
type PrintNode<T, K> = (node: T, branch: string) => string
type GetChildren<T, K> = (node: T) => Array<T>

export function printTree<T, K extends ValueType>(
  initialTree: T,
  printNode: PrintNode<T, K>,
  getChildren: GetChildren<T, K>,
): Array<string> {
  const result: Array<string> = []
  const tree: T = initialTree
  const branch: string = ''

  printBranch(tree, branch, result, printNode, getChildren)
  return result
}

function printBranch<T, K extends ValueType>(
  tree: T,
  branch: string,
  result: Array<string>,
  printNode: PrintNode<T, K>,
  getChildren: GetChildren<T, K>,
) {
  const isGraphHead = branch.length === 0
  const children = getChildren(tree) || []

  let branchHead = ''

  if (!isGraphHead) {
    branchHead = children && children.length !== 0 ? '┬ ' : '─ '
  }

  const toPrint = printNode(tree, `${branch}${branchHead}`)

  if (typeof toPrint === 'string') {
    result.push(`${branch}${branchHead}${toPrint}`)
  }

  let baseBranch = branch

  if (!isGraphHead) {
    const isChildOfLastBranch = branch.slice(-2) === '└─'
    baseBranch = branch.slice(0, -2) + (isChildOfLastBranch ? '  ' : '│ ')
  }

  const nextBranch = `${baseBranch}├─`
  const lastBranch = `${baseBranch}└─`

  children.forEach((child, index) => {
    printBranch(
      child,
      children.length - 1 === index ? lastBranch : nextBranch,
      result,
      printNode,
      getChildren,
    )
  })
}

```

`src/query.ts`

```ts
import type { ValueType } from './Node'
import type { Cursor } from './eval'

export function distinct<T, K extends ValueType>(): (
  source: Generator<Cursor<T, K, T>> | AsyncGenerator<Cursor<T, K, T>>,
) => AsyncGenerator {
  return reduce<T, K, Set<T>>((res, cur) => {
    res.add(cur)
    return res
  }, new Set())
}

export function eq<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k == key)
}

export function every<T, K extends ValueType>(
  func: (value: [K, T]) => boolean | Promise<boolean>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<boolean, void, unknown> {
    for await (const cursor of source) {
      if (!(await func([cursor.key, cursor.value]))) {
        yield false
        return
      }
    }
    yield true
  }
}

export function filter<T, K extends ValueType>(
  filter: (value: [K, T]) => Promise<boolean> | boolean,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K>, void, unknown> {
    for await (const cursor of source) {
      if (await filter([cursor.key, cursor.value])) {
        yield cursor
      }
    }
  }
}

export function forEach<T, K extends ValueType>(
  action: (value: [K, T]) => Promise<void> | void,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K>, void> {
    for await (const cursor of source) {
      await action([cursor.key, cursor.value])
      yield cursor
    }
  }
}

export function gt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k > key)
}


export function gte<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k >= key)
}


export function includes<T, K extends ValueType>(
  key: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => key.includes(k))
}

export function lt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k < key)
}


export function lte<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k <= key)
}

export function map<T, K extends ValueType, R>(
  func: (value: [K, T]) => R | Promise<R>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K, R>, void> {
    for await (const cursor of source) {
      const value = await func([cursor.key, cursor.value])
      yield {
        ...cursor,
        value,
      }
    }
  }
}

export function mapReduce<T, K extends ValueType, D, V, O = Map<K, V>>(
  map: (inp: [K, T]) => D | Promise<D>,
  reduce: (inp: [K, D]) => V | Promise<V>,
  finalize?: (inp: Map<K, V>) => O | Promise<O>,
) {
  return async function* (
    source: Generator<Cursor<T, K>>,
  ): AsyncGenerator<Map<K, V> | O, void, unknown> {
    const result: Map<K, V> = new Map()
    for (const cursor of source) {
      const value = await map([cursor.key, cursor.value])
      const res = await reduce([cursor.key, value])
      result.set(cursor.key, res)
    }
    yield (await finalize?.(result)) ?? result
  }
}

export function ne<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k != key)
}

export function nin<T, K extends ValueType>(
  keys: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([key]) => !keys.includes(key))
}

export function range<T, K extends ValueType>(
  from: ValueType,
  to: ValueType,
  fromIncl = true,
  toIncl = true,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}

export function reduce<T, K extends ValueType, D>(
  reducer: (res: D, cur: T) => Promise<D> | D,
  initial?: D,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<D, void> {
    let result = initial
    for await (const cursor of source) {
      result = await reducer(result, cursor.value)
    }
    yield result
  }
}

export function some<T, K extends ValueType>(func: (value: [K, T]) => boolean) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<boolean, void> {
    for await (const cursor of source) {
      if (func([cursor.key, cursor.value])) {
        yield true
        return
      }
    }
    yield false
    return
  }
}

```

`src/source.ts`

```ts
import { eval_next } from './eval'
import type { BPlusTree } from './BPlusTree'
import { eval_previous } from './eval'
import type { ValueType } from './Node'
import type { Cursor } from './eval'
import { find_first } from './eval'
import { find_first_remove } from './eval'
import { find_range_start } from './eval'
import { find_last_node } from './methods'

export function sourceEach<T, K extends ValueType>(forward = true) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    const step = forward ? eval_next : eval_previous
    // Start at the beginning for forward, or the end for backward
    const startKey = forward ? tree.min : tree.max
    // Need a cursor function that finds the *last* item for the key for backward iteration
    // Using tree.cursor() might start at the first item with tree.max key.
    // Let's assume tree.cursor finds the *first* >= key for now, and fix if needed.
    // For backward, ideally we need find_last_cursor(tree.max)
    let cursor = forward ? tree.cursor(startKey) : find_last_cursor_equivalent(tree, startKey)

    while (!cursor.done) {
      yield cursor
      cursor = step(tree, cursor.node, cursor.pos)
    }
  }
}

// Placeholder - we need the actual logic to find the last item's cursor
// This might involve calling find_last_node and find_last_item
function find_last_cursor_equivalent<T, K extends ValueType>(tree: BPlusTree<T, K>, key: K): Cursor<T, K> {
    // This is a simplified placeholder. A robust implementation
    // should find the very last element in the tree.
    // For now, let's try finding the node containing the max key
    // and starting from its last element.
    const node = find_last_node(tree, tree.max) // Need find_last_node import
    if (!node || node.pointers.length === 0) {
        return { node: -1, pos: -1, key: undefined, value: undefined, done: true }
    }
    const pos = node.pointers.length - 1;
    const lastKey = node.keys[pos]; // Key might be different if internal node splits max key?
    const value = node.pointers[pos];
    return { node: node.id, pos: pos, key: lastKey, value: value, done: false };
}

export function sourceEq<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = find_first(tree, key, true)
    while (!cursor.done) {
      if (tree.comparator(cursor.key, key) === 0) {
        yield cursor
      } else {
        break
      }
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceEqNulls<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = find_first_remove(tree, key, true)
    while (!cursor.done) {
      if (tree.comparator(cursor.key, key) === 0) {
        yield cursor
      } else {
        break
      }
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceGt<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, false, true)
    // Explicitly skip if the first found cursor matches the key exactly
    if (!cursor.done && tree.comparator(cursor.key, key) === 0) {
        cursor = eval_next(tree, cursor.node, cursor.pos);
    }
    while (!cursor.done) {
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceGte<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, true, true)
    while (!cursor.done) {
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceIn<T, K extends ValueType>(keys: Array<K>) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    // Sort and deduplicate keys for potentially better performance and simpler logic
    const sortedKeys = [...new Set(keys)].sort(tree.comparator)

    if (sortedKeys.length === 0) {
      return; // No keys to search for
    }

    let keyIndex = 0
    // Start searching from the first relevant key in the sorted list
    let currentKey = sortedKeys[keyIndex]
    let cursor = find_first(tree, currentKey, true)

    while (!cursor.done) {
      // Compare current cursor key with the target key from sortedKeys
      const comparison = tree.comparator(cursor.key, currentKey)

      if (comparison === 0) {
        // Keys match, yield this cursor
        yield cursor
        // Move to the next item in the tree
        cursor = eval_next(tree, cursor.node, cursor.pos)
      } else if (comparison < 0) {
        // Cursor key is less than the target key. This might happen if find_first
        // returned an earlier key because the exact key wasn't present.
        // Advance cursor to find the target key or a larger one.
        cursor = eval_next(tree, cursor.node, cursor.pos)
      } else { // comparison > 0
        // Cursor key is greater than the current target key.
        // Move to the next key in sortedKeys.
        keyIndex++
        if (keyIndex >= sortedKeys.length) {
          // No more keys to check
          break
        }
        currentKey = sortedKeys[keyIndex]

        // Check if the current cursor might match the *new* target key
        // If cursor.key > new currentKey, we need to advance keys further in the next iteration.
        // If cursor.key === new currentKey, we process it in the next iteration.
        // If cursor.key < new currentKey, we also process in the next iteration.
        const nextComparison = tree.comparator(cursor.key, currentKey)
        if (nextComparison > 0) {
           // Current cursor is already past the *next* key, continue to advance keys
           continue;
        }
         // Otherwise, let the next loop iteration handle the comparison
         // with the new currentKey and the existing cursor.
      }
    }
  }
}

export function sourceLt<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, false, false)
    while (!cursor.done) {
      yield cursor
      cursor = eval_previous(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceLte<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, true, false)
    while (!cursor.done) {
      yield cursor
      cursor = eval_previous(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceRange<T, K extends ValueType>(
  from: K,
  to: K,
  fromIncl = true,
  toIncl = true,
) {
  return function* (
    tree: BPlusTree<T, K>,
  ): Generator<Cursor<T, K>, void, void> {
    let startCursor: Cursor<T, K> = find_range_start(tree, from, fromIncl, true) // Get start point
    // For the end condition, we need the first item *past* the range end.
    // let endMarkerKey = to
    let endMarker = find_range_start(tree, to, !toIncl, true) // Find first element >= end (if toIncl=false) or > end (if toIncl=true)

    // Handle edge case where tree might be empty or start is already past end
    if (startCursor.done) {
        return;
    }
    // If end marker is not done, check if start is already at or past end marker
    if (!endMarker.done) {
        const cmp = tree.comparator(startCursor.key, endMarker.key)
        if (cmp > 0 || (cmp === 0 /* && startCursor.node === endMarker.node && startCursor.pos === endMarker.pos */)) {
             // Start is already at or past the end marker
             return;
        }
    }
    // If end marker *is* done, it means the range extends to the end of the tree,
    // so the loop condition `!cursor.done` is sufficient.

    let cursor = startCursor
    while (!cursor.done) {
       // Check end condition more carefully using the original 'to' boundary
       if (to !== undefined && to !== null) { // Only check if 'to' is a valid boundary
           const cmpToHigh = tree.comparator(cursor.key, to);
           if (cmpToHigh > 0) { // Cursor key is strictly greater than 'to' boundary
               return; // Exceeded upper bound
           }
           if (cmpToHigh === 0 && !toIncl) { // Cursor key equals 'to' boundary, but upper bound is exclusive
               return; // Reached exclusive upper bound
           }
       }
       // If we haven't returned, the cursor is within the desired range
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}


```

`src/types.ts`

```ts
import type { ValueType } from './Node'

export type Comparator<K extends ValueType> = (a?: K, b?: K) => number

export type UnaryFunction<T, R> = (source: T) => R

/* eslint:disable:max-line-length */
export function query<T, K extends ValueType>(): UnaryFunction<T, T>
export function query<T, A>(fn1: UnaryFunction<T, A>): UnaryFunction<T, A>
export function query<T, A, B>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
): UnaryFunction<T, B>
export function query<T, A, B, C>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
): UnaryFunction<T, C>
export function query<T, A, B, C, D>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
): UnaryFunction<T, D>
export function query<T, A, B, C, D, E>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
): UnaryFunction<T, E>
export function query<T, A, B, C, D, E, F>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
): UnaryFunction<T, F>
export function query<T, A, B, C, D, E, F, G>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
): UnaryFunction<T, G>
export function query<T, A, B, C, D, E, F, G, H>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
): UnaryFunction<T, H>
export function query<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
): UnaryFunction<T, I>
export function query<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
  ...fns: Array<UnaryFunction<unknown, unknown>>
): UnaryFunction<T, unknown>
/* eslint:enable:max-line-length */

export function query(
  ...fns: Array<UnaryFunction<unknown, unknown>>
): UnaryFunction<unknown, unknown> {
  return queryFromArray(fns)
}

export function identity<T>(x: T): T {
  return x
}

/** @internal */
export function queryFromArray<T, R>(
  fns: Array<UnaryFunction<T, R>>,
): UnaryFunction<T, R> | ((input: T) => UnaryFunction<T, R>) {
  if (fns.length === 0) {
    return identity as UnaryFunction<T, R>
  }

  if (fns.length === 1) {
    return fns[0]
  }

  return (input: T) => {
    let res: T | R = input
    fns.forEach((fn) => {
      res = fn(res as T)
    })
    return res as unknown as R
    // return fns.reduce(
    //   (prev: T, fn: UnaryFunction<T, R>) => fn(prev),
    //   input as any,
    // )
  }
}

// export interface CursorFunction<T, K extends ValueType> {
//   (source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>):
//     | Generator<Cursor<T, K>>
//     | AsyncGenerator<Cursor<T, K>>
// }

```

`build.ts`

```ts
/// <reference types='@types/bun' />
import pkg from './package.json' assert { type: 'json' }
import { builtinModules } from 'module'
import { BuildConfig } from 'bun'

interface BuilderConfig {
  entrypoints?: string[] | string
  outdir?: string
  format?: 'esm' | 'cjs'
  target?: 'node' | 'bun'
  external?: string[]
  sourcemap?: 'inline' | 'external' | boolean
  splitting?: boolean
  pkg: {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  define?: Record<string, string>
}

// Функция для Bun
export function createBunConfig(config: BuilderConfig): BuildConfig {
  const {
    pkg,
    entrypoints = ['src/index.ts'],
    outdir = './dist',
    target = 'node',
    format = 'cjs',
    external = [],
    define = {
      PRODUCTION: JSON.stringify(process.env.NODE_ENV === 'production'),
    },
    splitting = true,
    sourcemap = 'inline',
  } = config

  const bunConfig: BuildConfig = {
    entrypoints: Array.isArray(entrypoints) ? entrypoints : [entrypoints],
    target,
    define,
    external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(Object.keys(pkg.devDependencies || {}))
      .concat(builtinModules)
      .concat(external),
    outdir,
    format,
    splitting,
    sourcemap,
    minify: {
      whitespace: false,
      syntax: false,
      identifiers: false,
    },
  }

  return bunConfig
}

const entrypoints = ['src/index.ts']

// Create a Bun config from package.json
const config = createBunConfig({
  pkg,
  entrypoints,
})
const result = await Bun.build(config)

if (!result.success) {
  throw new AggregateError(result.logs, 'Build failed')
}

```



## Сгенерировано командой:

```
prompt-fs-to-ai ./ -p "**/*.ts" -e "node_modules/**" "dist/**" "dev/**" "types/**" "src/demo/**" "src/dev/**" "src/test/**" -o "undefined"
```
