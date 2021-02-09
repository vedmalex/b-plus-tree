import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function map<T, R>(func: (value: [ValueType, T]) => R | Promise<R>) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    for await (let cursor of source) {
      yield {
        ...cursor,
        value: await func([cursor.key, cursor.value]),
      }
    }
  }
}
