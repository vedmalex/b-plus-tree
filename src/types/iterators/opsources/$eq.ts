import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { eval_next } from '../../eval/eval_next'
import { find_first } from '../../eval/find_first'
import { BPlusTree } from '../../BPlusTree'

export function* $eq<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
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
