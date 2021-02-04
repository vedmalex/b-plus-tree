import { Cursor } from '../../../eval/Cursor'

export function $reduce<T, D>(
  source: Iterable<Cursor<T>>,
  reducer: (cur: T, res: D) => D,
  initial?: D,
): D {
  let result = initial
  for (let cursor of source) {
    result = reducer(cursor.value, result)
  }
  return result
}
