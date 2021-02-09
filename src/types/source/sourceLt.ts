import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { find_range_start } from '../eval/find_range_start'
import { eval_previous } from '../eval/eval_previous'
import { BPlusTree } from '../BPlusTree'

export function sourceLt<T, K extends ValueType>(key: K) {
  return function* (tree: BPlusTree<T, K>) {
    let cursor: Cursor<T, K> = find_range_start(tree, key, false, false)
    while (!cursor.done) {
      yield cursor
      cursor = eval_previous(tree, cursor.node, cursor.pos)
    }
  }
}
