import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { BPlusTree } from '../BPlusTree'
import { $filter } from './$filter'

export function $nin<T>(
  tree: BPlusTree<T>,
  keys: Array<ValueType>,
): Iterable<Cursor<T>> {
  return $filter(tree, ([key]) => !keys.includes(key))
}
