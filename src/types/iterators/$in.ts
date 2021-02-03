import { ValueType } from '../ValueType'
import { Cursor, EmptyCursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_first } from '../eval/find_first'
import { BPlusTree } from '../BPlusTree'

export function $in<T>(
  tree: BPlusTree<T>,
  keys: Array<ValueType>,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      let i = 0
      return {
        next() {
          do {
            let key = keys[i]
            if (!cursor) {
              cursor = find_first(tree, key, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
            }
            if (!cursor.done && cursor.key != key) {
              i += 1
              if (i == keys.length) {
                cursor = EmptyCursor
              } else {
                cursor = undefined
              }
            } else {
              // i += 1
              break
            }
          } while (i < keys.length)

          const result = cursor.done
            ? { value: undefined, done: true }
            : { value: cursor, done: false }
          return result
        },
      }
    },
  }
}
