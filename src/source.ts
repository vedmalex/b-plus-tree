import { eval_next } from './eval'
import type { BPlusTree } from './BPlusTree'
import { eval_previous } from './eval'
import type { ValueType } from './Node'
import type { Cursor } from './eval'
import { find_first } from './eval'
import { find_first_remove } from './eval'
import { find_range_start } from './eval'

export function sourceEach<T, K extends ValueType>(forward = true) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    const next = forward ? eval_next : eval_previous
    let cursor = tree.cursor(tree.min)
    while (!cursor.done) {
      yield cursor
      cursor = next(tree, cursor.node, cursor.pos)
    }
  }
}

export function sourceEq<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = find_first(tree, key, true)
    while (!cursor.done) {
      if (cursor.key == key) {
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
      if (cursor.key == key) {
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
    let cursor: Cursor<T, K>
    let i = 0
    do {
      do {
        const key = keys[i]
        if (!cursor) {
          cursor = find_first(tree, key, true)
        } else {
          cursor = eval_next(tree, cursor.node, cursor.pos)
        }
        if (!cursor.done && cursor.key != key) {
          i += 1
          if (i < keys.length) {
            cursor = undefined
          }
        } else if (!cursor.done) {
          // i += 1
          yield cursor
          break
        }
      } while (i < keys.length)
    } while (!cursor.done)
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
    const endCursor = find_range_start(tree, to, toIncl, false)
    let cursor: Cursor<T, K> = find_range_start(tree, from, fromIncl, true)
    while (!cursor.done) {
      yield cursor
      if (cursor.node == endCursor.node && cursor.pos == endCursor.pos) {
        return
      }
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}
