import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { BPlusTree } from '../BPlusTree'

export function $filter<T>(
  tree: BPlusTree<T>,
  filter: (value: [ValueType, T]) => boolean,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.min
      return {
        next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
          }

          while (!cursor.done) {
            if (!filter([cursor.key, cursor.value])) {
              cursor = eval_next(tree, cursor.node, cursor.pos)
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
