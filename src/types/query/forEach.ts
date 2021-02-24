import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function forEach<T, K extends ValueType>(
  action: (value: [K, T]) => Promise<void> | void,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ) {
    for await (const cursor of source) {
      await action([cursor.key, cursor.value])
      yield cursor
    }
  }
}
