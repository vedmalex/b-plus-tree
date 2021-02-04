import { $filter } from './$filter'
import { Cursor } from '../../../eval/Cursor'
import { ValueType } from '../../../ValueType'

export function* $lt<T>(
  source: Iterable<Cursor<T>>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return $filter(source, ([k]) => k < key)
}
