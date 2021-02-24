import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function mapReduce<T, K extends ValueType, D, V, O = Map<K, V>>(
  map: (inp: [K, T]) => D | Promise<D>,
  reduce: (inp: [K, D]) => V | Promise<V>,
  finalize?: (inp: Map<K, V>) => O | Promise<O>,
) {
  return async function* (source: Generator<Cursor<T, K>>) {
    const result: Map<K, V> = new Map()
    for (const cursor of source) {
      const value = await map([cursor.key, cursor.value])
      const res = await reduce([cursor.key, value])
      result.set(cursor.key, res)
    }
    yield finalize?.(result) ?? result
  }
}
