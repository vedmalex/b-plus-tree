import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_first } from '../eval/find_first'
import { BPlusTree } from '../BPlusTree'

export function sourceIn<T, K extends ValueType>(keys: Array<K>) {
  return function* (tree: BPlusTree<T, K>) {
    let cursor: Cursor<T, K>
    let i = 0
    do {
      do {
        const key = keys[i]
        if (!cursor) {
          cursor = find_first(tree, key, true)
        } else {
          cursor = eval_next(tree, cursor.node, cursor.pos)
        }
        if (!cursor.done && cursor.key != key) {
          i += 1
          if (i < keys.length) {
            cursor = undefined
          }
        } else if (!cursor.done) {
          // i += 1
          yield cursor
          break
        }
      } while (i < keys.length)
    } while (!cursor.done)
  }
}
