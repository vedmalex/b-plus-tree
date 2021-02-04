import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export async function* $ne<T>(
  source: AsyncIterable<Cursor<T>>,
  key: ValueType,
): AsyncIterable<Cursor<T>> {
  return $filter(source, ([k]) => k != key)
}
