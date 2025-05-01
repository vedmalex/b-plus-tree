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
  let removedKey = null; // Variable to store the removed key for logging
  if (pos == 0) {
    // If removing the first child, remove the key *after* it (which is the first key)
    if (obj.keys.length > 0) { // Check if there are keys to remove
       removedKey = obj.keys.shift();
    }
  } else {
    // If removing non-first child, remove the key *before* it
    removedKey = obj.keys.splice(pos - 1, 1)[0]; // Get the removed key
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
    const effectiveKey = key; // Use the key passed in (might be undefined)

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
  const parentId = node.parent?.id; // Get parent ID before potential changes
  if (node.leaf) {
    const originalNodeKeys = [...node.keys];
    const originalSiblingKeys = [...right_sibling.keys];

    const siblingKeys = right_sibling.keys.splice(0);
    const siblingPointers = right_sibling.pointers.splice(0);
    node.keys.push(...siblingKeys);
    node.pointers.push(...siblingPointers);

    update_state(node);
    update_state(right_sibling);
    update_min_max(node);
  } else { // Internal node case
    const originalNodeKeys = [...node.keys];
    const originalNodeChildren = [...node.children];

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
