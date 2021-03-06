import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'
import { ValueType } from '../ValueType'

export function eval_current<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
) {
  return evaluate(tree, id, pos)
}
