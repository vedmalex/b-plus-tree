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
      index = find_first_key(node.keys, key, tree.comparator)
    } else {
      index = find_last_key(node.keys, key, tree.comparator)
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
  let { take = -1 } = options ?? {}
  const result: Array<T> = []
  const cursor = find_first<T, K>(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor<T, K>
    if (skip == 0) {
      cur = cursor
    } else {
      cur = evaluate(tree, cursor.node, cursor.pos + (forward ? skip : -skip))
    }
    if (!cur.done) {
      if (cur.key == key) {
        if (take == -1 && initial_take != -1) {
          result.push(cur.value)
        } else {
          while (cur || take == 0) {
            if (cur.key == key && cur.pos >= 0) {
              result.push(cur.value)
              take -= 1
              cur = evaluate(tree, cur.node, cur.pos + (forward ? 1 : -1))
            } else {
              break
            }
          }
        }
      }
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
  const key = forward ? tree.min : tree.max // Start key
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
