import { ValueType } from '../../ValueType'
import { Cursor, EmptyCursor } from '../../eval/Cursor'
import { eval_next } from '../../eval/eval_next'
import { find_range_start } from '../../eval/find_range_start'
import { BPlusTree } from '../../BPlusTree'

export function* $range<T>(
  tree: BPlusTree<T>,
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
): Iterable<Cursor<T>> {
  const endCursor = find_range_start(tree, to, toIncl, false)
  let cursor = find_range_start(tree, from, fromIncl, true)
  while (!cursor.done) {
    yield cursor
    if (cursor.node == endCursor.node && cursor.pos == endCursor.pos) {
      return
    }
    cursor = eval_next(tree, cursor.node, cursor.pos)
  }
}
