import type { BPlusTree } from './BPlusTree'
import { add_initial_nodes, find_first_item, find_last_key, remove_sibling, find_first_key } from './methods'
import type { ITransactionContext } from './TransactionContext'

export type valueOf = { valueOf(): any }
export type ValueType = number | string | boolean | Date | bigint | valueOf | null | undefined
export type Value = unknown

// Minimal TransactionContext interface needed for Node.copy
// This should eventually align with the full TransactionContext definition from the plan
// interface TransactionContext<T, K extends ValueType> { // Old interface removed
//   // readonly transactionId: string; // Not directly used by Node.copy
//   // readonly snapshotRootId: number; // Not directly used by Node.copy
//   workingNodes: Map<number, Node<T, K>>; // Made visible for potential use by other functions
//   addWorkingNode(node: Node<T, K>): void;
//   getCommittedNode(nodeId: number): Node<T, K> | undefined; // To get nodes from the stable tree state
//   getWorkingNode(nodeId: number): Node<T, K> | undefined; // To get nodes from the current transaction
//   // Helper to get the correct version of a node
//   getNode?(nodeId: number): Node<T, K> | undefined; // Optional helper
// }

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
    node.tree = tree; // Assign tree immediately
    node.leaf = true
    // node.pointers = [] // Initialized by class field
    register_node(tree, node)
    node.min = tree.defaultEmpty as K | undefined; // Set initial min/max for a new leaf // CHANGED
    node.max = tree.defaultEmpty as K | undefined; // CHANGED
    return node
  }
  static createNode<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.tree = tree; // Assign tree immediately
    // node.children = [] // Initialized by class field
    node.leaf = false
    register_node(tree, node)
    node.min = tree.defaultEmpty as K | undefined; // Set initial min/max for a new internal node // CHANGED
    node.max = tree.defaultEmpty as K | undefined; // CHANGED
    return node
  }

  // Working node creation methods for transaction isolation
  static createWorkingLeaf<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.tree = tree; // Assign tree reference
    node.leaf = true
    // DO NOT call register_node - working nodes should not be in tree.nodes
    node.id = tree.get_next_id(); // Get ID but don't register
    node.min = tree.defaultEmpty as K | undefined;
    node.max = tree.defaultEmpty as K | undefined;
    return node
  }

  static createWorkingNode<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.tree = tree; // Assign tree reference
    node.leaf = false
    // DO NOT call register_node - working nodes should not be in tree.nodes
    node.id = tree.get_next_id(); // Get ID but don't register
    node.min = tree.defaultEmpty as K | undefined;
    node.max = tree.defaultEmpty as K | undefined;
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

  static copy<T, K extends ValueType>(originalNode: Node<T, K>, transactionContext: ITransactionContext<T, K>): Node<T, K> {
    // console.log(`[Node.copy] Called for originalNode ID: ${originalNode.id}, leaf: ${originalNode.leaf}`); // LOG REMOVED

    // Check if this node is already copied in the current transaction
    const existingWorkingCopy = transactionContext.getWorkingNode(originalNode.id);
    if (existingWorkingCopy) {
      // console.log(`[Node.copy] Using existing working copy ID: ${existingWorkingCopy.id} for original ${originalNode.id}`); // LOG REMOVED
      return existingWorkingCopy;
    }

    return Node.forceCopy(originalNode, transactionContext);
  }

  static forceCopy<T, K extends ValueType>(originalNode: Node<T, K>, transactionContext: ITransactionContext<T, K>): Node<T, K> {
    // Create a working node WITHOUT adding it to tree.nodes (transaction isolation)
    const newNode = originalNode.leaf
      ? Node.createWorkingLeaf(transactionContext.treeSnapshot)
      : Node.createWorkingNode(transactionContext.treeSnapshot);

    // console.log(`[Node.forceCopy] Creating new ${newNode.leaf ? 'leaf' : 'internal'} working node ${newNode.id} from original ${originalNode.id} with keys: [${originalNode.keys.join(',')}], pointers: [${originalNode.pointers?.length || 0}]`); // LOG REMOVED

    // Copy all properties from the original node
    newNode.keys = [...originalNode.keys];
    newNode.pointers = [...originalNode.pointers];
    newNode.children = [...originalNode.children];
    newNode._parent = originalNode._parent; // Will be updated by the calling context if needed
    newNode._left = originalNode._left;
    newNode._right = originalNode._right;
    newNode.key_num = originalNode.key_num;
    newNode.size = originalNode.size;
    newNode.min = originalNode.min;
    newNode.max = originalNode.max;
    newNode.isFull = originalNode.isFull;
    newNode.isEmpty = originalNode.isEmpty;

    // console.log(`[Node.forceCopy] Copied working node ${newNode.id}: leaf=${newNode.leaf}, keys=[${newNode.keys.join(',')}], pointers count=${newNode.pointers?.length || 0}, key_num=${newNode.key_num}`); // LOG REMOVED

    // Store the original node ID for debugging and potential reference
    (newNode as any)._originalNodeId = originalNode.id;

    // Register the new node in the transaction context ONLY
    transactionContext.addWorkingNode(newNode);

    return newNode;
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
  keys: Array<K> = []
  pointers: Array<T> = []
  min: K //| undefined; // CHANGED
  max: K //| undefined; // CHANGED
  isFull: boolean
  isEmpty: boolean
  tree: BPlusTree<T, K>
  public children: Array<number> = []

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

  private constructor() {
    // Arrays (keys, pointers, children) are initialized by class field initializers.
    // this.keys = []
    // this.pointers = []
    // this.children = []

    this.key_num = 0
    this.size = 0
    this.isFull = false
    this.isEmpty = true // A new node is initially empty of keys
    this.min = undefined // Will be set by createLeaf/createNode using tree.defaultEmpty
    this.max = undefined // Will be set by createLeaf/createNode using tree.defaultEmpty
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
    // console.warn(`[remove_node] Node ${item.id} not found in parent ${obj.id} children.`);
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
      // Update the separator key in the parent to the left of this child.
      // Ensure keys array is also copied for immutability.
      const newKeys = [...parent.keys];
      if (newKeys.length > pos -1 ) { // Corrected condition: ensure index pos-1 is valid
        // console.log(`[replace_min_immutable] Updating key for parentWorkCopy ID: ${parentWorkCopy.id}. ChildIndex: ${childIndex}. Old key: ${newKeys[childIndex - 1]}, New key: ${key}`); // DEBUG
         newKeys[pos - 1] = key!; // Corrected index to pos-1
         parent.keys = newKeys;
      } else {
        // console.warn(`[replace_min_immutable] Key index out of bounds for parent ${parentWorkCopy.id}`);
      }
      // Min change propagation stops here as it only affected a separator key.
      break;
    } else { // currentPropagatingNode IS the first child
      // console.log(`[replace_min_immutable] Updating min for parentWorkCopy ID: ${parentWorkCopy.id}. Old min: ${parentWorkCopy.min}, New min: ${key}`); // DEBUG
      parent.min = key;
      // console.log(`[replace_min_immutable] Updated parentWorkCopy ID: ${parentWorkCopy.id}. New min: ${parentWorkCopy.min}`); // DEBUG
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

// --- Immutable operations for CoW ---

// Placeholder for replace_min_immutable
export function replace_min_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  key: K | undefined, // CHANGED
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  let workingNode = Node.copy(originalNode, transactionContext);
  workingNode.min = key;

  // CRITICAL FIX: Check if parent separator updates should be skipped
  const skipParentSeparatorUpdate = (originalNode as any)._skipParentSeparatorUpdate || (workingNode as any)._skipParentSeparatorUpdate;

  if (workingNode._parent !== undefined && !skipParentSeparatorUpdate) {
    const parentCommittedOrWorking = transactionContext.getNode(workingNode._parent);
    if (parentCommittedOrWorking) {
      let parentWorkCopy = Node.copy(parentCommittedOrWorking, transactionContext);

      const originalNodeIdToFind = (originalNode as any)._originalNodeId || originalNode.id;
      let childIndexInParent = parentWorkCopy.children.indexOf(originalNodeIdToFind);

      // If not found by original ID, maybe originalNode itself was a working copy
      // and its direct ID is in the parent's children list (if parent was already a WC)
      if (childIndexInParent === -1) {
        childIndexInParent = parentWorkCopy.children.indexOf(originalNode.id);
      }

      if (childIndexInParent >= 0) {
        const newChildren = [...parentWorkCopy.children];
        newChildren[childIndexInParent] = workingNode.id;
        parentWorkCopy.children = newChildren;
        workingNode._parent = parentWorkCopy.id;

        if (childIndexInParent === 0) {
          const updatedParentByRecursion = replace_min_immutable(parentWorkCopy, key, transactionContext);
          if (workingNode._parent !== updatedParentByRecursion.id) {
            workingNode._parent = updatedParentByRecursion.id;
          }
          // parentWorkCopy = updatedParentByRecursion; // parentWorkCopy assignment is not needed as it's effectively returned by the recursion targetting workingNode._parent
        } else {
          if (childIndexInParent -1 < parentWorkCopy.keys.length) {
            const newParentKeys = [...parentWorkCopy.keys];
            newParentKeys[childIndexInParent - 1] = key;
            parentWorkCopy.keys = newParentKeys;

            let finalUpdatedParent = update_state_immutable(parentWorkCopy, transactionContext);
            finalUpdatedParent = update_min_max_immutable(finalUpdatedParent, transactionContext);

            if (workingNode._parent !== finalUpdatedParent.id) {
              workingNode._parent = finalUpdatedParent.id;
            }
            // parentWorkCopy = finalUpdatedParent; // parentWorkCopy assignment is not needed
          } else {
            // console.warn(...)
          }
        }
      } else {
        // console.error(`[replace_min_immutable] CRITICAL: Child original ID ${originalNodeIdToFind} (or current ID ${originalNode.id}) not found in parent ${parentWorkCopy.id} children [${parentWorkCopy.children.join(',')}]`);
      }
    } else {
      // console.warn(...)
    }
  } else if (skipParentSeparatorUpdate) {
    // console.log(`[replace_min_immutable] Skipping parent separator update for node ${workingNode.id} due to _skipParentSeparatorUpdate flag`);
  }
  return workingNode;
}

export function replace_max_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  key: K | undefined, // CHANGED
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  let workingNode = Node.copy(originalNode, transactionContext);
  workingNode.max = key;

  // CRITICAL FIX: Check if parent separator updates should be skipped
  const skipParentSeparatorUpdate = (originalNode as any)._skipParentSeparatorUpdate || (workingNode as any)._skipParentSeparatorUpdate;

  if (workingNode._parent !== undefined && !skipParentSeparatorUpdate) {
    const parentCommittedOrWorking = transactionContext.getNode(workingNode._parent);
    if (parentCommittedOrWorking) {
      let parentWorkCopy = Node.copy(parentCommittedOrWorking, transactionContext);

      const originalNodeIdToFind = (originalNode as any)._originalNodeId || originalNode.id;
      let childIndexInParent = parentWorkCopy.children.indexOf(originalNodeIdToFind);

      if (childIndexInParent === -1) {
        childIndexInParent = parentWorkCopy.children.indexOf(originalNode.id);
      }

      if (childIndexInParent >= 0) {
        const newChildren = [...parentWorkCopy.children];
        newChildren[childIndexInParent] = workingNode.id;
        parentWorkCopy.children = newChildren;
        workingNode._parent = parentWorkCopy.id;

        if (childIndexInParent === parentWorkCopy.children.length - 1) {
          const updatedParentByRecursion = replace_max_immutable(parentWorkCopy, key, transactionContext);
          if (workingNode._parent !== updatedParentByRecursion.id) {
            workingNode._parent = updatedParentByRecursion.id;
          }
          // parentWorkCopy = updatedParentByRecursion;
        } else {
          if (childIndexInParent < parentWorkCopy.keys.length) {
            const newParentKeys = [...parentWorkCopy.keys];
            newParentKeys[childIndexInParent] = key;
            parentWorkCopy.keys = newParentKeys;

            let finalUpdatedParent = update_state_immutable(parentWorkCopy, transactionContext);
            finalUpdatedParent = update_min_max_immutable(finalUpdatedParent, transactionContext);

            if (workingNode._parent !== finalUpdatedParent.id) {
              workingNode._parent = finalUpdatedParent.id;
            }
            // parentWorkCopy = finalUpdatedParent;
          } else {
            // console.warn(...)
          }
        }
      } else {
        // console.error(`[replace_max_immutable] CRITICAL: Child original ID ${originalNodeIdToFind} (or current ID ${originalNode.id}) not found in parent ${parentWorkCopy.id} children [${parentWorkCopy.children.join(',')}]`);
      }
    } else {
      // console.warn(...)
    }
  } else if (skipParentSeparatorUpdate) {
    // console.log(`[replace_max_immutable] Skipping parent separator update for node ${workingNode.id} due to _skipParentSeparatorUpdate flag`);
  }
  return workingNode;
}

export function update_state_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  // console.log(`[update_state_immutable] Input originalNode ID: ${originalNode.id}, keys: [${originalNode.keys.join(',')}], key_num: ${originalNode.key_num}`); // LOG REMOVED
  const copiedNode = Node.copy(originalNode, transactionContext);
  // console.log(`[update_state_immutable] After Node.copy - copiedNode ID: ${copiedNode.id}, keys: [${copiedNode.keys.join(',')}], key_num: ${copiedNode.key_num}`); // LOG REMOVED

  copiedNode.key_num = copiedNode.keys.length;
  if (copiedNode.leaf) {
    copiedNode.size = copiedNode.key_num;
  } else {
    copiedNode.size = copiedNode.children.length;
  }
  copiedNode.isFull = copiedNode.key_num >= (2 * copiedNode.t - 1);
  copiedNode.isEmpty = copiedNode.key_num <= 0; // Changed from < to <= to better reflect an empty node (no keys)
  // console.log(`[update_state_immutable] Returning copiedNode ID: ${copiedNode.id}, keys: [${copiedNode.keys.join(',')}], key_num: ${copiedNode.key_num}, size: ${copiedNode.size}`); // LOG REMOVED
  return copiedNode;
}

export function update_min_max_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  // Always create a copy for CoW behavior, even if no changes are needed
  let workingNode = Node.copy(originalNode, transactionContext);
  let madeCopyForThisUpdate = true; // We always make a copy now

  // console.log(`[update_min_max_immutable] Called for node ${originalNode.id} (isLeaf: ${originalNode.leaf}, keys: [${originalNode.keys.join(',')}], current min: ${originalNode.min}, max: ${originalNode.max})`); // LOG REMOVED

  // console.log(`[update_min_max_immutable] Starting for node ${workingNode.id}, leaf: ${workingNode.leaf}, key_num: ${workingNode.key_num}`);

  // CRITICAL FIX: Check if parent separator updates should be skipped
  const skipParentSeparatorUpdate = (originalNode as any)._skipParentSeparatorUpdate || (workingNode as any)._skipParentSeparatorUpdate;

  if (workingNode.leaf) {
    if (workingNode.key_num > 0) {
      const currentMin = workingNode.keys[0];
      const currentMax = workingNode.keys[workingNode.key_num - 1];
      let minChanged = workingNode.min === undefined || transactionContext.treeSnapshot.comparator(workingNode.min, currentMin) !== 0;
      let maxChanged = workingNode.max === undefined || transactionContext.treeSnapshot.comparator(workingNode.max, currentMax) !== 0;
      // console.log(`[update_min_max_immutable] Leaf node ${workingNode.id}: currentMin=${currentMin}, currentMax=${currentMax}, workingNode.min=${workingNode.min}, workingNode.max=${workingNode.max}`);
      // console.log(`[update_min_max_immutable] Leaf node ${workingNode.id}: minChanged=${minChanged}, maxChanged=${maxChanged}`);

      if (minChanged || maxChanged) {
        // console.log(`[update_min_max_immutable] Leaf ${workingNode.id} min/max changed. Min: ${minChanged}, Max: ${maxChanged}. Already copied.`); // LOG REMOVED

        if (minChanged) workingNode.min = currentMin;
        if (maxChanged) workingNode.max = currentMax;

        // If this node is an edge child of its parent, and its min/max changed,
        // we need to propagate this change upwards immutably.
        // console.log(`[update_min_max_immutable] workingNode: ${workingNode.id}, _parent: ${workingNode._parent}`);
        if (workingNode._parent !== undefined && !skipParentSeparatorUpdate) {
          const parentNode = transactionContext.getNode(workingNode._parent);
          if (parentNode) {
            // console.log(`[update_min_max_immutable] Leaf ${workingNode.id} has parent ${parentNode.id}. Checking for propagation.`); // LOG REMOVED
            let parentDidChange = false;
            let finalParentNode = parentNode;

            // console.log(`[update_min_max_immutable] DEBUG: workingNode: ${workingNode.id}, parentNode: ${parentNode.id}`);
            // console.log(`[update_min_max_immutable] DEBUG: minChanged: ${minChanged}, maxChanged: ${maxChanged}`);
            // console.log(`[update_min_max_immutable] DEBUG: parentNode.children[0]: ${parentNode.children[0]}, originalNode.id: ${originalNode.id}`);
            // console.log(`[update_min_max_immutable] DEBUG: parentNode.children: [${parentNode.children.join(',')}]`);

            if (minChanged && parentNode.children[0] === originalNode.id) {
              // console.log(`[update_min_max_immutable] Leaf ${workingNode.id} is first child of ${parentNode.id}. Propagating min ${currentMin}.`);
              // console.log(`[update_min_max_immutable] Parent children: [${parentNode.children.join(',')}], originalNode.id: ${originalNode.id}`);
              finalParentNode = replace_min_immutable(parentNode, currentMin, transactionContext);
              parentDidChange = true;
            }
            // originalNode.id below is correct as we are checking its position in the *original* parent structure before any copies.
            if (maxChanged && parentNode.children[parentNode.children.length - 1] === originalNode.id) {
              // console.log(`[update_min_max_immutable] Leaf ${workingNode.id} is last child of ${parentNode.id}. Propagating max ${currentMax}.`); // LOG REMOVED
              // If parent was already copied by replace_min_immutable, pass that copy along.
              finalParentNode = replace_max_immutable(parentDidChange ? finalParentNode : parentNode, currentMax, transactionContext);
              parentDidChange = true;
            }

            // CRITICAL FIX: Always update workingNode._parent if parent changed
            if (parentDidChange) {
              // console.log(`[update_min_max_immutable] Parent ID for leaf ${workingNode.id} changed from ${workingNode._parent} to ${finalParentNode.id}. Updating parent pointer.`); // LOG REMOVED
              workingNode._parent = finalParentNode.id;
            }
          }
        } else if (skipParentSeparatorUpdate) {
          // console.log(`[update_min_max_immutable] Skipping parent separator update for node ${workingNode.id} due to _skipParentSeparatorUpdate flag`);
        }
      }
    } else { // Leaf node is empty
      // console.log(`[update_min_max_immutable] Leaf node ${workingNode.id} is empty. Setting min/max to undefined.`); // LOG REMOVED
      let minChangedToUndefined = workingNode.min !== undefined;
      let maxChangedToUndefined = workingNode.max !== undefined;

      if (minChangedToUndefined || maxChangedToUndefined) {
        workingNode.min = undefined; // REMOVED 'as K'
        workingNode.max = undefined; // REMOVED 'as K'
        // No propagation needed for empty leaf setting min/max to undefined, parent relies on siblings or becomes empty itself.
      }
    }
  } else { // Internal node
    if (workingNode.children.length > 0) {
      const firstChild = transactionContext.getNode(workingNode.children[0]);
      const lastChild = transactionContext.getNode(workingNode.children[workingNode.children.length - 1]);

      const newMin = firstChild?.min;
      const newMax = lastChild?.max;

      let minChanged = (workingNode.min === undefined && newMin !== undefined) || (workingNode.min !== undefined && newMin === undefined) || (newMin !== undefined && transactionContext.treeSnapshot.comparator(workingNode.min, newMin) !== 0);
      let maxChanged = (workingNode.max === undefined && newMax !== undefined) || (workingNode.max !== undefined && newMax === undefined) || (newMax !== undefined && transactionContext.treeSnapshot.comparator(workingNode.max, newMax) !== 0);

      if (!firstChild) {
        // console.warn(`[update_min_max_immutable] First child of internal node ${workingNode.id} not found. Setting min to undefined.`); // LOG REMOVED
        minChanged = workingNode.min !== undefined;
      }
      if (!lastChild) {
        // console.warn(`[update_min_max_immutable] Last child of internal node ${workingNode.id} not found. Setting max to undefined.`); // LOG REMOVED
        maxChanged = workingNode.max !== undefined;
      }

      if (minChanged || maxChanged) {
        // console.log(`[update_min_max_immutable] Internal ${workingNode.id} min/max changed. Min: ${minChanged}, Max: ${maxChanged}. Already copied.`); // LOG REMOVED
        workingNode.min = newMin as K; // newMin can be undefined if firstChild or firstChild.min is undefined
        workingNode.max = newMax as K; // newMax can be undefined if lastChild or lastChild.max is undefined

        if (workingNode._parent !== undefined && !skipParentSeparatorUpdate) {
          const parentNode = transactionContext.getNode(workingNode._parent);
          if (parentNode) {
            // console.log(`[update_min_max_immutable] Internal ${workingNode.id} has parent ${parentNode.id}. Checking for propagation.`); // LOG REMOVED
            let parentDidChange = false;
            let finalParentNode = parentNode;
            // originalNode.id is correct as it refers to the node whose position in parent we are checking
            if (minChanged && parentNode.children[0] === originalNode.id) {
                // console.log(`[update_min_max_immutable] Internal ${workingNode.id} is first child of ${parentNode.id}. Propagating min ${newMin}.`); // LOG REMOVED
                finalParentNode = replace_min_immutable(parentNode, newMin as K, transactionContext); // newMin can be K | undefined
                parentDidChange = true;
            }
            if (maxChanged && parentNode.children[parentNode.children.length - 1] === originalNode.id) {
                // console.log(`[update_min_max_immutable] Internal ${workingNode.id} is last child of ${parentNode.id}. Propagating max ${newMax}.`); // LOG REMOVED
                finalParentNode = replace_max_immutable(parentDidChange ? finalParentNode : parentNode, newMax as K, transactionContext); // newMax can be K | undefined
                parentDidChange = true;
            }
            // CRITICAL FIX: Always update workingNode._parent if parent changed
            if (parentDidChange) {
                // console.log(`[update_min_max_immutable] Parent ID for internal ${workingNode.id} changed from ${workingNode._parent} to ${finalParentNode.id}. Updating parent pointer.`); // LOG REMOVED
                workingNode._parent = finalParentNode.id;
            }
          }
        } else if (skipParentSeparatorUpdate) {
          // console.log(`[update_min_max_immutable] Skipping parent separator update for internal node ${workingNode.id} due to _skipParentSeparatorUpdate flag`);
        }
      }
    } else { // Internal node is empty (no children)
      // console.log(`[update_min_max_immutable] Internal node ${workingNode.id} is empty. Setting min/max to undefined.`); // LOG REMOVED
      let minChangedToUndefined = workingNode.min !== undefined;
      let maxChangedToUndefined = workingNode.max !== undefined;

      if (minChangedToUndefined || maxChangedToUndefined) {
        workingNode.min = undefined;
        workingNode.max = undefined;
      }
    }
  }
  // console.log(`[update_min_max_immutable] Returning node ${workingNode.id} (min: ${workingNode.min}, max: ${workingNode.max}, isCopy: ${workingNode.id !== originalNode.id})`); // LOG REMOVED
  return workingNode;
}

export function insert_key_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  key: K,
  value: T,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  // console.log(`[insert_key_immutable] Called for node ID: ${originalNode.id}, isLeaf: ${originalNode.leaf}, keys: [${originalNode.keys.join(',')}] with key: ${key}`); // LOG REMOVED

  if (!originalNode.leaf) {
    // console.error('[insert_key_immutable] Attempted to insert key into a non-leaf node. This function is for leaves only.');
    // Potentially throw an error or return originalNode if this is an invalid operation
    throw new Error('insert_key_immutable can only be called on leaf nodes.'); // ADDED THROW
  }

  let workingNode = Node.copy(originalNode, transactionContext);
  // console.log(`[insert_key_immutable] After Node.copy - workingNode ID: ${workingNode.id}, keys: [${workingNode.keys.join(',')}], key_num: ${workingNode.key_num}`); // LOG REMOVED

  const newKeys = [...workingNode.keys];
  const newPointers = [...workingNode.pointers];

  const index = find_last_key(newKeys, key, transactionContext.treeSnapshot.comparator);

  if (workingNode.tree.unique && index > 0 && transactionContext.treeSnapshot.comparator(newKeys[index - 1], key) === 0) {
    newPointers[index - 1] = value;
  } else {
    newKeys.splice(index, 0, key);
    newPointers.splice(index, 0, value);
  }

  workingNode.keys = newKeys;
  workingNode.pointers = newPointers;
  // console.log(`[insert_key_immutable] After splice - workingNode ID: ${workingNode.id}, keys: [${workingNode.keys.join(',')}], current key_num: ${workingNode.key_num} (will be updated by update_state)`); // LOG REMOVED

  workingNode = update_state_immutable(workingNode, transactionContext);
  workingNode = update_min_max_immutable(workingNode, transactionContext);

  // console.log(`[insert_key_immutable] Returning workingNode ID: ${workingNode.id}, keys: [${workingNode.keys.join(',')}]`); // LOG REMOVED
  return workingNode;
}

export function remove_key_immutable<T, K extends ValueType>(
  originalNode: Node<T, K>,
  keyToRemove: K,
  transactionContext: ITransactionContext<T, K>,
  removeAll: boolean = false // NEW PARAMETER: if true, remove all occurrences of the key
): { updatedNode: Node<T, K>; keyExisted: boolean; removedCount: number } { // CHANGED return type
  if (!originalNode.leaf) {
    throw new Error('Cannot remove key directly from an internal node using remove_key_immutable. This is for leaves.');
  }

  let workingNode = Node.copy(originalNode, transactionContext);
  let keyExisted = false;
  let removedCount = 0; // NEW: track how many keys were removed

  const newKeys = [...workingNode.keys];
  const newPointers = [...workingNode.pointers];

  if (removeAll) {
    // Remove ALL occurrences of the key from this leaf node
    let i = 0;
    while (i < newKeys.length) {
      if (transactionContext.treeSnapshot.comparator(newKeys[i], keyToRemove) === 0) {
        newKeys.splice(i, 1);
        newPointers.splice(i, 1);
        keyExisted = true;
        removedCount++;
        // Don't increment i since we removed an element
      } else {
        i++;
      }
    }
  } else {
    // Remove only the FIRST occurrence (original behavior)
    const index = find_first_key(newKeys, keyToRemove, transactionContext.treeSnapshot.comparator);

    if (index !== -1 && transactionContext.treeSnapshot.comparator(newKeys[index], keyToRemove) === 0) {
      newKeys.splice(index, 1);
      newPointers.splice(index, 1);
      keyExisted = true;
      removedCount = 1;
    }
  }

  if (!keyExisted) {
    // Key not found, return original working copy and false
    return { updatedNode: workingNode, keyExisted: false, removedCount: 0 };
  }

  workingNode.keys = newKeys;
  workingNode.pointers = newPointers;

  workingNode = update_state_immutable(workingNode, transactionContext);
  workingNode = update_min_max_immutable(workingNode, transactionContext);

  return { updatedNode: workingNode, keyExisted, removedCount };
}

/**
 * Splits a переполненный (2t keys) leaf node in a Copy-on-Write manner.
 * @param leafToSplit The leaf node to split. Assumed to be a working copy from the transaction context and to have 2t keys.
 * @param transactionContext The current transaction context.
 * @returns An object containing the updated original leaf (now with t keys),
 *          the new sibling leaf (with t keys), and the separator key to be inserted into the parent.
 */
export function split_leaf_cow<T, K extends ValueType>(
  leafToSplit: Node<T, K>, // This is already a working copy
  transactionContext: ITransactionContext<T, K>
): { updatedLeaf: Node<T, K>; updatedSibling: Node<T, K>; separatorKey: K } {
  if (!leafToSplit.leaf) {
    throw new Error('split_leaf_cow can only be called on leaf nodes.');
  }
  if (leafToSplit.keys.length !== 2 * leafToSplit.t) {
    // This is a stricter check. The node should have exactly 2t keys to be split this way.
    // Or, if the logic is that it splits when it *would* exceed 2t-1, then this check needs adjustment.
    // For now, assuming it's called when leafToSplit has 2t keys.
    // console.warn(`[split_leaf_cow] Called on leaf ${leafToSplit.id} with ${leafToSplit.keys.length} keys, but expected ${2 * leafToSplit.t} keys for t=${leafToSplit.t}.`);
    // Potentially throw error or handle differently if this assumption is wrong.
  }

  // 1. Create a new sibling leaf node.
  const newSiblingLeaf = Node.createLeaf(transactionContext.treeSnapshot); // Create from snapshot's tree config
  transactionContext.addWorkingNode(newSiblingLeaf);

  // 2. Divide keys and pointers.
  // leafToSplit keeps the first t keys, newSiblingLeaf gets the next t keys.
  const middleKeyIndex = leafToSplit.t;
  const originalKeys = leafToSplit.keys; // No need to spread, will slice immutably
  const originalPointers = leafToSplit.pointers;

  const newLeafKeys = originalKeys.slice(0, middleKeyIndex);
  const newLeafPointers = originalPointers.slice(0, middleKeyIndex);
  const siblingKeys = originalKeys.slice(middleKeyIndex);
  const siblingPointers = originalPointers.slice(middleKeyIndex);

  // Directly modify leafToSplit as it's already a working copy from the context.
  // However, subsequent calls to update_state_immutable / update_min_max_immutable will produce new copies.
  leafToSplit.keys = newLeafKeys;
  leafToSplit.pointers = newLeafPointers;

  newSiblingLeaf.keys = siblingKeys;
  newSiblingLeaf.pointers = siblingPointers;

  // 3. Update state and min/max for both leaves (this will create new copies).
  let updatedLeaf = update_state_immutable(leafToSplit, transactionContext);
  updatedLeaf = update_min_max_immutable(updatedLeaf, transactionContext);

  let updatedSibling = update_state_immutable(newSiblingLeaf, transactionContext);
  updatedSibling = update_min_max_immutable(updatedSibling, transactionContext);

  // 4. Set up sibling pointers on the final copies.
  // The original _left and _right of leafToSplit are preserved on its first copy,
  // and then potentially on updatedLeaf if update_state/min_max don't change them.
  // We need to link updatedLeaf and updatedSibling.
  const originalRightSiblingId = updatedLeaf._right; // original leafToSplit's right sibling

  updatedLeaf._right = updatedSibling.id;
  updatedSibling._left = updatedLeaf.id;
  updatedSibling._right = originalRightSiblingId; // newSibling takes original right sibling

  // If originalRightSiblingId existed, its _left pointer needs to be updated to updatedSibling.id
  // This will be handled when inserting into parent, or requires getting/copying that node now.
  // For now, we focus on the two new siblings.

  // Parent pointers will be set when inserting the separator key into the parent.
  // updatedLeaf._parent and updatedSibling._parent should point to the same (copied) parent.

  // 5. Determine the separator key.
  // This is typically the first key of the new right sibling.
  const separatorKey = updatedSibling.keys[0];

  return { updatedLeaf, updatedSibling, separatorKey };
}

/**
 * Inserts a separator key and a new child pointer into a parent node in a Copy-on-Write manner.
 * This is a basic version and does NOT handle splitting of the parent if it overflows.
 * @param parentWorkingCopy The working copy of the parent node.
 * @param originalLeftChildId The ID of the original left child (before it might have been split/copied).
 *                            This ID is used to find the insertion position in the parent.
 * @param separatorKey The key to insert into the parent.
 * @param newRightChildId The ID of the new right child to insert.
 * @param transactionContext The current transaction context.
 * @returns The (potentially new copied) updated parent node.
 */
export function insert_into_parent_cow<T, K extends ValueType>(
  parentWorkingCopy: Node<T, K>,
  originalLeftChildId: number,
  separatorKey: K,
  newRightChildId: number,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  if (parentWorkingCopy.leaf) {
    throw new Error('insert_into_parent_cow cannot be called on a leaf node.');
  }

  // 1. Find the position of the originalLeftChildId in the parent's children array.
  // This determines where the new separatorKey and newRightChildId will be inserted.
  const childIndex = parentWorkingCopy.children.indexOf(originalLeftChildId);

  if (childIndex === -1) {
    throw new Error(`[insert_into_parent_cow] Original left child ID ${originalLeftChildId} not found in parent ${parentWorkingCopy.id}.`);
  }

  // 2. Create new arrays for keys and children for immutability.
  const newKeys = [...parentWorkingCopy.keys];
  const newChildren = [...parentWorkingCopy.children];

  // 3. Insert the separatorKey and newRightChildId.
  // The separatorKey is inserted at childIndex in the keys array.
  // The newRightChildId is inserted at childIndex + 1 in the children array.
  newKeys.splice(childIndex, 0, separatorKey);
  newChildren.splice(childIndex + 1, 0, newRightChildId);

  // 4. Update the parent working copy with the new immutable arrays.
  // Note: parentWorkingCopy is already a mutable working copy from the transaction.
  // Subsequent update_state/min_max calls will produce new copies from this modified one.
  parentWorkingCopy.keys = newKeys;
  parentWorkingCopy.children = newChildren;

  // Update parent pointers for the new child and potentially its new siblings
  const newRightChild = transactionContext.getNode(newRightChildId);
  if (newRightChild) {
    newRightChild._parent = parentWorkingCopy.id; // Link to the current parent copy ID
  }
  // The original left child (now potentially a new copy due to split) also needs its _parent updated
  // if parentWorkingCopy itself is a new copy. This is implicitly handled if parentWorkingCopy.id is new.
  // And its _right pointer should point to newRightChildId.
  const leftChild = transactionContext.getNode(parentWorkingCopy.children[childIndex]); // This might be an old ID if left child was split
                                                                  // We need the *updated* left child from the split.
                                                                  // This part needs careful handling of IDs.
                                                                  // For now, assume the calling context handles the left child's pointers correctly before this call,
                                                                  // or that this function is called with the *new* ID of the left part of the split if it changed.
                                                                  // Let's assume `originalLeftChildId` is the ID of the node that is now to the left of `newRightChildId`.
  const actualLeftChild = transactionContext.getNode(parentWorkingCopy.children[childIndex]); // Get the ID from the *updated* children list at childIndex
  if (actualLeftChild && actualLeftChild.id === originalLeftChildId) { // Make sure we are updating the correct one
     // If originalLeftChildId is still in the children list at childIndex, it means it wasn't replaced by a copy ID yet by a previous split.
     const leftNodeInstance = transactionContext.getWorkingNode(originalLeftChildId) || transactionContext.getCommittedNode(originalLeftChildId);
     if(leftNodeInstance && leftNodeInstance !== transactionContext.getWorkingNode(parentWorkingCopy.children[childIndex])){
        // This implies originalLeftChildId might be a stale ID if a split returned a *new* ID for the left part.
        // This logic is becoming complex. Simpler: the split function should return the *final working IDs* of both split parts.
        // Let's assume for now the caller provides the correct *current* ID for the left child that results from a split.
     }
  }
  // Sibling pointers also need re-wiring if they are now pointing to parentWorkingCopy.
  // The node at newChildren[childIndex] (updated left child) should have its ._right = newRightChildId
  // The node at newChildren[childIndex+1] (new right child) has ._left set by split_leaf_cow. It needs ._parent and ._right set.
  // The node at newChildren[childIndex+2] (original right of newRightChildId) needs ._left updated.
  // This sibling re-wiring is also complex here. It's often handled as part of updating the children of the parent.

  // 5. Update the state and min/max of the parent node immutably.
  let updatedParent = update_state_immutable(parentWorkingCopy, transactionContext);
  updatedParent = update_min_max_immutable(updatedParent, transactionContext);

  // 6. Return the final (potentially new copied) updated parent node.
  return updatedParent;
}

/**
 * Splits an overflowed (2t keys) internal node in a Copy-on-Write manner.
 * @param internalNodeToSplit The internal node to split. Assumed to be a working copy and have 2t keys (and 2t+1 children).
 * @param transactionContext The current transaction context.
 * @returns An object containing the updated original node (now with t keys),
 *          the new sibling node (with t-1 keys), and the separator key to be pushed up to the parent.
 */
export function split_internal_node_cow<T, K extends ValueType>(
  internalNodeToSplit: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): { updatedNode: Node<T, K>; updatedSibling: Node<T, K>; separatorKey: K } {
  if (internalNodeToSplit.leaf) {
    throw new Error('split_internal_node_cow can only be called on internal nodes.');
  }

  const t = internalNodeToSplit.t;
  // An internal node splits when it has 2t keys (meaning 2t+1 children)
  // The middle key (at index t) is pushed up.
  // The left node gets the first t keys and t+1 children.
  // The right node gets the remaining t-1 keys and t children.
  if (internalNodeToSplit.keys.length !== 2 * t) {
    // console.warn(`[split_internal_node_cow] Called on node ${internalNodeToSplit.id} with ${internalNodeToSplit.keys.length} keys, but expected ${2 * t} keys for t=${t}.`);
    // This indicates an issue with the calling logic or tree state.
  }
  if (internalNodeToSplit.children.length !== 2 * t + 1) {
    //  console.warn(`[split_internal_node_cow] Called on node ${internalNodeToSplit.id} with ${internalNodeToSplit.children.length} children, but expected ${2 * t + 1} for t=${t}.`);
  }

  // 1. Create a new sibling internal node.
  const newSiblingNode = Node.createNode(transactionContext.treeSnapshot);
  transactionContext.addWorkingNode(newSiblingNode);

  // 2. Identify the separator key and divide keys and children.
  const separatorKey = internalNodeToSplit.keys[t];

  const originalKeys = internalNodeToSplit.keys;
  const originalChildren = internalNodeToSplit.children;

  // internalNodeToSplit (left part) gets first t keys and first t+1 children
  const newLeftKeys = originalKeys.slice(0, t);
  const newLeftChildren = originalChildren.slice(0, t + 1);

  // newSiblingNode (right part) gets last t-1 keys and last t children
  const newRightKeys = originalKeys.slice(t + 1);
  const newRightChildren = originalChildren.slice(t + 1);

  // Update internalNodeToSplit (it's already a working copy)
  internalNodeToSplit.keys = newLeftKeys;
  internalNodeToSplit.children = newLeftChildren;

  // Update newSiblingNode
  newSiblingNode.keys = newRightKeys;
  newSiblingNode.children = newRightChildren;

  // 3. Reparent children that moved to newSiblingNode.
  // These children need to point to newSiblingNode.id using their working copies.
  for (const childId of newRightChildren) {
    const childNode = transactionContext.getNode(childId);
    if (childNode) {
      let childWorkingCopy = transactionContext.getWorkingNode(childId);
      if (!childWorkingCopy) {
        // If childNode was from committed store, we need a working copy to change its parent.
        childWorkingCopy = Node.copy(childNode, transactionContext);
        // Node.copy already adds to workingNodes.
      }
      childWorkingCopy._parent = newSiblingNode.id;
      // It's important that childWorkingCopy is indeed the one in transactionContext.workingNodes now.
      // If Node.copy was called, it is. If it was already a working copy, we are modifying it directly.
    }
  }

  // 4. Update state and min/max for both nodes (this will create new copies).
  let updatedNode = update_state_immutable(internalNodeToSplit, transactionContext);
  updatedNode = update_min_max_immutable(updatedNode, transactionContext);

  let updatedSibling = update_state_immutable(newSiblingNode, transactionContext);
  updatedSibling = update_min_max_immutable(updatedSibling, transactionContext);

  // 5. Set up sibling pointers on the final copies.
  const originalRightSiblingId = updatedNode._right;
  updatedNode._right = updatedSibling.id;
  updatedSibling._left = updatedNode.id;
  updatedSibling._right = originalRightSiblingId;

  // Parent pointers (updatedNode._parent, updatedSibling._parent) will be set by the caller (insert_into_parent_cow).

  return { updatedNode, updatedSibling, separatorKey };
}

// Placeholder functions (replace with actual CoW implementation)
export function merge_with_left<T,K extends ValueType>(): void {
  // console.log('merge_with_left (CoW placeholder) called');
  throw new Error('merge_with_left (CoW placeholder) called'); // Remove this line
}

export function merge_with_right<T,K extends ValueType>(): void {
  // console.log('merge_with_right (CoW placeholder) called');
  throw new Error('merge_with_right (CoW placeholder) called'); // Remove this line
}

// --- Start CoW Merge Implementations ---

/**
 * Merges a node with its left sibling in a Copy-on-Write manner.
 * Creates copies of the node, left sibling, and parent, performs the merge on the copies,
 * updates parent/sibling pointers on copies, and adds modified/new nodes to the transaction context.
 * The left sibling is marked for deletion.
 * @param nodeWorkingCopy The working copy of the node to merge into.
 * @param leftSiblingWorkingCopy The working copy of the left sibling to merge from.
 * @param parentWorkingCopy The working copy of the parent node.
 * @param transactionContext The transaction context.
 * @returns The updated working copy of the node after merge.
 */
export function merge_with_left_cow<T, K extends ValueType>(
  nodeWorkingCopy: Node<T, K>,
  leftSiblingWorkingCopy: Node<T, K>,
  parentWorkingCopy: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  // Ensure we are working with fresh copies for the merge operation
  const finalNode = Node.forceCopy(nodeWorkingCopy, transactionContext); // Node to merge into (becomes the result)
  const leftSiblingToMerge = Node.forceCopy(leftSiblingWorkingCopy, transactionContext); // Node to merge from
  const finalParent = Node.forceCopy(parentWorkingCopy, transactionContext); // Parent node

  // Find left sibling index in parent - try multiple approaches to handle CoW ID mismatches
  const leftSiblingOriginalId = (leftSiblingWorkingCopy as any)._originalNodeId || leftSiblingWorkingCopy.id;
  let leftSiblingIndexInParent = finalParent.children.indexOf(leftSiblingOriginalId);

  // If not found by original ID, try current working copy ID
  if (leftSiblingIndexInParent === -1) {
    leftSiblingIndexInParent = finalParent.children.indexOf(leftSiblingWorkingCopy.id);
  }

  // If still not found, search for working copy relationships
  if (leftSiblingIndexInParent === -1) {
    for (let i = 0; i < finalParent.children.length; i++) {
      const childIdInParent = finalParent.children[i];
      // Check if there's a working copy that has this childIdInParent as its original
      for (const workingNode of transactionContext.workingNodes.values()) {
        const workingOriginalId = (workingNode as any)._originalNodeId;
        if (workingOriginalId === childIdInParent &&
            (workingNode.id === leftSiblingWorkingCopy.id || workingNode === leftSiblingWorkingCopy)) {
          leftSiblingIndexInParent = i;
          break;
        }
      }
      if (leftSiblingIndexInParent !== -1) break;
    }
  }

  if (leftSiblingIndexInParent === -1) {
    throw new Error(`[merge_with_left_cow] Left sibling (ID: ${leftSiblingWorkingCopy.id}, original: ${leftSiblingOriginalId}) not found in parent (ID: ${finalParent.id}, original ID: ${parentWorkingCopy.id}) children: [${finalParent.children.join(',')}]`);
  }

  // The separator key between left sibling and current node is the key that separates them
  // In B+ trees, if leftSibling is at index i, then separatorKey is at index i (the key that points to the right child)
  const separatorKey = leftSiblingIndexInParent < finalParent.keys.length ?
    finalParent.keys[leftSiblingIndexInParent] :
    (finalParent.keys.length > 0 ? finalParent.keys[finalParent.keys.length - 1] : undefined);

  // Combine keys and pointers/children onto the finalNode
  if (finalNode.leaf) {
    finalNode.keys = [...leftSiblingToMerge.keys, ...finalNode.keys]; // NO separatorKey for leaves
    finalNode.pointers = [...leftSiblingToMerge.pointers, ...finalNode.pointers];
  } else {
    // Add separatorKey for internal nodes only if it exists
    const keysToAdd = separatorKey !== undefined ?
      [...leftSiblingToMerge.keys, separatorKey, ...finalNode.keys] :
      [...leftSiblingToMerge.keys, ...finalNode.keys];
    finalNode.keys = keysToAdd;
    const combinedChildrenIds = [...leftSiblingToMerge.children, ...nodeWorkingCopy.children]; // Use nodeWorkingCopy.children here
    const finalChildrenIds = [];

    for (const childId of combinedChildrenIds) {
        const childOriginal = transactionContext.getNode(childId);
        if (childOriginal) {
            let childWorkingCopy = transactionContext.getWorkingNode(childId);
            let isNewCopy = false;
            if (!childWorkingCopy || childWorkingCopy.id === childOriginal.id) {
                childWorkingCopy = Node.copy(childOriginal, transactionContext);
                isNewCopy = true;
            }
            childWorkingCopy._parent = finalNode.id;
            finalChildrenIds.push(childWorkingCopy.id); // Add the ID of the working copy
        } else {
            //  console.warn(`[merge_with_left_cow] Child node ${childId} not found during parent pointer update.`);
             finalChildrenIds.push(childId); // Keep original ID if not found, though this is an error state
        }
    }
    finalNode.children = finalChildrenIds;
  }

  let updatedMergedNode = update_state_immutable(finalNode, transactionContext);
  updatedMergedNode = update_min_max_immutable(updatedMergedNode, transactionContext);

  // Update the finalParent: remove the left sibling's child entry and the separator key
  const newParentKeys = [...finalParent.keys];
  const newParentChildren = [...finalParent.children];

  // The separator key to remove is at leftSiblingIndexInParent
  // The child to remove (leftSiblingToMerge.id) is also at leftSiblingIndexInParent in children
  if (leftSiblingIndexInParent < newParentKeys.length) {
    newParentKeys.splice(leftSiblingIndexInParent, 1);
  } else {
    // console.warn(`[merge_with_left_cow] Separator key index ${leftSiblingIndexInParent} out of bounds for parent ${finalParent.id} keys (length: ${newParentKeys.length}) during removal. Using fallback.`);
    // Fallback: remove the last key if keys exist
    if (newParentKeys.length > 0) {
      newParentKeys.splice(newParentKeys.length - 1, 1);
    }
  }
  if (leftSiblingIndexInParent < newParentChildren.length) {
    newParentChildren.splice(leftSiblingIndexInParent, 1);
  } else {
    // console.warn(`[merge_with_left_cow] Child index ${leftSiblingIndexInParent} for merged node out of bounds for parent ${finalParent.id} children (length: ${newParentChildren.length}) during removal. Using fallback.`);
    // Fallback: remove the last child if children exist
    if (newParentChildren.length > 0) {
      newParentChildren.splice(newParentChildren.length - 1, 1);
    }
  }

  finalParent.keys = newParentKeys;
  finalParent.children = newParentChildren;

  // After removing the left sibling and its separator, the node that was originally nodeWorkingCopy
  // might have shifted its index. We need to find it (or where it *was*) and update to updatedMergedNode.id
  // The original node (nodeWorkingCopy) was at index leftSiblingIndexInParent + 1 relative to the *original* children list.
  // After removing the element at leftSiblingIndexInParent, this position becomes leftSiblingIndexInParent.
  const indexOfMergedNodeInNewParentChildren = finalParent.children.indexOf(nodeWorkingCopy.id); // Find by original ID before it was replaced
  if (indexOfMergedNodeInNewParentChildren !== -1) {
    finalParent.children[indexOfMergedNodeInNewParentChildren] = updatedMergedNode.id;
  } else {
     // This case might occur if nodeWorkingCopy.id was already replaced by its own copy's ID in parent before merge.
     // A more robust way is to find the original node by its original ID in the *original parent copy's children*
     // and then update at that effective new index.
     // The child that was at parentWorkingCopy.children[leftSiblingIndexInParent+1] (original right of merged child)
     // is now at finalParent.children[leftSiblingIndexInParent]. This child should be updatedMergedNode.id.
     if (leftSiblingIndexInParent < finalParent.children.length) {
        finalParent.children[leftSiblingIndexInParent] = updatedMergedNode.id;
     } else {
        // console.error(`[merge_with_left_cow] Index ${leftSiblingIndexInParent} for merged node slot is out of bounds in parent ${finalParent.id} children after splice.`);
     }
  }
  updatedMergedNode._parent = finalParent.id; // Merged node parent is finalParent

  let updatedParent = update_state_immutable(finalParent, transactionContext);
  updatedParent = update_min_max_immutable(updatedParent, transactionContext);
  updatedMergedNode._parent = updatedParent.id; // Update parent pointer to the latest parent copy

  // Update sibling pointers for updatedMergedNode
  // Update sibling pointers
  const leftOfMergedNodeId = nodeWorkingCopy._left; // Original left of the node that was merged away
  updatedMergedNode._left = leftOfMergedNodeId;
  if (leftOfMergedNodeId !== undefined) {
    const leftNode = transactionContext.getNode(leftOfMergedNodeId);
    if (leftNode) {
      let leftWorkingNode = transactionContext.getWorkingNode(leftOfMergedNodeId) ?? Node.copy(leftNode, transactionContext);
      leftWorkingNode._right = updatedMergedNode.id;
    }
  }

  transactionContext.markNodeForDeletion(leftSiblingWorkingCopy.id);

  return updatedMergedNode;
}

/**
 * Merges a node with its right sibling in a Copy-on-Write manner.
 * Creates copies of the node, right sibling, and parent, performs the merge on the copies,
 * updates parent/sibling pointers on copies, and adds modified/new nodes to the transaction context.
 * The right sibling is marked for deletion.
 * @param nodeWorkingCopy The working copy of the node to merge from.
 * @param rightSiblingWorkingCopy The working copy of the right sibling to merge into.
 * @param parentWorkingCopy The working copy of the parent node.
 * @param transactionContext The transaction context.
 * @returns The updated working copy of the right sibling after merge (which is the result of the merge).
 */
export function merge_with_right_cow<T, K extends ValueType>(
  nodeWorkingCopy: Node<T, K>,
  rightSiblingWorkingCopy: Node<T, K>,
  parentWorkingCopy: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): Node<T, K> {
  const finalRightSibling = Node.forceCopy(rightSiblingWorkingCopy, transactionContext);
  const nodeToMerge = Node.forceCopy(nodeWorkingCopy, transactionContext);
  const finalParent = Node.forceCopy(parentWorkingCopy, transactionContext);

  // Find node index in parent - try multiple approaches to handle CoW ID mismatches
  const nodeOriginalId = (nodeWorkingCopy as any)._originalNodeId || nodeWorkingCopy.id;
  let nodeIndexInParent = finalParent.children.indexOf(nodeOriginalId);

  // If not found by original ID, try current working copy ID
  if (nodeIndexInParent === -1) {
    nodeIndexInParent = finalParent.children.indexOf(nodeWorkingCopy.id);
  }

  // If still not found, search for working copy relationships
  if (nodeIndexInParent === -1) {
    for (let i = 0; i < finalParent.children.length; i++) {
      const childIdInParent = finalParent.children[i];
      // Check if there's a working copy that has this childIdInParent as its original
      for (const workingNode of transactionContext.workingNodes.values()) {
        const workingOriginalId = (workingNode as any)._originalNodeId;
        if (workingOriginalId === childIdInParent &&
            (workingNode.id === nodeWorkingCopy.id || workingNode === nodeWorkingCopy)) {
          nodeIndexInParent = i;
          break;
        }
      }
      if (nodeIndexInParent !== -1) break;
    }
  }

  if (nodeIndexInParent === -1) {
    throw new Error(`[merge_with_right_cow] Node to merge (ID: ${nodeWorkingCopy.id}, original: ${nodeOriginalId}) not found in parent (ID: ${finalParent.id}, original ID: ${parentWorkingCopy.id}) children: [${finalParent.children.join(',')}]`);
  }

  // The separator key between current node and right sibling
  const separatorKey = nodeIndexInParent < finalParent.keys.length ?
    finalParent.keys[nodeIndexInParent] :
    (finalParent.keys.length > 0 ? finalParent.keys[finalParent.keys.length - 1] : undefined);

  if (nodeToMerge.leaf) {
    finalRightSibling.keys = [...nodeToMerge.keys, ...finalRightSibling.keys]; // NO separatorKey for leaves
    finalRightSibling.pointers = [...nodeToMerge.pointers, ...finalRightSibling.pointers];
  } else {
    // Add separatorKey for internal nodes only if it exists
    const keysToAdd = separatorKey !== undefined ?
      [...nodeToMerge.keys, separatorKey, ...finalRightSibling.keys] :
      [...nodeToMerge.keys, ...finalRightSibling.keys];
    finalRightSibling.keys = keysToAdd;
    const combinedChildrenIds = [...nodeToMerge.children, ...rightSiblingWorkingCopy.children]; // Use rightSiblingWorkingCopy.children
    const finalChildrenIds = [];

    for (const childId of combinedChildrenIds) {
        const childOriginal = transactionContext.getNode(childId);
        if (childOriginal) {
            let childWorkingCopy = transactionContext.getWorkingNode(childId);
            let isNewCopy = false;
            if (!childWorkingCopy || childWorkingCopy.id === childOriginal.id) {
                childWorkingCopy = Node.copy(childOriginal, transactionContext);
                isNewCopy = true;
            }
            childWorkingCopy._parent = finalRightSibling.id;
            finalChildrenIds.push(childWorkingCopy.id);
        } else {
            //  console.warn(`[merge_with_right_cow] Child node ${childId} not found during parent pointer update.`);
             finalChildrenIds.push(childId);
        }
    }
    finalRightSibling.children = finalChildrenIds;
  }

  let updatedMergedNode = update_state_immutable(finalRightSibling, transactionContext);
  updatedMergedNode = update_min_max_immutable(updatedMergedNode, transactionContext);

  // Update the finalParent
  const newParentKeys = [...finalParent.keys];
  const newParentChildren = [...finalParent.children];

  // The separator key to remove is at nodeIndexInParent
  // The child to remove (nodeToMerge.id, effectively nodeWorkingCopy.id's original position) is also at nodeIndexInParent
  if (nodeIndexInParent < newParentKeys.length) {
    newParentKeys.splice(nodeIndexInParent, 1);
  } else {
    // console.warn(`[merge_with_right_cow] Separator key index ${nodeIndexInParent} out of bounds for parent ${finalParent.id} keys (length: ${newParentKeys.length}) during removal. Using fallback.`);
    // Fallback: remove the last key if keys exist
    if (newParentKeys.length > 0) {
      newParentKeys.splice(newParentKeys.length - 1, 1);
    }
  }
  // Remove the child entry corresponding to nodeWorkingCopy (which became nodeToMerge)
  // Its original ID was nodeWorkingCopy.id. We found its index as nodeIndexInParent.
  if (nodeIndexInParent < newParentChildren.length) {
    newParentChildren.splice(nodeIndexInParent, 1);
  } else {
    // console.warn(`[merge_with_right_cow] Child index ${nodeIndexInParent} for nodeToMerge out of bounds for parent ${finalParent.id} children (length: ${newParentChildren.length}) during removal. Using fallback.`);
    // Fallback: remove the last child if children exist
    if (newParentChildren.length > 0) {
      newParentChildren.splice(newParentChildren.length - 1, 1);
    }
  }

  finalParent.keys = newParentKeys;
  finalParent.children = newParentChildren;

  // After removing nodeToMerge and its separator, the node that was originally rightSiblingWorkingCopy
  // needs to be updated to updatedMergedNode.id. Its index in the *new* children list needs to be found.
  // The element at the *new* nodeIndexInParent in finalParent.children is the one that should become updatedMergedNode.id.
  // (This used to be at the original nodeIndexInParent + 1, but after splicing at nodeIndexInParent, it's now at nodeIndexInParent)
  if (nodeIndexInParent < finalParent.children.length) {
      // The child that was rightSiblingWorkingCopy.id should now be updatedMergedNode.id
      // We need to find where rightSiblingWorkingCopy.id *was* in the new children list
      const indexOfOriginalRightSiblingInNewList = finalParent.children.indexOf(rightSiblingWorkingCopy.id);
      if (indexOfOriginalRightSiblingInNewList !== -1) {
          finalParent.children[indexOfOriginalRightSiblingInNewList] = updatedMergedNode.id;
      } else {
          // This can happen if rightSiblingWorkingCopy.id was already replaced by a copy's ID
          // (e.g. finalRightSibling.id) earlier if parent was already a working copy pointing to other working children.
          // More robust: the element that is now at `nodeIndexInParent` in the modified children array is the one that should become updatedMergedNode.id.
          finalParent.children[nodeIndexInParent] = updatedMergedNode.id;
      }
  } else {
     // If nodeIndexInParent is now out of bounds, it means the parent became empty of children
     // (e.g. merging the last two children of a parent). This edge case might need specific handling
     // if the parent itself needs to be deleted (e.g. root becoming empty).
     // For now, assume parent still has children. If it has only one child (updatedMergedNode), this is fine.
     // If nodeIndexInParent was the last valid index, and a child was removed, and parent.children is now empty, this is an issue.
     // However, typical merge logic implies parent has at least the merged node.
     if (finalParent.children.length === 0 && updatedMergedNode.id) { // If parent is now childless, but we have a merged node
         finalParent.children.push(updatedMergedNode.id); // This shouldn't really happen if logic is right. Parent should have at least one child.
     } else if (finalParent.children.length > 0 && nodeIndexInParent >= finalParent.children.length) {
        // console.error(`[merge_with_right_cow] Index ${nodeIndexInParent} for merged node slot is out of bounds in parent ${finalParent.id} children after splice. Children: [${finalParent.children.join(',')}]`);
     }
     // If finalParent.children had only one element (the one we just put as updatedMergedNode.id), and nodeIndexInParent was 0, this is fine.
  }
  updatedMergedNode._parent = finalParent.id;

  let updatedParent = update_state_immutable(finalParent, transactionContext);
  updatedParent = update_min_max_immutable(updatedParent, transactionContext);
  updatedMergedNode._parent = updatedParent.id; // Update parent pointer to the latest parent copy

  const leftOfMergedNodeId = nodeWorkingCopy._left;
  updatedMergedNode._left = leftOfMergedNodeId;
  if (leftOfMergedNodeId !== undefined) {
    const leftNode = transactionContext.getNode(leftOfMergedNodeId);
    if (leftNode) {
      let leftWorkingNode = transactionContext.getWorkingNode(leftOfMergedNodeId) ?? Node.copy(leftNode, transactionContext);
      leftWorkingNode._right = updatedMergedNode.id;
    }
  }

  transactionContext.markNodeForDeletion(nodeWorkingCopy.id);

  return updatedMergedNode;
}

// --- End CoW Merge Implementations ---

// --- Start CoW Borrow Implementations ---

export function borrow_from_left_cow<T, K extends ValueType>(
  nodeWorkingCopy: Node<T, K>,
  leftSiblingWorkingCopy: Node<T, K>,
  parentWorkingCopy: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): { updatedNode: Node<T, K>; updatedLeftSibling: Node<T, K>; updatedParent: Node<T, K> } {
  if (!leftSiblingWorkingCopy.leaf !== !nodeWorkingCopy.leaf) {
    throw new Error('borrow_from_left_cow: Siblings must both be leaves or both be internal nodes.');
  }

  // Ensure all participating nodes are fresh working copies for this operation
  let fNode = Node.copy(nodeWorkingCopy, transactionContext);
  let fLeftSibling = Node.copy(leftSiblingWorkingCopy, transactionContext);
  let fParent = Node.copy(parentWorkingCopy, transactionContext);

  if (fNode.leaf && fLeftSibling.leaf) {
    // LEAF NODE BORROW
    if (fLeftSibling.key_num <= fLeftSibling.t - 1) {
      throw new Error("[borrow_from_left_cow] Left sibling does not have enough keys to borrow for a leaf.");
    }

    // 1. Move the last key/pointer from fLeftSibling to the beginning of fNode
    const borrowedKey = fLeftSibling.keys.pop()!;
    const borrowedPointer = fLeftSibling.pointers.pop()!;

    fNode.keys.unshift(borrowedKey);
    fNode.pointers.unshift(borrowedPointer);

    // 2. Update states and min/max for the modified node and its sibling
    // CRITICAL FIX: Mark nodes to skip parent separator updates since we handle them manually
    (fNode as any)._skipParentSeparatorUpdate = true;
    (fLeftSibling as any)._skipParentSeparatorUpdate = true;

    // These return new copies
    let updatedNode = update_state_immutable(fNode, transactionContext);
    updatedNode = update_min_max_immutable(updatedNode, transactionContext);

    let updatedLeftSibling = update_state_immutable(fLeftSibling, transactionContext);
    updatedLeftSibling = update_min_max_immutable(updatedLeftSibling, transactionContext);

    // 3. Update the separator key in the parent
    // Find node index in parent - try multiple approaches to handle CoW ID mismatches
    const nodeOriginalId = (nodeWorkingCopy as any)._originalNodeId || nodeWorkingCopy.id;
    let nodeIndexInParent = fParent.children.indexOf(nodeOriginalId);

    // If not found by original ID, try current working copy ID
    if (nodeIndexInParent === -1) {
      nodeIndexInParent = fParent.children.indexOf(nodeWorkingCopy.id);
    }

    // If still not found, search for working copy relationships
    if (nodeIndexInParent === -1) {
      for (let i = 0; i < fParent.children.length; i++) {
        const childIdInParent = fParent.children[i];
        // Check if there's a working copy that has this childIdInParent as its original
        for (const workingNode of transactionContext.workingNodes.values()) {
          const workingOriginalId = (workingNode as any)._originalNodeId;
          if (workingOriginalId === childIdInParent &&
              (workingNode.id === nodeWorkingCopy.id || workingNode === nodeWorkingCopy)) {
            nodeIndexInParent = i;
            break;
          }
        }
        if (nodeIndexInParent !== -1) break;
      }
    }

    if (nodeIndexInParent === -1) {
      throw new Error(`[borrow_from_left_cow] Node ID (${nodeWorkingCopy.id}, original: ${nodeOriginalId}) not found in parent ${fParent.id} children: [${fParent.children.join(",")}]`);
    }
    if (nodeIndexInParent === 0) {
        throw new Error("[borrow_from_left_cow] Cannot borrow from left if node is the first child.");
    }
    const separatorIndex = nodeIndexInParent - 1;
    if (separatorIndex < 0 || separatorIndex >= fParent.keys.length) {
        throw new Error(`[borrow_from_left_cow] Invalid separator index ${separatorIndex} for parent ${fParent.id} with ${fParent.keys.length} keys. Node index: ${nodeIndexInParent}`);
    }

    const newParentKeys = [...fParent.keys];
    newParentKeys[separatorIndex] = borrowedKey;
    // console.log(`[borrow_from_left_cow] Parent ${fParent.id} (orig ID ${parentWorkingCopy.id}) keys BEFORE update: [${fParent.keys.join(',')}]`);
    fParent.keys = newParentKeys;
    // console.log(`[borrow_from_left_cow] Parent ${fParent.id} keys AFTER direct update to '${borrowedKey}' at index ${separatorIndex}: [${fParent.keys.join(',')}]`);

    // Also, update parent's children array to point to the NEW IDs of the working copies
    // The original parent copy fParent might have children IDs that are original, not working copies.
    // We need to ensure we're updating the correct slots with the new working copy IDs.
    fParent.children[nodeIndexInParent] = updatedNode.id;
    fParent.children[separatorIndex] = updatedLeftSibling.id;

    // CRITICAL FIX: Skip automatic min/max propagation since we manually updated separator
    (fParent as any)._skipAutoMinMaxUpdate = true;

    let updatedParent = update_state_immutable(fParent, transactionContext);
    // Skip update_min_max_immutable for parent to prevent double separator updates
    // updatedParent = update_min_max_immutable(updatedParent, transactionContext);
    // console.log(`[borrow_from_left_cow] Parent ${updatedParent.id} keys AFTER state update (skipped minmax): [${updatedParent.keys.join(',')}]`);

    // 4. Ensure parent pointers of children are to the latest parent version
    // This step is crucial and might involve creating new copies of children if they are not already the latest.
    // For simplicity in this step, we directly assign. A more robust solution might re-copy if not latest.
    const finalUpdatedNode = transactionContext.getWorkingNode(updatedNode.id) || updatedNode;
    const finalUpdatedLeftSibling = transactionContext.getWorkingNode(updatedLeftSibling.id) || updatedLeftSibling;

    finalUpdatedNode._parent = updatedParent.id;
    finalUpdatedLeftSibling._parent = updatedParent.id;

    // If updatedNode or updatedLeftSibling were further copied by min_max updates inside their parent update,
    // we need to ensure we return the ABSOLUTELY final versions from the transaction context.
    // However, the parent update (updatedParent) should be the one dictating the parent ID.

    return {
      updatedNode: finalUpdatedNode, // Return the actual working copies
      updatedLeftSibling: finalUpdatedLeftSibling,
      updatedParent: updatedParent
    };

  } else if (!fNode.leaf && !fLeftSibling.leaf) {
    // INTERNAL NODE BORROW (placeholder for now)
    // console.warn("[borrow_from_left_cow] CoW Borrow from left for INTERNAL nodes is not yet implemented.");
    // Return copies based on the initial copies to satisfy types temporarily.
    return { updatedNode: fNode, updatedLeftSibling: fLeftSibling, updatedParent: fParent };
  } else {
    throw new Error("[borrow_from_left_cow] Mismatched node types (leaf/internal) for borrow operation.");
  }
}

export function borrow_from_right_cow<T, K extends ValueType>(
  nodeWorkingCopy: Node<T, K>,
  rightSiblingWorkingCopy: Node<T, K>,
  parentWorkingCopy: Node<T, K>,
  transactionContext: ITransactionContext<T, K>
): { updatedNode: Node<T, K>; updatedRightSibling: Node<T, K>; updatedParent: Node<T, K> } {
  if (!rightSiblingWorkingCopy.leaf !== !nodeWorkingCopy.leaf) {
    throw new Error('borrow_from_right_cow: Siblings must both be leaves or both be internal nodes.');
  }

  // Ensure all participating nodes are fresh working copies for this operation
  let fNode = Node.copy(nodeWorkingCopy, transactionContext);
  let fRightSibling = Node.copy(rightSiblingWorkingCopy, transactionContext);
  let fParent = Node.copy(parentWorkingCopy, transactionContext);

  if (fNode.leaf && fRightSibling.leaf) {
    // LEAF NODE BORROW
    if (fRightSibling.key_num <= fRightSibling.t - 1) {
      throw new Error("[borrow_from_right_cow] Right sibling does not have enough keys to borrow for a leaf.");
    }

    // 1. Move the first key/pointer from fRightSibling to the end of fNode
    const borrowedKey = fRightSibling.keys.shift()!;
    const borrowedPointer = fRightSibling.pointers.shift()!;

    fNode.keys.push(borrowedKey);
    fNode.pointers.push(borrowedPointer);

    // 2. Update states and min/max for the modified node and its sibling
    // CRITICAL FIX: Mark nodes to skip parent separator updates since we handle them manually
    (fNode as any)._skipParentSeparatorUpdate = true;
    (fRightSibling as any)._skipParentSeparatorUpdate = true;

    let updatedNode = update_state_immutable(fNode, transactionContext);
    updatedNode = update_min_max_immutable(updatedNode, transactionContext);

    let updatedRightSibling = update_state_immutable(fRightSibling, transactionContext);
    updatedRightSibling = update_min_max_immutable(updatedRightSibling, transactionContext);

    // 3. Update the separator key in the parent
    // Find node index in parent - try multiple approaches to handle CoW ID mismatches
    const nodeOriginalId = (nodeWorkingCopy as any)._originalNodeId || nodeWorkingCopy.id;
    let nodeIndexInParent = fParent.children.indexOf(nodeOriginalId);

    // If not found by original ID, try current working copy ID
    if (nodeIndexInParent === -1) {
      nodeIndexInParent = fParent.children.indexOf(nodeWorkingCopy.id);
    }

    // If still not found, search for working copy relationships
    if (nodeIndexInParent === -1) {
      for (let i = 0; i < fParent.children.length; i++) {
        const childIdInParent = fParent.children[i];
        // Check if there's a working copy that has this childIdInParent as its original
        for (const workingNode of transactionContext.workingNodes.values()) {
          const workingOriginalId = (workingNode as any)._originalNodeId;
          if (workingOriginalId === childIdInParent &&
              (workingNode.id === nodeWorkingCopy.id || workingNode === nodeWorkingCopy)) {
            nodeIndexInParent = i;
            break;
          }
        }
        if (nodeIndexInParent !== -1) break;
      }
    }

    if (nodeIndexInParent === -1) {
      throw new Error(`[borrow_from_right_cow] Node ID (${nodeWorkingCopy.id}, original: ${nodeOriginalId}) not found in parent ${fParent.id} children: [${fParent.children.join(",")}]`);
    }
    if (nodeIndexInParent >= fParent.keys.length) { // Separator is at nodeIndexInParent if node is not the last child
        throw new Error(`[borrow_from_right_cow] Invalid separator index ${nodeIndexInParent} for parent ${fParent.id} with ${fParent.keys.length} keys. Node cannot be the last child to borrow from right.`);
    }
    const separatorIndex = nodeIndexInParent;

    const newParentKeys = [...fParent.keys];
    // The new separator is the new minimum key of the right sibling (after it gave away its first key)
    const newSeparatorKeyValue = updatedRightSibling.min; // Store it before logging potentially undefined
    // console.log(`[borrow_from_right_cow] Parent ${fParent.id} (orig ID ${parentWorkingCopy.id}) keys BEFORE update: [${fParent.keys.join(',')}]`);
    // console.log(`[borrow_from_right_cow] Separator index: ${separatorIndex}, new separator value (updatedRightSibling.min): ${newSeparatorKeyValue}`);
    newParentKeys[separatorIndex] = newSeparatorKeyValue!; // Use non-null assertion if confident it's defined
    fParent.keys = newParentKeys;
    // console.log(`[borrow_from_right_cow] Parent ${fParent.id} keys AFTER direct update to '${newSeparatorKeyValue}' at index ${separatorIndex}: [${fParent.keys.join(',')}]`);

    // Update parent's children array to point to the NEW IDs of the working copies
    fParent.children[nodeIndexInParent] = updatedNode.id;
    fParent.children[nodeIndexInParent + 1] = updatedRightSibling.id;

    // CRITICAL FIX: Skip automatic min/max propagation since we manually updated separator
    (fParent as any)._skipAutoMinMaxUpdate = true;

    let updatedParent = update_state_immutable(fParent, transactionContext);
    // Skip update_min_max_immutable for parent to prevent double separator updates
    // updatedParent = update_min_max_immutable(updatedParent, transactionContext);
    // console.log(`[borrow_from_right_cow] Parent ${updatedParent.id} keys AFTER state update (skipped minmax): [${updatedParent.keys.join(',')}]`);

    // 4. Ensure parent pointers of children are to the latest parent version
    const finalUpdatedNode = transactionContext.getWorkingNode(updatedNode.id) || updatedNode;
    const finalUpdatedRightSibling = transactionContext.getWorkingNode(updatedRightSibling.id) || updatedRightSibling;

    finalUpdatedNode._parent = updatedParent.id;
    finalUpdatedRightSibling._parent = updatedParent.id;

    return {
      updatedNode: finalUpdatedNode,
      updatedRightSibling: finalUpdatedRightSibling,
      updatedParent: updatedParent
    };

  } else if (!fNode.leaf && !fRightSibling.leaf) {
    // INTERNAL NODE BORROW (placeholder for now)
    // console.warn("[borrow_from_right_cow] CoW Borrow from right for INTERNAL nodes is not yet implemented.");
    return { updatedNode: fNode, updatedRightSibling: fRightSibling, updatedParent: fParent };
  } else {
    throw new Error("[borrow_from_right_cow] Mismatched node types (leaf/internal) for borrow operation.");
  }
}

// --- End CoW Borrow Implementations ---
