import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function $mapReduceAsync<T, D, V, O = Map<ValueType, V>>(
  source: AsyncIterable<Cursor<T>>,
  map: (inp: [ValueType, T]) => D | Promise<D>,
  reduce: (inp: [ValueType, D]) => V | Promise<V>,
  finalize?: (inp: Map<ValueType, V>) => O | Promise<O>,
): Promise<O> {
  let result: Map<ValueType, V> = new Map()
  for await (let cursor of source) {
    const value = map([cursor.key, cursor.value])
    const res = reduce([
      cursor.key,
      value instanceof Promise ? await value : value,
    ])
    result.set(cursor.key, res instanceof Promise ? await res : res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
