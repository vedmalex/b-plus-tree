import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { $filter } from './$filter'

export function $nin<T>(
  source: Iterable<Cursor<T>>,
  keys: Array<ValueType>,
): Iterable<Cursor<T>> {
  return $filter(source, ([key]) => !keys.includes(key))
}
