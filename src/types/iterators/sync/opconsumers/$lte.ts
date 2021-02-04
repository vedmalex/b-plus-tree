import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export function* $lte<T>(
  source: Iterable<Cursor<T>>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return $filter(source, ([k]) => k <= key)
}
