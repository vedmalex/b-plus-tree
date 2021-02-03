import { Cursor } from '../../eval/Cursor'
import { ValueType } from '../../ValueType'

// принимает курсор одного типа возвращает курсор другого типа
// и возвращаемое знанчение
export function $mapReduce<T, D, V, O = Map<ValueType, V>>(
  source: Iterable<Cursor<T>>,
  map: (inp: T) => D,
  reduce: (inp: D) => V,
  finalize?: (inp: Map<ValueType, V>) => O,
): O {
  let result: Map<ValueType, V> = new Map()
  for (let current of source) {
    const value = map(current.value)
    const res = reduce(value)
    result.set(current.key, res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
