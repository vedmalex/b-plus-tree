import { ValueType } from '../ValueType'
import { eval_next } from '../eval/eval_next'
import { find_first } from '../eval/find_first'
import { BPlusTree } from '../BPlusTree'

export function sourceEq<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>) {
    let cursor = find_first(tree, key, true)
    while (!cursor.done) {
      if (cursor.key == key) {
        yield cursor
      } else {
        break
      }
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}
