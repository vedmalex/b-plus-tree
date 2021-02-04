import { Cursor } from '../../../eval/Cursor'
import { ValueType } from '../../../ValueType'

// принимает курсор одного типа возвращает курсор другого типа
// и возвращаемое знанчение
export async function $mapReduce<T, D, V, O = Map<ValueType, V>>(
  source: AsyncIterable<Cursor<T>>,
  map: (inp: T) => D,
  reduce: (inp: D) => V,
  finalize?: (inp: Map<ValueType, V>) => O,
): Promise<O> {
  let result: Map<ValueType, V> = new Map()
  for await (let cursor of source) {
    const value = map(cursor.value)
    const res = reduce(value)
    result.set(cursor.key, res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
