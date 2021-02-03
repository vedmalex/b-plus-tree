import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { eval_next } from '../../eval/eval_next'
import { BPlusTree } from '../../BPlusTree'
import { eval_previous } from '../../eval/eval_previous'

export async function* $iteratorAsync<T, D>(
  tree: BPlusTree<T>,
  extractor: (value: [ValueType, T]) => Promise<D>,
  forward: boolean = true,
): AsyncIterable<Cursor<D>> {
  const next = forward ? eval_next : eval_previous
  let cursor = tree.cursor(tree.min)
  while (!cursor.done) {
    yield {
      ...cursor,
      value: await extractor([cursor.key, cursor.value]),
    }
    cursor = next(tree, cursor.node, cursor.pos)
  }
}
