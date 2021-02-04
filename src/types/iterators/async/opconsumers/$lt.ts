import { $filter } from './$filter'
import { Cursor } from '../../../eval/Cursor'
import { ValueType } from '../../../ValueType'

export async function* $lt<T>(
  source: AsyncIterable<Cursor<T>>,
  key: ValueType,
): AsyncIterable<Cursor<T>> {
  return $filter(source, ([k]) => k < key)
}
