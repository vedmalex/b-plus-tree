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

