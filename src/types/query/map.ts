import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function map<T, K extends ValueType, R>(
  func: (value: [K, T]) => R | Promise<R>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ) {
    for await (const cursor of source) {
      yield {
        ...cursor,
        value: await func([cursor.key, cursor.value]),
      }
    }
  }
}
