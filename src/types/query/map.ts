import type { ValueType } from '../ValueType'
import type { Cursor } from '../eval/Cursor'

export function map<T, K extends ValueType, R>(
  func: (value: [K, T]) => R | Promise<R>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K, R>, void> {
    for await (const cursor of source) {
      const value = await func([cursor.key, cursor.value])
      yield {
        ...cursor,
        value,
      }
    }
  }
}
