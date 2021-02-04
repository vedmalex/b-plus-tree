import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export async function* $in<T>(
  source: AsyncIterable<Cursor<T>>,
  key: Array<ValueType>,
): AsyncIterable<Cursor<T>> {
  return $filter(source, ([k]) => key.includes(k))
}
