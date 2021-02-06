import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function mapReduce<T, D, V, O = Map<ValueType, V>>(
  map: (inp: [ValueType, T]) => D | Promise<D>,
  reduce: (inp: [ValueType, D]) => V | Promise<V>,
  finalize?: (inp: Map<ValueType, V>) => O | Promise<O>,
) {
  return async function* (source: Generator<Cursor<T>>) {
    let result: Map<ValueType, V> = new Map()
    for (let cursor of source) {
      const value = await map([cursor.key, cursor.value])
      const res = await reduce([cursor.key, value])
      result.set(cursor.key, res)
    }
    yield finalize?.(result) ?? result
  }
}
