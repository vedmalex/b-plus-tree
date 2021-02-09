import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'
import { ValueType } from '../ValueType'

export function eval_previous<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
) {
  return evaluate<T, K>(tree, id, pos - 1)
}
