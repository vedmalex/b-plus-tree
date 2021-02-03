import { ValueType } from '../ValueType'
import { Cursor, EmptyCursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import { BPlusTree } from '../BPlusTree'

export function $range<T>(
  tree: BPlusTree<T>,
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      const endCursor = find_range_start(tree, to, toIncl, false)
      let cursor: Cursor<T>
      let finish = false
      return {
        next() {
          if (!finish) {
            if (!cursor) {
              cursor = find_range_start(tree, from, fromIncl, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
              if (
                cursor.node == endCursor.node &&
                cursor.pos == endCursor.pos
              ) {
                finish = true
              }
            }
          } else {
            cursor = EmptyCursor
          }

          const result = cursor.done
            ? { value: undefined, done: true }
            : { value: cursor, done: false }
          return result
        },
      }
    },
  }
}
