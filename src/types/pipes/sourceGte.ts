import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_next } from '../eval/eval_next'
import { find_range_start } from '../eval/find_range_start'
import { BPlusTree } from '../BPlusTree'

export function sourceGte<T>(key: ValueType) {
  return function* (tree: BPlusTree<T>) {
    let cursor: Cursor<T> = find_range_start(tree, key, true, true)
    while (!cursor.done) {
      yield cursor
      cursor = eval_next(tree, cursor.node, cursor.pos)
    }
  }
}
