import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import { BPlusTree } from '../BPlusTree'

export function $gte<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      return {
        next() {
          if (!cursor) {
            cursor = find_range_start(tree, key, true, true)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
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
