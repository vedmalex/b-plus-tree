import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { find_range_start } from '../../eval/find_range_start'
import { eval_previous } from '../../eval/eval_previous'
import { BPlusTree } from '../../BPlusTree'

export function* $lt<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
  let cursor: Cursor<T> = find_range_start(tree, key, false, false)
  while (!cursor.done) {
    yield cursor
    cursor = eval_previous(tree, cursor.node, cursor.pos)
  }
}
