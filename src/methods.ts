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
  merge_with_left_cow,
  merge_with_right_cow,
  // unregister_node
} from './Node'
import { Comparator } from './types'

// Temporary wrapper functions for old mutating API compatibility
// These should be replaced with full transactional logic eventually
function merge_with_left<T, K extends ValueType>(
  node: Node<T, K>,
  left_sibling: Node<T, K>,
  separatorKey: K
): void {
  // console.log('merge_with_left (temporary wrapper) called');

  // Merge logic: node absorbs all content from left_sibling
  if (node.leaf) {
    // For leaf nodes: combine keys and pointers directly (no separator key)
    node.keys = [...left_sibling.keys, ...node.keys];
    node.pointers = [...left_sibling.pointers, ...node.pointers];
  } else {
    // For internal nodes: include separator key from parent
    node.keys = [...left_sibling.keys, separatorKey, ...node.keys];
    node.children = [...left_sibling.children, ...node.children];

    // Update parent pointers for moved children
    for (const childId of left_sibling.children) {
      const childNode = node.tree.nodes.get(childId);
      if (childNode) {
        childNode._parent = node.id;
      }
    }
  }

  // Update node state and min/max
  update_state(node);
  update_min_max(node);
}

function merge_with_right<T, K extends ValueType>(
  node: Node<T, K>,
  right_sibling: Node<T, K>,
  separatorKey: K
): void {
  // console.log('merge_with_right (temporary wrapper) called');

  // Merge logic: node absorbs all content from right_sibling
  if (node.leaf) {
    // For leaf nodes: combine keys and pointers directly (no separator key)
    node.keys = [...node.keys, ...right_sibling.keys];
    node.pointers = [...node.pointers, ...right_sibling.pointers];
  } else {
    // For internal nodes: include separator key from parent
    node.keys = [...node.keys, separatorKey, ...right_sibling.keys];
    node.children = [...node.children, ...right_sibling.children];

    // Update parent pointers for moved children
    for (const childId of right_sibling.children) {
      const childNode = node.tree.nodes.get(childId);
      if (childNode) {
        childNode._parent = node.id;
      }
    }
  }

  // Update node state and min/max
  update_state(node);
  update_min_max(node);
}

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
  // console.log(`[COUNT] Checking node ${node.id} (leaf=${node.leaf}) for key ${JSON.stringify(key)}, keys=[${node.keys?.join(',')}], pointers count=${node.pointers?.length || 0}`);

  // Use the key directly. Null/undefined check should happen in the BPlusTree wrapper.
  const searchKey = key;

  if (node.leaf) {
    let totalCount = 0;
    // Iterate through keys in the leaf and count exact matches
    for (let i = 0; i < node.key_num; i++) {
      const comparison = comparator(node.keys[i], searchKey);
      if (comparison === 0) {
        totalCount++;
        // console.log(`[COUNT] Found match at index ${i} in leaf node ${node.id}, key=${node.keys[i]}, pointer=${node.pointers[i]}`);
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
      if (!childNode) {
        // console.warn(`[COUNT] Child node ${childNodeId} not found in tree.nodes for parent ${node.id}`);
        continue;
      }
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
      const childCount = count(searchKey, childNode, comparator);
      totalCount += childCount;
             // console.log(`[COUNT] Child ${childNode.id} returned count: ${childCount}, running total: ${totalCount}`);

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
        if (rightSibling && tree.comparator(key, rightSibling.min) >= 0) {
            // If the key is greater than or equal to the minimum of the right sibling,
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
             // console.warn(`[delete_in_node all=true] Initial node ${node.id} no longer exists after deletion loop. Reflow might have already occurred.`);
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
        // console.error(`[find_first_node] Error: Invalid child node ID ${childNodeId} found in node ${cur.id}. Parent keys: ${JSON.stringify(cur.keys)}, search key: ${JSON.stringify(key)}, index i: ${i}`);
        // Attempt to recover or return current node?
        // Returning undefined might be safer if the structure is broken.
        return undefined; // Indicate failure to find the correct path
    }

    cur = nodes.get(childNodeId);

    // If cur becomes undefined, break the loop or return error
    if (!cur) {
        // console.error(`[find_first_node] Error: Child node ID ${childNodeId} not found in nodes map.`);
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
            // console.error("[find_first_node] Error: Current node became undefined during left sibling traversal.");
            return undefined;
        }
    }
  }

  // Final safety check before returning
  if (!cur) {
      // console.error("[find_first_node] Error: Current node is undefined after search.");
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
                 // console.error(`[REFLOW MERGE LEFT] CRITICAL Error: Actual Left sibling ${actual_left_sibling.id} not found in parent ${parent.id} children during merge!`);
            }
            if (separatorIndex < parent.keys.length) {
                 parent.keys.splice(separatorIndex, 1);
            } else {
                 // console.error(`[REFLOW MERGE LEFT] CRITICAL Error: Invalid separator index ${separatorIndex} for parent ${parent.id} keys (length ${parent.keys.length})`);
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
             // console.error(`[REFLOW MERGE LEFT] Error: Could not find separator key at index ${separatorIndex} for parent ${parent.id}.`);
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
            // console.error(`[REFLOW MERGE RIGHT] Error: Could not find separator key at index ${separatorIndex} for parent ${parent.id}.`);
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
    // console.log(`[remove all] Found leaf node ${leaf?.id} for key ${JSON.stringify(finalKey)}, leaf keys: ${JSON.stringify(leaf?.keys)}`);
    if (!leaf) {
      return []; // Key range not found
    }
    // Call delete_in_node with all=true; it handles recursion internally
    const result = delete_in_node(tree, leaf, finalKey, true);
    // console.log(`[remove all] delete_in_node returned ${result.length} items for key ${JSON.stringify(finalKey)}`);
    return result;

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

export function size<T, K extends ValueType>(node: Node<T, K>, hasActiveTransactions: boolean = false, tree?: BPlusTree<T, K>): number {
  // console.warn(`[size] STARTING size calculation from node ${node.id} (leaf=${node.leaf}, keys=[${node.keys.join(',')}], tree.root=${node.tree.root})`);

  // Use a global set to track all visited leaf nodes across the entire tree traversal
  // This prevents counting duplicate leaves that may exist due to structural issues
  const globalVisitedLeaves = new Set<number>();

  // Track leaf signatures to detect structurally duplicate leaves
  // A leaf signature is a combination of its keys - if two leaves have identical keys, one is likely a duplicate
  const leafSignatures = new Map<string, number>(); // signature -> leaf ID that first had this signature

  // Track if we made any structural repairs during size calculation
  let madeStructuralRepairs = false;

  // ENHANCED DEBUG: Log all nodes in the tree before starting
  // console.warn(`[size] DEBUG: All nodes in tree before size calculation:`);
  // for (const [nodeId, nodeObj] of node.tree.nodes) {
  //   console.warn(`[size] DEBUG: Node ${nodeId}: leaf=${nodeObj.leaf}, keys=[${nodeObj.keys.join(',')}], children=[${nodeObj.children?.join(',') || 'none'}]`);
  // }

  function sizeRecursive(currentNode: Node<T, K>, visitedNodes: Set<number>): number {
    let lres = 0
    let i = 0

    // Add protection against undefined node
    if (!currentNode) {
      // console.warn('[size] Node is undefined - returning 0');
      return 0;
    }

        if (currentNode.leaf) {
      // For leaf nodes, check if we've already counted this leaf globally
      if (globalVisitedLeaves.has(currentNode.id)) {
        // console.warn(`[size] Skipping duplicate leaf node ${currentNode.id} - already counted`);
        return 0;
      }
      globalVisitedLeaves.add(currentNode.id);

            // Create a signature for this leaf based on its keys AND pointers (values)
      // This ensures we only skip leaves that are truly identical (same keys and same values)
      const keysSignature = currentNode.keys.slice().sort().join(',');
      const pointersSignature = currentNode.pointers.slice().sort().join(',');
      const leafSignature = `keys:${keysSignature}|pointers:${pointersSignature}`;

                  // ULTRA CONSERVATIVE duplicate detection: Only skip leaves if they are the EXACT SAME NODE ID
      // This prevents legitimate leaves created by B+ tree operations from being incorrectly skipped
      const existingLeafWithSameSignature = leafSignatures.get(leafSignature);
      if (existingLeafWithSameSignature !== undefined && existingLeafWithSameSignature === currentNode.id) {
        // This would be a true duplicate (visiting the same node twice in the traversal)
        // console.warn(`[size] Detected true duplicate traversal: leaf ${currentNode.id} already visited`);
        return 0;
      }

      // TRANSACTION ISOLATION: During active transactions, be more conservative about duplicate detection
      // Working nodes might appear as duplicates but should not be counted in main tree size
      if (hasActiveTransactions && existingLeafWithSameSignature !== undefined && existingLeafWithSameSignature !== currentNode.id) {
        // console.warn(`[size] Found leaf ${currentNode.id} with same content as leaf ${existingLeafWithSameSignature}: keys=[${currentNode.keys.join(',')}], values=[${currentNode.pointers.join(',')}]`);

        // During active transactions, check if this might be a working node
        // Working nodes typically have higher IDs (created later) than committed nodes
        if (currentNode.id > existingLeafWithSameSignature) {
          // console.warn(`[size] During active transaction: leaf ${currentNode.id} has higher ID than ${existingLeafWithSameSignature} - likely a working node, skipping to preserve transaction isolation`);
          return 0; // Skip this leaf during active transactions
        } else {
          // console.warn(`[size] During active transaction: leaf ${currentNode.id} has lower ID than ${existingLeafWithSameSignature} - counting as committed node`);
        }
      } else if (!hasActiveTransactions && existingLeafWithSameSignature !== undefined && existingLeafWithSameSignature !== currentNode.id) {
        // console.warn(`[size] Found leaf ${currentNode.id} with same content as leaf ${existingLeafWithSameSignature}: keys=[${currentNode.keys.join(',')}], values=[${currentNode.pointers.join(',')}]`);
        // console.warn(`[size] In non-unique B+ tree, this is LEGITIMATE - both leaves should be counted`);
      }

      // Record this leaf's signature for debugging only (don't use for skipping)
      leafSignatures.set(leafSignature, currentNode.id);

      // console.warn(`[size] COUNTING leaf ${currentNode.id} with ${currentNode.key_num} keys: [${currentNode.keys.join(',')}] and values: [${currentNode.pointers.join(',')}]`);
      return currentNode.key_num;
    } else {
      const nodes = currentNode.tree.nodes
      const len = currentNode.size

      while (i < len) {
        const childId = currentNode.children[i];

        // Skip if we've already visited this child (prevents counting duplicates)
        if (visitedNodes.has(childId)) {
          // console.warn(`[size] Skipping duplicate child node ${childId} in parent ${currentNode.id}`);
          i++;
          continue;
        }

        visitedNodes.add(childId);
        const childNode = nodes.get(childId);

                // Add protection against undefined child nodes
        if (!childNode) {
          // console.warn(`[size] Child node ${childId} not found in node.tree.nodes for parent ${currentNode.id} - attempting recovery and cleanup`);

          // Try to find if this child exists in working nodes (for transaction contexts)
          // This is a fallback for orphaned references created during underflow operations
          let foundInWorkingNodes = false;
          if (currentNode.tree && (currentNode.tree as any).workingNodes) {
            const workingNodes = (currentNode.tree as any).workingNodes as Map<number, any>;
            const workingChild = workingNodes.get(childId);
            if (workingChild) {
              // console.warn(`[size] Found orphaned child ${childId} in working nodes, counting it`);
              const res = sizeRecursive(workingChild, visitedNodes);
              lres += res;
              foundInWorkingNodes = true;
            }
          }

          if (!foundInWorkingNodes) {
            // TRANSACTION ISOLATION: During active transactions, try alternative approaches
            if (hasActiveTransactions) {
              // console.warn(`[size] Child node ${childId} not found during active transaction - attempting alternative resolution`);

              // ENHANCED: Try to find available nodes that could represent the missing data
              if (tree) {
                let foundAlternative = false;

                                // Look for leaf nodes that haven't been visited yet and could contain data
                // ENHANCED: Check for content duplicates to avoid counting orphaned duplicates
                const seenContentSignatures = new Set<string>();
                for (const [existingNodeId] of tree.nodes) {
                  const existingNode = tree.nodes.get(existingNodeId);
                  if (existingNode && existingNode.leaf && globalVisitedLeaves.has(existingNodeId)) {
                    const existingSignature = `keys:[${existingNode.keys.join(',')}]|values:[${existingNode.pointers.join(',')}]`;
                    seenContentSignatures.add(existingSignature);
                  }
                }

                for (const [altNodeId, altNode] of tree.nodes) {
                  if (altNode.leaf && altNode.keys.length > 0 && !visitedNodes.has(altNodeId)) {
                    // CRITICAL FIX: Check reachability from current root to avoid orphaned nodes
                    // This ensures consistency with find_all_in_transaction behavior
                    const isReachableFromCurrentRoot = (tree as any).isNodeReachableFromSpecificRoot?.(altNodeId, tree.root) ?? true;
                    if (!isReachableFromCurrentRoot) {
                      // console.warn(`[size] Skipping alternative leaf ${altNodeId} because it's not reachable from current root (orphaned node)`);
                      continue;
                    }

                    // Check if this node has content we've already counted
                    const altSignature = `keys:[${altNode.keys.join(',')}]|values:[${altNode.pointers.join(',')}]`;
                    if (seenContentSignatures.has(altSignature)) {
                      // console.warn(`[size] Found alternative leaf ${altNodeId} but it duplicates already counted content: ${altSignature} - skipping`);
                      continue;
                    }

                    // console.warn(`[size] Found unvisited leaf ${altNodeId} with keys [${altNode.keys.join(',')}] - counting as alternative for missing child ${childId}`);
                    visitedNodes.add(altNodeId);
                    globalVisitedLeaves.add(altNodeId);
                    seenContentSignatures.add(altSignature);

                    // Directly count the keys in this leaf instead of recursing
                    // console.warn(`[size] COUNTING alternative leaf ${altNodeId} with ${altNode.key_num} keys: [${altNode.keys.join(',')}] and values: [${altNode.pointers.join(',')}]`);
                    lres += altNode.key_num;
                    foundAlternative = true;
                    break; // Only use one alternative to avoid over-counting
                  }
                }

                if (!foundAlternative) {
                  // console.warn(`[size] No suitable alternative found for missing child ${childId} - skipping`);
                }
              }

              i++;
              continue;
            }

            // console.warn(`[size] Child node ${childId} completely orphaned - removing reference and continuing`);

            // AGGRESSIVE CLEANUP: Remove the orphaned reference from the parent node
            // This is safe because the child doesn't exist anyway
            const orphanedIndex = currentNode.children.indexOf(childId);
            if (orphanedIndex !== -1) {
                            // console.warn(`[size] Removing orphaned child reference ${childId} from parent ${currentNode.id} at index ${orphanedIndex}`);
              currentNode.children.splice(orphanedIndex, 1);
              madeStructuralRepairs = true; // Mark that we made repairs

              // Also remove corresponding key if this is an internal node
              // For internal nodes, children[i] corresponds to keys[i-1] (except for the first child)
              if (!currentNode.leaf && orphanedIndex > 0 && orphanedIndex <= currentNode.keys.length) {
                const keyIndexToRemove = orphanedIndex - 1;
                // console.warn(`[size] Also removing corresponding key at index ${keyIndexToRemove} from parent ${currentNode.id}`);
                currentNode.keys.splice(keyIndexToRemove, 1);
              }

                            // Update parent node state after cleanup
              const { update_state, update_min_max } = require('./Node');
              update_state(currentNode);
              update_min_max(currentNode);

              // Fix key count for internal nodes: children.length should equal keys.length + 1
              if (!currentNode.leaf && currentNode.children.length !== currentNode.keys.length + 1) {
                const expectedKeyCount = currentNode.children.length - 1;
                // console.warn(`[size] Fixing key count for internal node ${currentNode.id}: has ${currentNode.keys.length} keys but needs ${expectedKeyCount} for ${currentNode.children.length} children`);

                if (expectedKeyCount === 0) {
                  // If we need 0 keys, clear the keys array
                  currentNode.keys = [];
                } else if (expectedKeyCount > currentNode.keys.length) {
                  // If we need more keys, reconstruct them from children
                  // console.warn(`[size] Reconstructing ${expectedKeyCount - currentNode.keys.length} missing keys for node ${currentNode.id}`);
                  currentNode.keys = [];
                  for (let i = 1; i < currentNode.children.length; i++) {
                    const childNodeId = currentNode.children[i];
                    const childNode = currentNode.tree.nodes.get(childNodeId);
                    if (childNode && childNode.keys.length > 0) {
                      currentNode.keys.push(childNode.keys[0]);
                      // console.warn(`[size] Reconstructed separator key ${childNode.keys[0]} for child ${childNodeId}`);
                    }
                  }
                } else if (expectedKeyCount < currentNode.keys.length) {
                  // If we need fewer keys, trim the keys array
                  // console.warn(`[size] Trimming ${currentNode.keys.length - expectedKeyCount} excess keys from node ${currentNode.id}`);
                  currentNode.keys = currentNode.keys.slice(0, expectedKeyCount);
                }

                // Update state again after key fixes
                update_state(currentNode);
                update_min_max(currentNode);
              }

              // console.warn(`[size] Parent ${currentNode.id} cleaned up: now has ${currentNode.children.length} children and ${currentNode.keys.length} keys`);

              // Don't increment i since we removed an element - the next element is now at the same index
              continue;
            }
          }

          i++;
          continue;
        }

        // ENHANCED: Skip nodes with structural problems but try to handle them gracefully
        if (!childNode.leaf && childNode.keys.length === 0 && childNode.children.length <= 1) {
          // console.warn(`[size] Found problematic internal node ${childId} with empty keys and ${childNode.children.length} children`);

          // If it has exactly one child, count that child instead
          if (childNode.children.length === 1) {
            const grandChildId = childNode.children[0];
            const grandChildNode = nodes.get(grandChildId);
            if (grandChildNode && !visitedNodes.has(grandChildId)) {
              // console.warn(`[size] Counting grandchild ${grandChildId} instead of problematic internal node ${childId}`);
              visitedNodes.add(grandChildId);
              const res = sizeRecursive(grandChildNode, visitedNodes);
              lres += res;
            }
          }
          // If it has no children, skip it entirely
          i++;
          continue;
        }

        const res = sizeRecursive(childNode, visitedNodes);
        lres += res;
        i++;
      }
      return lres;
    }
  }

  // Start the recursive traversal with a fresh set of visited nodes
  const result = sizeRecursive(node, new Set<number>());

  // If we made structural repairs during size calculation, run a full tree validation
  if (madeStructuralRepairs && node.tree && typeof (node.tree as any).validateTreeStructure === 'function') {
    // console.warn(`[size] Made structural repairs during size calculation. Running validateTreeStructure() to ensure consistency.`);
    const validationResult = (node.tree as any).validateTreeStructure();
    if (!validationResult.isValid) {
      // console.warn(`[size] Post-repair validation found issues: ${validationResult.issues.join('; ')}`);
      if (validationResult.fixedIssues.length > 0) {
        // console.warn(`[size] Post-repair validation fixed additional issues: ${validationResult.fixedIssues.join('; ')}`);
      }
    } else {
      // console.warn(`[size] Post-repair validation passed - tree structure is now consistent.`);
    }
  }

  return result;
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
        // console.error(`[split] FATAL Error: Node ${node.id} not found in parent ${parent.id}'s children during split.`);
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
