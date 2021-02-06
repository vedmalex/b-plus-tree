import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function every<T>(
  func: (value: [ValueType, T]) => boolean | Promise<boolean>,
) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    for await (let cursor of source) {
      if (!(await func([cursor.key, cursor.value]))) {
        yield false
        return
      }
    }
    yield true
  }
}
