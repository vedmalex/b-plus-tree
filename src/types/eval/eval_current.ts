import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'
import { ValueType } from '../ValueType'
import { Cursor } from './Cursor'

export function eval_current<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate(tree, id, pos)
}
