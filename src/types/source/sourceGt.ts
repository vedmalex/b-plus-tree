import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import { BPlusTree } from '../BPlusTree'

export function sourceGt<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>) {
    let cursor: Cursor<T, K> = find_range_start(tree, key, false, true)
    while (!cursor.done) {
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}
