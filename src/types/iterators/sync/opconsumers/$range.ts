import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export function* $range<T>(
  source: Iterable<Cursor<T>>,
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
): Iterable<Cursor<T>> {
  return $filter(
    source,
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}
