import { Cursor } from '../../../eval/Cursor'

export async function $reduceAsync<T, D>(
  source: AsyncIterable<Cursor<T>>,
  reducer: (cur: T, res: D) => Promise<D>,
  initial?: D,
): Promise<D> {
  let result = initial
  for await (let cursor of source) {
    result = await reducer(cursor.value, result)
  }
  return result
}
