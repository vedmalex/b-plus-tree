import { BPlusTree } from './BPlusTree'
import { Cursor } from './eval'
import { sourceEq } from './source'
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
  unregister_node
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
  console.log(`[COUNT] Checking node ${node.id} (leaf=${node.leaf}) for key ${JSON.stringify(key)}`);

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
    console.log(`[COUNT] Found ${totalCount} matches in leaf node ${node.id}`);
    return totalCount;
  } else {
    // Internal node: Sum counts from relevant children
    let totalCount = 0;
    console.log(`[COUNT] Internal node ${node.id}. Checking children: ${JSON.stringify(node.children)}`);
    for (let i = 0; i < node.children.length; i++) {
      const childNodeId = node.children[i];
      const childNode = node.tree.nodes.get(childNodeId);
      if (!childNode) continue;
      console.log(`[COUNT] Checking child ${childNode.id} (min=${JSON.stringify(childNode.min)}, max=${JSON.stringify(childNode.max)})`);

      // --- REVISED LOGIC for checking child range ---
      const childMin = childNode.min;
      const childMax = childNode.max;

      // Skip if the node is completely empty (both min and max are undefined)
      if (childMin === undefined && childMax === undefined) {
          console.log(`[COUNT] Skipping empty child ${childNode.id}`);
          continue;
      }

      // Skip if the search key is strictly less than the child's minimum (if defined)
      if (childMin !== undefined && comparator(searchKey, childMin) < 0) {
          console.log(`[COUNT] Skipping child ${childNode.id} because key < min`);
          continue;
      }

      // Skip if the search key is strictly greater than the child's maximum (if defined)
      if (childMax !== undefined && comparator(searchKey, childMax) > 0) {
          console.log(`[COUNT] Skipping child ${childNode.id} because key > max`);
          continue;
      }

      // In all other cases (key is within defined [min, max], or min/max is undefined),
      // we must descend into the child node as the key might be present.
      console.log(`[COUNT] Descending into child ${childNode.id}`);
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
    console.log(`[COUNT] Total ${totalCount} matches found under internal node ${node.id}`);
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
    // Удаляем все в цикле
    let changed = false;
    while (true) {
      const pos = find_first_item(node.keys, key, tree.comparator);
      if (pos > -1) {
          result.push([node.keys[pos], node.pointers.splice(pos, 1)[0]]);
          node.keys.splice(pos, 1);
          changed = true; // Отмечаем, что узел изменился
          // update_state(node); // Не нужно обновлять состояние в цикле
      } else {
          break; // Выходим, если ключ больше не найден
      }
    }
    if (changed) {
        update_state(node); // Обновляем состояние ОДИН раз после цикла
        update_min_max(node); // Обновляем min/max ОДИН раз после цикла
    }

    // Check the right sibling for more duplicates
    const rightSibling = node.right; // Get sibling before potential reflow changes structure
    // CORRECTED SIBLING CHECK: Check if key >= sibling.min
    if (rightSibling && tree.comparator(key, rightSibling.min) >= 0) {
      // Recursively delete from the right sibling and append results
      const siblingResults = delete_in_node(tree, rightSibling, key, true);
      result.push(...siblingResults);
    }

    // Call reflow AFTER checking/deleting from siblings, only if the original node changed.
    if (changed) {
        reflow(tree, node);
    }

  } else {
    // Удаляем только ПЕРВЫЙ найденный
    const pos = find_first_item(node.keys, key, tree.comparator); // Ищем ПЕРВЫЙ
    if (pos > -1) {
        const removedValue = node.pointers.splice(pos, 1)[0];
        const removedKey = node.keys.splice(pos, 1)[0];
        result.push([removedKey, removedValue]);
        update_state(node); // Обновляем состояние узла
        update_min_max(node); // Обновляем min/max узла
        // Call reflow AFTER state updates if changes were made
        reflow(tree, node);
    } else {
      // Key not found in the initial node. Check the right sibling.
      const rightSibling = node.right;
      if (rightSibling && tree.comparator(key, rightSibling.min) >= 0) {
          // Try deleting from the right sibling instead
          console.log(`[REMOVE SINGLE] Key ${key} not found in node ${node.id}, trying right sibling ${rightSibling.id} because key >= sibling.min`);
          // Call delete_in_node on the sibling, still with all=false
          return delete_in_node(tree, rightSibling, key, false);
      }
      // If not found in initial node AND not in right sibling's min range, return empty
      return result; // Возвращаем пустой массив, если ничего не удалено
    }
  }

  // try_to_pull_up_tree вызывается в конце reflow, если нужно

  // Validate the node after potential changes and reflow
  runValidation(node, 'delete_in_node');

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
        console.error(`[VALIDATION FAIL] ${operationName} on Node ${node.id}:`, errors);
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
  // console.log(`[REFLOW START] Node ID: ${node.id}, Leaf: ${node.leaf}, Keys: ${node.key_num}, MinKeys: ${node.t}, Parent: ${node._parent}`);

  // Check if the node has fallen below the minimum number of keys
  // Root node has special handling (can have < t keys)
  if (node.id !== tree.root && node.key_num < node.t) {
    // console.log(`[REFLOW UNDERFLOW] Node ${node.id} has underflow (${node.key_num} < ${node.t}). Attempting rebalancing.`);
    const parent = node.parent;
    if (!parent) {
        // console.warn(`[REFLOW] Node ${node.id} has underflow but no parent (and is not root). This should not happen.`);
        // If it's not the root and has no parent, something is wrong.
        // But we can't reflow further up. Commit node state as is?
        node.commit();
        return;
    }

    const left_sibling = node.left;
    const right_sibling = node.right;

    // console.log(`[REFLOW SIBLINGS] Node ${node.id}: Left=${left_sibling?.id}, Right=${right_sibling?.id}`);

    // Prioritize borrowing over merging
    // Try borrowing from left sibling
    if (left_sibling && left_sibling.key_num > left_sibling.t - 1) {
      // console.log(`[REFLOW BORROW LEFT] Attempting to borrow from left sibling ${left_sibling.id} (keys: ${left_sibling.key_num})`);
      borrow_from_left(node, left_sibling);
      // console.log(`[REFLOW BORROW LEFT DONE] Node ${node.id} keys after borrow: ${node.key_num}`);
      // Update parent separator key? borrow_from_left should handle this.
      // update_min_max(parent); // Parent's structure didn't change, but separator might. Borrow handles this.
      node.commit(); // Node is balanced now
      left_sibling.commit(); // Sibling state changed
      parent.commit(); // Parent separator changed
      return; // Node is balanced
    }

    // Try borrowing from right sibling
    if (right_sibling && right_sibling.key_num > right_sibling.t - 1) {
      // console.log(`[REFLOW BORROW RIGHT] Attempting to borrow from right sibling ${right_sibling.id} (keys: ${right_sibling.key_num})`);
      borrow_from_right(node, right_sibling);
      // console.log(`[REFLOW BORROW RIGHT DONE] Node ${node.id} keys after borrow: ${node.key_num}`);
      // Update parent separator key? borrow_from_right should handle this.
      // update_min_max(parent);
      node.commit(); // Node is balanced now
      right_sibling.commit(); // Sibling state changed
      parent.commit(); // Parent separator changed
      return; // Node is balanced
    }

    // If borrowing failed, try merging
    // console.log(`[REFLOW MERGE] Borrowing failed for node ${node.id}. Attempting merge.`);

    // Try merging with left sibling
    if (left_sibling) {
      const nodeIndex = parent.children.indexOf(node.id);
      if (nodeIndex > 0) { // Ensure there is a separator key to the left in the parent
        const separatorKey = parent.keys[nodeIndex - 1];
        // console.log(`[REFLOW MERGE LEFT] Merging node ${node.id} with left sibling ${left_sibling.id}. Separator: ${JSON.stringify(separatorKey)}`);
        // console.log(`  Node ${node.id} keys BEFORE merge: ${JSON.stringify(node.keys)}`);
        // console.log(`  Left sibling ${left_sibling.id} keys BEFORE merge: ${JSON.stringify(left_sibling.keys)}`);

        merge_with_left(node, left_sibling, separatorKey); // node absorbs left_sibling

        // Лог после правильного слияния
        // console.log(`  Node ${node.id} keys AFTER merge: ${JSON.stringify(node.keys)}`); // Обновленный лог

        // Удаляем left_sibling из родителя
        remove_node(parent, left_sibling);
        // console.log(`[REFLOW MERGE LEFT] Removed node ${left_sibling.id} from parent ${parent.id}. Parent children: ${parent.children.length}`);

        // Обновляем min/max объединенного узла (node)
        update_min_max(node);

        // Удаляем left_sibling из карты узлов
        left_sibling.delete(tree); // This already calls unregister_node
        // console.log(`[REFLOW MERGE LEFT] Deleted node ${left_sibling.id} from tree map.`);

        // Коммитим объединенный узел (node)
        node.commit(); // Commit the merged node (node)
        // Parent structure changed, need to reflow parent
        // console.log(`[REFLOW MERGE LEFT] Triggering reflow for parent ${parent.id}`);
        reflow(tree, parent);
        return; // Reflow continues up the tree
      } else {
        // console.warn(`[REFLOW MERGE LEFT] Cannot merge node ${node.id} with left sibling: node is the first child.`);
        node.commit(); // Commit as is if merge wasn't possible
      }
    }
    // Try merging with right sibling
    else if (right_sibling) {
      const nodeIndex = parent.children.indexOf(node.id);
      if (nodeIndex < parent.keys.length) { // Ensure there is a separator key to the right in the parent
        const separatorKey = parent.keys[nodeIndex];
        // console.log(`[REFLOW MERGE RIGHT] Merging node ${node.id} with right sibling ${right_sibling.id}. Separator: ${JSON.stringify(separatorKey)}`);
        // console.log(`  Node ${node.id} keys BEFORE merge: ${JSON.stringify(node.keys)}`);
        // console.log(`  Right sibling ${right_sibling.id} keys BEFORE merge: ${JSON.stringify(right_sibling.keys)}`);

        // Merge `right_sibling` INTO `node`
        merge_with_right(node, right_sibling, separatorKey);
        // console.log(`  Node ${node.id} keys AFTER merge: ${JSON.stringify(node.keys)}`); // <-- УДАЛЯЕМ ЭТОТ ЛОГ

        remove_node(parent, right_sibling); // Remove right sibling from parent
        // console.log(`[REFLOW MERGE RIGHT] Removed node ${right_sibling.id} from parent ${parent.id}. Parent children: ${parent.children.length}`);

        // Sibling pointers updated by merge_with_right and remove_node
        update_min_max(node); // Update merged node's min/max

        // Node 'right_sibling' is now gone conceptually, delete it from the tree's node map
        right_sibling.delete(tree); // This already calls unregister_node
        // console.log(`[REFLOW MERGE RIGHT] Deleted node ${right_sibling.id} from tree map.`);

        node.commit(); // Commit the merged node
        // Parent structure changed, need to reflow parent
        // console.log(`[REFLOW MERGE RIGHT] Triggering reflow for parent ${parent.id}`);
        reflow(tree, parent);
        return; // Reflow continues up the tree
      } else {
        // console.warn(`[REFLOW MERGE RIGHT] Cannot merge node ${node.id} with right sibling: node is the last child or keys index issue.`);
        node.commit(); // Commit as is if merge wasn't possible
      }
    }
    // Special case: If node is empty, it has no siblings it could merge with,
    // and it's not the root, it might be the last child of its parent after other merges.
    // The parent reflow should handle removing the parent if needed.
    else if (node.isEmpty && parent && parent.children.length === 1 && parent.children[0] === node.id) {
         // console.log(`[REFLOW EMPTY LAST CHILD] Node ${node.id} is empty and the last child of parent ${parent.id}. Removing node and reflowing parent.`);
         remove_node(parent, node); // Remove the empty node from parent
         node.delete(tree); // Delete the node itself
         // console.log(`[REFLOW EMPTY LAST CHILD] Triggering reflow for parent ${parent.id}`);
         reflow(tree, parent); // Reflow the parent, which might become empty or need merging
         return;
    } else {
      // Should not happen if node has underflow but siblings exist or it's root
       // console.warn(`[REFLOW] Unhandled merge/borrow scenario for node ${node.id}. Node state: keys=${node.key_num}, parent=${parent?.id}, left=${left_sibling?.id}, right=${right_sibling?.id}`);
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

  // Опционально: обработка null -> defaultEmpty (если нужно для компаратора)
  const finalKey = searchKey; // Пока используем searchKey

  // Add specific log for the problematic test case keys
  /* // Remove log
  if (typeof finalKey === 'number' && (finalKey === 1 || finalKey === 2)) {
      console.log(`[REMOVE TEST] Removing key: ${finalKey}, all=${all}`);
  }
  */

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
    if (!leaf) {
        // console.log(`[remove single] Leaf not found or empty.`); // Remove log
        return [];
    }
    // --- SIMPLIFIED LOGIC ---
    // Directly call delete_in_node. It will handle finding the item
    // and checking the right sibling if necessary.
    return delete_in_node(tree, leaf, finalKey, false);

    /* // REMOVED REDUNDANT LOGIC
    const remove_pos = find_first_item(leaf.keys, finalKey, tree.comparator);
    if (remove_pos > -1) {
        console.log(`[REMOVE SINGLE] Attempting deletion in node ${leaf.id} at pos ${remove_pos} for key ${JSON.stringify(finalKey)}`);
        return delete_in_node(tree, leaf, finalKey, false);
    } else {
      const rightSibling = leaf.right;
      if (rightSibling && tree.comparator(finalKey, rightSibling.min) === 0) {
          console.log(`[REMOVE SINGLE] Key ${finalKey} not found in node ${leaf.id}, trying right sibling ${rightSibling.id}`);
          return delete_in_node(tree, rightSibling, finalKey, false);
      }
      return [];
    }
    */
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

  // Calculate split point (middle key)
  const splitIndex = Math.floor(node.key_num / 2); // Index of the key to move up (for internal nodes) or copy up (for leaf nodes)
  let middleKey: K; // Key that moves up (internal) or is copied up (leaf)

  // Move the second half of keys and pointers/children to the new node
  if (node.leaf) {
    // For leaf nodes, the key at the split index is COPIED up.
    // Keys/pointers from splitIndex onwards are moved to the new node.
    middleKey = node.keys[splitIndex]; // This key is copied up (value doesn't matter here)
    const splitKeyIndex = splitIndex; // Start moving from this index
    new_node.keys = node.keys.splice(splitKeyIndex);
    new_node.pointers = node.pointers.splice(splitKeyIndex);
    // Note: middleKey remains in new_node.keys[0]
  } else {
    // For internal nodes, the key at splitIndex MOVES up.
    // Keys *after* splitIndex and children from splitIndex+1 are moved.
    middleKey = node.keys[splitIndex]; // This key MOVES up
    new_node.keys = node.keys.splice(splitIndex + 1);
    new_node.children = node.children.splice(splitIndex + 1);
    // Re-assign parent for moved children
    new_node.children.forEach(childId => {
        const childNode = tree.nodes.get(childId);
        if (childNode) childNode.parent = new_node;
    });
  }

  // Key at splitIndex is removed from original node only for internal nodes,
  // as it moves up to the parent.
  if (!node.leaf) {
      node.keys.splice(splitIndex); // Remove the key that moved up and keys after it
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


  // Insert the middle key into the parent or create a new root
  if (node.id == tree.root) {
    // console.log(`[split] Node ${node.id} is root. Creating new root.`);
    // For the new root, the key *must* be the minimum of the right child (new_node)
    const newRoot = Node.createRootFrom(tree, node, new_node);
    // Ensure the key in the new root is correct
    newRoot.keys = [new_node.min]; // Set root key to min of the right child
    update_state(newRoot);
    update_min_max(newRoot);

    tree.root = newRoot.id;
    // console.log(`[split] New root is ${newRoot.id} with key ${newRoot.keys[0]}`);
  } else {
    const parent = node.parent;
    // --- CORRECTED: Use new_node.min as the key to insert into the parent ---
    const keyToInsert = new_node.min;
    // const keyToInsert = middleKey; // Use the stored middleKey for both cases now <-- INCORRECT
    // console.log(`[split] Inserting key ${keyToInsert} (new_node.min) into parent ${parent.id}`);
    // attach_one_to_right_after(parent, new_node, node); // This function needs the key to insert
    // Let's modify attach_one_to_right_after or insert into parent here

    // --- CORRECTED LOGIC for inserting into parent ---
    // Find the correct position to insert the keyToInsert (new_node.min)
    const keyInsertPos = find_first_key(parent.keys, keyToInsert, tree.comparator);
    parent.keys.splice(keyInsertPos, 0, keyToInsert);

    // Find the index of the original node (node) in the parent's children array
    const nodeIndexInParent = parent.children.indexOf(node.id);
    if (nodeIndexInParent !== -1) {
        // Insert the new_node's ID into the parent's children array immediately after the original node
        parent.children.splice(nodeIndexInParent + 1, 0, new_node.id);
    } else {
        // This should ideally not happen if the tree structure is consistent
        console.error(`[split] FATAL Error: Node ${node.id} not found in parent ${parent.id}'s children during split.`);
        // Handle error appropriately, maybe throw or try to recover
        // For now, log the error and proceed cautiously
    }
    // --- END CORRECTED LOGIC ---

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
  // Validate nodes involved in the split (original, new, potentially new root)
  runValidation(node, 'split_node_final');
  runValidation(new_node, 'split_new_node_final');
  // If a new root was created, it doesn't need explicit validation here,
  // as it was created from validated children.
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

    // Update parent separator key
    parent.keys[separatorIndex] = node.keys[0];

  } else {
    // Move separator key from parent to the beginning of node keys
    const parentSeparator = parent.keys[separatorIndex];
    node.keys.unshift(parentSeparator);

    // Move last child from left sibling to the beginning of node children
    const borrowedChildId = left_sibling.children.pop();
    node.children.unshift(borrowedChildId);
    const borrowedChildNode = node.tree.nodes.get(borrowedChildId);
    if (borrowedChildNode) borrowedChildNode.parent = node;

    // --- CORRECTED: Update parent separator key AFTER node is updated ---
    // First update the node that received the borrowed child
    update_state(node);
    update_min_max(node); // node.min should now be correct

    // Now update the parent's separator key to the new minimum of the node
    parent.keys[separatorIndex] = node.min;
    // parent.keys[separatorIndex] = left_sibling.keys.pop(); // <-- INCORRECT LOGIC

    // Update the sibling node AFTER popping its key/child implicitly via update_min_max later
    // update_state(left_sibling);
    // update_min_max(left_sibling);

    // Remove the corresponding key from left_sibling *before* updating its state
    // Note: The key to remove is the *new* last key after pop() if the state wasn't updated yet.
    // This seems overly complex. Let's recalculate left_sibling state completely.
    left_sibling.keys.pop(); // Remove the key corresponding to the moved child

  }

  // Update states
  // update_state(node); // Already updated for internal node case
  // update_min_max(node);
  update_state(left_sibling); // Update sibling state now
  update_min_max(left_sibling); // Update sibling min/max now
  // Parent's keys changed, min/max might need update if borrowed key was min/max
  update_min_max(parent); // Simpler to just update parent's min/max
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
    // console.log(`[BORROW RIGHT] Entering: Node ${node.id} (keys=${JSON.stringify(node.keys)}) borrows from Right ${right_sibling.id} (keys=${JSON.stringify(right_sibling.keys)}). Parent: ${parent?.id}`); // Remove log
    if (!parent) return;

    const childIndex = parent.children.indexOf(node.id);
    const separatorIndex = childIndex;

    if (node.leaf) {
        // Move first key/pointer from right sibling to the end of node
        const borrowedKey = right_sibling.keys.shift();
        const borrowedPointer = right_sibling.pointers.shift();
        node.keys.push(borrowedKey);
        node.pointers.push(borrowedPointer);

        // console.log(`[BORROW RIGHT LEAF] Node ${node.id} received key ${borrowedKey}. Right sib keys now: ${JSON.stringify(right_sibling.keys)}`); // Remove log
        // Update parent separator key to the new first key of the right sibling
        // Ensure right_sibling is not empty before accessing keys[0]
        if (right_sibling.key_num > 0) {
            parent.keys[separatorIndex] = right_sibling.keys[0]; // <-- CORRECT LOGIC
        } else {
            // This case might happen if right_sibling had exactly t keys and gave one.
            // The parent separator should effectively be removed or updated by reflow/merge later.
            // For now, maybe set it based on the new max of the node that borrowed?
            // Let's stick to the most likely correct logic: use right_sibling's new min.
             // If right sibling became empty, the separator logic is complex and might need
             // adjustment in the calling reflow function based on whether a merge happens next.
             // Let's assume for now right_sibling won't become completely empty just from borrowing one.
             // A safer approach might be needed if tests fail here.
             if (right_sibling.keys.length > 0) { // Double check for safety
                parent.keys[separatorIndex] = right_sibling.keys[0];
             } else {
                // TODO: Handle the edge case where right sibling becomes empty after borrow.
                // This likely requires reflow to handle the merge immediately after.
                // For now, we might leave the parent key as is, anticipating a merge.
             }
        }
        // const oldParentKey = parent.keys[separatorIndex]; // Keep for potential debugging
        // console.log(`[BORROW RIGHT LEAF] Parent ${parent.id} key at index ${separatorIndex} changed from ${oldParentKey} to ${parent.keys[separatorIndex]}`); // Remove log

    } else {
        // Move separator key from parent to the end of node keys
        const parentSeparator = parent.keys[separatorIndex];
        node.keys.push(parentSeparator);

        // Move first child from right sibling to the end of node children
        const borrowedChildId = right_sibling.children.shift();
        node.children.push(borrowedChildId);
        const borrowedChildNode = node.tree.nodes.get(borrowedChildId);
        if (borrowedChildNode) borrowedChildNode.parent = node;

        // Move first key from right sibling up to parent as new separator
        // parent.keys[separatorIndex] = right_sibling.keys.shift(); // <-- INCORRECT LOGIC
        // --- CORRECTED: Update parent separator key AFTER sibling is updated ---
        // First, remove the key from the sibling (corresponding to the moved child)
        right_sibling.keys.shift();

        // Update the node that received the data
        update_state(node);
        update_min_max(node);

        // Update the sibling that gave the data
        update_state(right_sibling);
        update_min_max(right_sibling); // right_sibling.min is now correct

        // Now update the parent separator key
        parent.keys[separatorIndex] = right_sibling.min;

    }

    // Update states
    // update_state(node); // Already updated
    // update_min_max(node); // Already updated
    // update_state(right_sibling); // Already updated
    // update_min_max(right_sibling); // Already updated
    // Parent's keys changed, min/max might need update
    update_min_max(parent);
    node.commit()
    right_sibling.commit()
    parent.commit()

    // Validate involved nodes
    runValidation(node, 'borrow_from_right');
    runValidation(right_sibling, 'borrow_from_right_sibling');
    runValidation(parent, 'borrow_from_right_parent');
}
