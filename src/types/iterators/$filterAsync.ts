import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { BPlusTree } from '../BPlusTree'

export function $filterAsync<T>(
  tree: BPlusTree<T>,
  filter: (value: [ValueType, T]) => Promise<boolean>,
): AsyncIterable<Cursor<T>> {
  return {
    [Symbol.asyncIterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.min
      return {
        async next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
          }

          while (!cursor.done) {
            if (!(await filter([cursor.key, cursor.value]))) {
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
