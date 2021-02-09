import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function filter<T>(
  filter: (value: [ValueType, T]) => Promise<boolean> | boolean,
) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    for await (let cursor of source) {
      if (await filter([cursor.key, cursor.value])) {
        yield cursor
      }
    }
  }
}
