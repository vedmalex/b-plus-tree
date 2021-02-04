import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export async function* $range<T>(
  source: AsyncIterable<Cursor<T>>,
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
): AsyncIterable<Cursor<T>> {
  return $filter(
    source,
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}
