import { Cursor } from '../eval/Cursor'

export function reduce<T, D>(
  reducer: (res: D, cur: T) => Promise<D> | D,
  initial?: D,
) {
  return async function* (
    source: Generator<Cursor<T>> | AsyncGenerator<Cursor<T>>,
  ) {
    let result = initial
    for await (let cursor of source) {
      result = await reducer(result, cursor.value)
      // yield result
    }
    yield result
  }
}
