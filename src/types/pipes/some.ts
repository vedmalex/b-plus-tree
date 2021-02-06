import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function some<T>(func: (value: [ValueType, T]) => boolean) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    for await (let cursor of source) {
      if (func([cursor.key, cursor.value])) {
        yield true
        return
      }
    }
    yield false
    return
  }
}
