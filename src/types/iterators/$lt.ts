import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { find_range_start } from '../eval/find_range_start'
import { eval_previous } from '../eval/eval_previous'
import { BPlusTree } from '../BPlusTree'

export function $lt<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      return {
        next() {
          if (!cursor) {
            cursor = find_range_start(tree, key, false, false)
          } else {
            cursor = eval_previous(tree, cursor.node, cursor.pos)
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
