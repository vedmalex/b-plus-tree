import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'
import { $filter } from './$filter'

export async function* $nin<T>(
  source: AsyncIterable<Cursor<T>>,
  keys: Array<ValueType>,
): AsyncIterable<Cursor<T>> {
  return $filter(source, ([key]) => !keys.includes(key))
}
