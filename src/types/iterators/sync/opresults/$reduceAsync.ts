import { Cursor } from '../../../eval/Cursor'

export async function $reduceAsync<T, E, D>(
  source: Iterable<Cursor<T>>,
  reducer: (cur: T | E, res: D) => Promise<D>,
  initial?: D,
): Promise<D> {
  let result = initial
  for (let cursor of source) {
    result = await reducer(cursor.value, result)
  }
  return result
}
