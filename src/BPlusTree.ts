import { Cursor, find, list } from './eval'
import { compare_keys_primitive, find_first_node, find_first_item, find_last_node, find_last_item, find_first_key, size, insert, remove_specific, remove, count } from './methods'
import { Node, PortableNode, ValueType, insert_key_immutable,split_leaf_cow, split_internal_node_cow, insert_into_parent_cow, update_state_immutable, update_min_max_immutable, remove_key_immutable,
  // CoW Sibling operations
  borrow_from_left_cow,
  borrow_from_right_cow,
  merge_with_left_cow,
  merge_with_right_cow
} from './Node'
import { sourceIn, sourceEq, sourceEqNulls, sourceRange, sourceEach, sourceGt, sourceGte, sourceLt, sourceLte } from './source'
import { Comparator } from './types'
import { evaluate } from './eval'
import { IBPlusTree } from './IBPlusTree'
import { TransactionContext, ITransactionContext } from './TransactionContext'
import type { Transaction } from './types'
import { warn } from './logger'

// Moved CowInsertResult type definition outside the class
type CowInsertResult<T, K extends ValueType> = {
  // The ID of the (potentially new copy of the) node that was processed at this level.
  // This ID should be used by the parent to update its children list.
  finalNodeId: number;
  // Information about a split that needs to be propagated to the parent.
  // Undefined if no split occurred at this level that needs parent handling.
  splitInfo?: { separatorKey: K; newRightSiblingId: number };
  // If this insertion caused the ROOT of the tree to split and a new root was created,
  // this is the ID of that new root. Only relevant for the top-level call.
  newRootId?: number;
};

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
  public readonly defaultEmpty: K
  public readonly keySerializer: (keys: Array<K>) => any
  public readonly keyDeserializer: (keys: any) => Array<K>
  public next_node_id = 0 // Made public for serialization utils

  // Transaction isolation tracking
  private activeTransactions = new Set<string>() // Track active transaction IDs
  public get_next_id(): number {
    this.next_node_id += 1;
    return this.next_node_id;
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
    from?: K,
    to?: K,
    fromIncl = true,
    toIncl = true,
  ): Array<[K, T]> {
    // Return empty array if the tree is empty
    if (!this.nodes.has(this.root)) {
      return [];
    }

    const result: Array<[K, T]> = [];

    // If no bounds are specified, return all items
    if (from === undefined && to === undefined) {
      let node = this.nodes.get(this.root);

      // Find leftmost leaf node
      while (!node.leaf) {
        node = this.nodes.get(node.children[0]);
      }

      // Traverse all leaf nodes and collect items
      while (node) {
        for (let i = 0; i < node.keys.length; i++) {
          result.push([node.keys[i], node.pointers[i]]);
        }
        node = node._right ? this.nodes.get(node._right) : null;
      }

      return result;
    }

    // Handle case when only "from" is specified
    if (from !== undefined && to === undefined) {
      let startNode = find_first_node(this, from);
      if (!startNode) return [];

      // Find starting index in the node where keys satisfy the "from" condition
      let startIdx = 0;
      if (fromIncl) {
        // For >= from, find first key that's >= from
        startIdx = find_first_key(startNode.keys, from, this.comparator);
      } else {
        // For > from, find first key that's > from
        startIdx = find_first_key(startNode.keys, from, this.comparator);
        while (startIdx < startNode.keys.length &&
               this.comparator(startNode.keys[startIdx], from) === 0) {
          startIdx++;
        }
      }

      // Collect items from start node and all following nodes
      let currentNode = startNode;
      while (currentNode) {
        for (let i = (currentNode === startNode ? startIdx : 0);
             i < currentNode.keys.length; i++) {
          result.push([currentNode.keys[i], currentNode.pointers[i]]);
        }
        currentNode = currentNode._right ? this.nodes.get(currentNode._right) : null;
      }

      return result;
    }

    // Handle case when only "to" is specified
    if (from === undefined && to !== undefined) {
      let node = this.nodes.get(this.root);

      // Find leftmost leaf node
      while (!node.leaf) {
        node = this.nodes.get(node.children[0]);
      }

      // Traverse nodes until we exceed the "to" bound
      while (node) {
        for (let i = 0; i < node.keys.length; i++) {
          const key = node.keys[i];
          const compareResult = this.comparator(key, to);

          if ((toIncl && compareResult <= 0) || (!toIncl && compareResult < 0)) {
            result.push([key, node.pointers[i]]);
          } else {
            // Found key > to (or >= to if !toIncl), so we're done
            return result;
          }
        }
        node = node._right ? this.nodes.get(node._right) : null;
      }

      return result;
    }

    // Handle case when both "from" and "to" are specified
    let startNode = find_first_node(this, from);
    if (!startNode) return [];

    // Find starting index in the node where keys satisfy the "from" condition
    let startIdx = 0;
    if (fromIncl) {
      // For >= from, find first key that's >= from
      startIdx = find_first_key(startNode.keys, from, this.comparator);
    } else {
      // For > from, find first key that's > from
      startIdx = find_first_key(startNode.keys, from, this.comparator);
      while (startIdx < startNode.keys.length &&
             this.comparator(startNode.keys[startIdx], from) === 0) {
        startIdx++;
      }
    }

    // Collect items from start node and following nodes until we exceed the "to" bound
    let currentNode = startNode;
    while (currentNode) {
      for (let i = (currentNode === startNode ? startIdx : 0);
           i < currentNode.keys.length; i++) {
        const key = currentNode.keys[i];
        const compareResult = this.comparator(key, to);

        if ((toIncl && compareResult <= 0) || (!toIncl && compareResult < 0)) {
          result.push([key, currentNode.pointers[i]]);
        } else {
          // Found key > to (or >= to if !toIncl), so we're done
          return result;
        }
      }
      currentNode = currentNode._right ? this.nodes.get(currentNode._right) : null;
    }

    return result;
  }

  // Keep the generator-based range method with a different name
  rangeGenerator(
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
      defaultEmpty !== undefined ? defaultEmpty : (Number.NEGATIVE_INFINITY as unknown as K)
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
    const rootNode = this.nodes.get(this.root);
    const hasActiveTransactions = this.activeTransactions.size > 0;
    const result = size(rootNode, hasActiveTransactions, this);
    return result;
  }
  public node(id: number): Node<T, K> {
    return this.nodes.get(id)
  }
  count(key: K): number {
    const searchKey = (key === undefined ? null : key) as K;
    // console.log(`[count] Searching for key ${searchKey} in tree with root ${this.root}`);
    const rootNode = this.nodes.get(this.root);
    // console.log(`[count] Root node ${this.root}: leaf=${rootNode?.leaf}, keys=[${rootNode?.keys?.join(',')}], children=[${rootNode?.children?.join(',')}]`);

    if (searchKey === null && this.defaultEmpty !== undefined) {
        const result = count(this.defaultEmpty, rootNode, this.comparator);
        // console.log(`[count] Result for defaultEmpty ${this.defaultEmpty}: ${result}`);
        return result;
    } else {
        const result = count(searchKey, rootNode, this.comparator);
        // console.log(`[count] Result for key ${searchKey}: ${result}`);
        return result;
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

    // TEMPORARY FIX: Use simple remove() loop instead of complex transactional logic
    // The transactional all=true removal has tree structure corruption issues
    const removedItems: Array<[K, T]> = [];

    // Keep removing single instances until none are left
    while (true) {
      const singleRemove = this.remove(key);
      if (singleRemove.length === 0) {
        break; // No more instances found
      }
      removedItems.push(...singleRemove);
    }

    // console.log(`[removeMany] TEMP FIX: Removed ${removedItems.length} items for key ${key} using simple loop`);
    return removedItems;
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

  public begin_transaction(): TransactionContext<T, K> {
    const txCtx = new TransactionContext<T, K>(this);
    this.activeTransactions.add(txCtx.transactionId);

    // Add cleanup handlers to remove transaction from active set when it completes
    const originalCommit = txCtx.commit.bind(txCtx);
    const originalAbort = txCtx.abort.bind(txCtx);

    txCtx.commit = async () => {
      try {
        await originalCommit();
      } finally {
        this.activeTransactions.delete(txCtx.transactionId);
      }
    };

    txCtx.abort = async () => {
      try {
        await originalAbort();
      } finally {
        this.activeTransactions.delete(txCtx.transactionId);
      }
    };

    return txCtx;
  }

    static find_leaf_for_key_in_transaction<T, K extends ValueType>(
    key: K,
    txCtx: TransactionContext<T, K>,
    comparator: Comparator<K>
  ): Node<T, K> | undefined {
    let currentNode = txCtx.getRootNode();

    if (!currentNode) {
      // Tree is effectively empty for this transaction, or root is invalid
      // console.log(`[find_leaf_for_key_in_transaction] ERROR: No root node found for key ${key}`);
      return undefined;
    }

    // console.log(`[find_leaf_for_key_in_transaction] Starting search for key ${key} from root ${currentNode.id}, keys: [${currentNode.keys.join(',')}], leaf: ${currentNode.leaf}, children: [${currentNode.children?.join(',') || 'none'}]`);

    while (!currentNode.leaf) {
      if (currentNode.isEmpty) {
        // This case should ideally not happen in a well-structured B+ Tree during a find operation
        // console.log(`[find_leaf_for_key_in_transaction] ERROR: Empty internal node ${currentNode.id} encountered`);
        return undefined;
      }

      // Use find_first_key for correct search navigation in B+ trees
      let childIndex = find_first_key(currentNode.keys, key, comparator);

      // FIXED: Handle equal keys correctly - if key equals separator, go to right subtree
      if (childIndex < currentNode.keys.length && comparator(key, currentNode.keys[childIndex]) === 0) {
        childIndex = childIndex + 1; // Go to right subtree for equal keys
      }

      // console.log(`[find_leaf_for_key_in_transaction] In node ${currentNode.id} with keys [${currentNode.keys.join(',')}], searching for key ${key}, find_first_key returned index ${find_first_key(currentNode.keys, key, comparator)}, adjusted childIndex: ${childIndex}`);
      // console.log(`[find_leaf_for_key_in_transaction] Children: [${currentNode.children.join(',')}], will descend to child ID ${currentNode.children[childIndex]}`);

      const childNodeId = currentNode.children[childIndex];

      // Get the child node from transaction context
      let childNode = txCtx.getWorkingNode(childNodeId);
      if (!childNode) {
        childNode = txCtx.getCommittedNode(childNodeId);
        // console.log(`[find_leaf_for_key_in_transaction] Child ${childNodeId} not found in working nodes, using committed version: ${childNode ? childNode.id : 'null'}`);
      } else {
        // console.log(`[find_leaf_for_key_in_transaction] Using working copy of child ${childNodeId}: ${childNode.id}`);
      }

      if (!childNode) {
        // console.error(`[find_leaf_for_key_in_transaction] Child node ${childNodeId} not found in transaction context. Parent: ${currentNode.id}, children: [${currentNode.children.join(',')}]`);
        return undefined;
      }
      // console.log(`[find_leaf_for_key_in_transaction] Descending to child node ${childNode.id}, keys: [${childNode.keys.join(',')}], leaf: ${childNode.leaf}`);
      currentNode = childNode;
    }

    // Now currentNode is a leaf node
    // console.log(`[find_leaf_for_key_in_transaction] Found leaf node ${currentNode.id}, keys: [${currentNode.keys.join(',')}]`);

    // Check if key is actually in this leaf
    const hasKey = currentNode.keys.some(k => comparator(k, key) === 0);
    // console.log(`[find_leaf_for_key_in_transaction] Key ${key} ${hasKey ? 'FOUND' : 'NOT FOUND'} in leaf ${currentNode.id}`);

    // ENHANCED LOGIC: If key not found, try to search again with a different navigation strategy
    if (!hasKey) {
      // console.log(`[find_leaf_for_key_in_transaction] Key ${key} not found in leaf ${currentNode.id}, trying alternative navigation...`);

      // Alternative search: instead of using first leaf found, search through all possible paths
      // We'll restart the search but try RIGHT subtree when key equals separator
      let alternativeNode = txCtx.getRootNode();
      if (!alternativeNode) return currentNode; // Fallback

      while (!alternativeNode.leaf) {
        if (alternativeNode.isEmpty) {
          break;
        }

        let childIndex = find_first_key(alternativeNode.keys, key, comparator);

        // FIXED: Handle equal keys correctly - if key equals separator, go to right subtree
        if (childIndex < alternativeNode.keys.length && comparator(key, alternativeNode.keys[childIndex]) === 0) {
          childIndex = childIndex + 1; // Go to right subtree for equal keys
        }

        // Ensure we don't go out of bounds
        if (childIndex >= alternativeNode.children.length) {
          childIndex = alternativeNode.children.length - 1;
        }

        const childNodeId = alternativeNode.children[childIndex];
        let childNode = txCtx.getWorkingNode(childNodeId);
        if (!childNode) {
          childNode = txCtx.getCommittedNode(childNodeId);
        }

        if (!childNode) {
          break; // Can't continue alternative search
        }

        // console.log(`[find_leaf_for_key_in_transaction] ALTERNATIVE: Descending to child node ${childNode.id}, keys: [${childNode.keys.join(',')}], leaf: ${childNode.leaf}`);
        alternativeNode = childNode;
      }

      // Check if alternative navigation found the key
      if (alternativeNode.leaf) {
        const alternativeHasKey = alternativeNode.keys.some(k => comparator(k, key) === 0);
        // console.log(`[find_leaf_for_key_in_transaction] ALTERNATIVE: Found leaf node ${alternativeNode.id}, keys: [${alternativeNode.keys.join(',')}], key ${key} ${alternativeHasKey ? 'FOUND' : 'NOT FOUND'}`);

        if (alternativeHasKey) {
          // console.log(`[find_leaf_for_key_in_transaction] ALTERNATIVE SUCCESSFUL: Using alternative leaf ${alternativeNode.id} instead of ${currentNode.id}`);
          return alternativeNode;
        }
      }

      // console.log(`[find_leaf_for_key_in_transaction] Alternative navigation also failed, returning original leaf ${currentNode.id}`);
    }

    return currentNode;
  }

  public find_all_in_transaction(key: K, txCtx: ITransactionContext<T, K>): { values: T[], leafIdsWithKey: Set<number> } {
    const values: T[] = [];
    const leafIdsWithKey = new Set<number>();

    // We search in the snapshot, so we use treeSnapshot
    let currentNode = txCtx.treeSnapshot.nodes.get(txCtx.snapshotRootId);
    if (!currentNode) {
      return { values, leafIdsWithKey };
    }

    // Traverse down to the leaf node
    while (currentNode && !currentNode.leaf) {
        let childIndex = find_first_key(currentNode.keys, key, this.comparator);
        const childNodeId = currentNode.children[childIndex];
        currentNode = txCtx.treeSnapshot.nodes.get(childNodeId);
    }

    if(currentNode && currentNode.leaf) {
        let currentLeaf: Node<T, K> | undefined = currentNode;
        while(currentLeaf) {
            for (let i = 0; i < currentLeaf.keys.length; i++) {
                if (this.comparator(currentLeaf.keys[i], key) === 0) {
                    values.push(currentLeaf.pointers[i] as T);
                    leafIdsWithKey.add(currentLeaf.id);
                }
            }
            const leftSibling = currentLeaf._left ? txCtx.treeSnapshot.nodes.get(currentLeaf._left) : undefined;
            if (leftSibling && leftSibling.keys.some(k => this.comparator(k, key) === 0)) {
                currentLeaf = leftSibling;
            } else {
                break;
            }
        }
    }

    return { values, leafIdsWithKey };
  }

  public get_all_in_transaction(key: K, txCtx: ITransactionContext<T, K>): T[] {
    const { values } = this.find_all_in_transaction(key, txCtx);
    return values;
  }

  public insert_in_transaction(key: K, value: T, txCtx: ITransactionContext<T, K>): void {
    const rootId = txCtx.workingRootId ?? txCtx.snapshotRootId;
    // ... (rest of the implementation will be CoW)
  }

  public remove_in_transaction(key: K, txCtx: ITransactionContext<T, K>, all: boolean = false): boolean {
    // Stub
    return false;
  }

  #do_insert_cow(
    currentNodeId: number,
    key: K,
    value: T,
    txCtx: ITransactionContext<T, K>
  ): { finalNodeId: number; newRootId?: number; } {
    // Stub
    return { finalNodeId: currentNodeId };
  }
}
