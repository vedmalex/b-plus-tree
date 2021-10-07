import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function some<T, K extends ValueType>(func: (value: [K, T]) => boolean) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<boolean, void> {
    for await (const cursor of source) {
      if (func([cursor.key, cursor.value])) {
        yield true
        return
      }
    }
    yield false
    return
  }
}
