import { Cursor } from '../../eval/Cursor'
import { eval_next } from '../../eval/eval_next'
import { BPlusTree } from '../../BPlusTree'
import { eval_previous } from '../../eval/eval_previous'

export function* $iterator<T>(
  tree: BPlusTree<T>,
  forward: boolean = true,
): Iterable<Cursor<T>> {
  const next = forward ? eval_next : eval_previous
  let cursor = tree.cursor(tree.min)
  while (!cursor.done) {
    yield cursor
    cursor = next(tree, cursor.node, cursor.pos)
  }
}
