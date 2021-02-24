import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function every<T, K extends ValueType>(
  func: (value: [K, T]) => boolean | Promise<boolean>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ) {
    for await (const cursor of source) {
      if (!(await func([cursor.key, cursor.value]))) {
        yield false
        return
      }
    }
    yield true
  }
}
