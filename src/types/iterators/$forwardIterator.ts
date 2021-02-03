import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { BPlusTree } from '../BPlusTree'

export function $forwardIterator<T>(tree: BPlusTree<T>): Iterable<Cursor<T>> {
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
          const result = cursor.done
            ? { value: undefined, done: true }
            : { value: cursor, done: false }
          return result
        },
      }
    },
  }
}
