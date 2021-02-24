import { Cursor } from '../eval/Cursor'
import { ValueType } from '../ValueType'

export function reduce<T, K extends ValueType, D>(
  reducer: (res: D, cur: T) => Promise<D> | D,
  initial?: D,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ) {
    let result = initial
    for await (const cursor of source) {
      result = await reducer(result, cursor.value)
    }
    yield result
  }
}
