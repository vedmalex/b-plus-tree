import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function forEach<T>(
  action: (value: [ValueType, T]) => Promise<void> | void,
) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    for await (let cursor of source) {
      await action([cursor.key, cursor.value])
      yield cursor
    }
  }
}
