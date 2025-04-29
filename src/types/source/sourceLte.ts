import type { ValueType } from '../ValueType'
import type { Cursor } from '../eval/Cursor'
import { find_range_start } from '../eval/find_range_start'
import { eval_previous } from '../eval/eval_previous'
import type { BPlusTree } from '../BPlusTree'

export function sourceLte<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor: Cursor<T, K> = find_range_start(tree, key, true, false)
    while (!cursor.done) {
      yield cursor
      cursor = eval_previous(tree, cursor.node, cursor.pos)
    }
  }
}
