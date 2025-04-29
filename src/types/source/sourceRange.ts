import type { ValueType } from '../ValueType'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import type { BPlusTree } from '../BPlusTree'
import type { Cursor } from '../eval/Cursor'

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
