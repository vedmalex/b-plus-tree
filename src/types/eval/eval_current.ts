import { evaluate } from './evaluate'
import type { BPlusTree } from '../BPlusTree'
import type { ValueType } from '../ValueType'
import type { Cursor } from './Cursor'

export function eval_current<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate(tree, id, pos)
}
