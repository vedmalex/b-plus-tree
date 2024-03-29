import { eval_next } from '../eval/eval_next'
import { BPlusTree } from '../BPlusTree'
import { eval_previous } from '../eval/eval_previous'
import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function sourceEach<T, K extends ValueType>(forward: boolean = true) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    const next = forward ? eval_next : eval_previous
    let cursor = tree.cursor(tree.min)
    while (!cursor.done) {
      yield cursor
      cursor = next(tree, cursor.node, cursor.pos)
    }
  }
}
