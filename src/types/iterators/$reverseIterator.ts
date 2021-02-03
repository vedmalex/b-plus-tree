import { Cursor } from '../eval/Cursor'
import { eval_previous } from '../eval/eval_previous'
import { BPlusTree } from '../BPlusTree'

export function $reverseIterator<T>(tree: BPlusTree<T>): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.max
      return {
        next() {
          if (!cursor) {
            cursor = tree.cursor(value)
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
