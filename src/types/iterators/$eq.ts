import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_first } from '../eval/find_first'
import { BPlusTree } from '../BPlusTree'

export function $eq<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      return {
        next() {
          if (!cursor) {
            cursor = find_first(tree, key, true)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
          }

          while (!cursor.done) {
            if (cursor.key != key) {
              cursor.done = true
            } else {
              break
            }
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
