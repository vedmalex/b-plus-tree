import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function filter<T, K extends ValueType>(
  filter: (value: [K, T]) => Promise<boolean> | boolean,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K>, void, unknown> {
    for await (const cursor of source) {
      if (await filter([cursor.key, cursor.value])) {
        yield cursor
      }
    }
  }
}
