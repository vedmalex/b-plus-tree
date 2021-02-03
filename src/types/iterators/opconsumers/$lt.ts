import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'
import { $filter } from './$filter'

export function* $lt<T>(
  source: Iterable<Cursor<T>>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return $filter(source, ([k]) => k < key)
}
