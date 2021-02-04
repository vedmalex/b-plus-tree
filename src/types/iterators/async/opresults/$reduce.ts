import { Cursor } from '../../../eval/Cursor'

export async function $reduce<T, D>(
  source: AsyncIterable<Cursor<T>>,
  reducer: (cur: T, res: D) => D,
  initial?: D,
): Promise<D> {
  let result = initial
  for await (let cursor of source) {
    result = reducer(cursor.value, result)
  }
  return result
}
