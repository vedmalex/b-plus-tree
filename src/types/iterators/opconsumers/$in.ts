import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { $filter } from './$filter'

export function* $in<T>(
  source: Iterable<Cursor<T>>,
  key: Array<ValueType>,
): Iterable<Cursor<T>> {
  return $filter(source, ([k]) => key.includes(k))
}
