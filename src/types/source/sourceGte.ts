import type { ValueType } from '../ValueType'
import type { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import type { BPlusTree } from '../BPlusTree'

export function sourceGte<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, true, true)
    while (!cursor.done) {
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}
