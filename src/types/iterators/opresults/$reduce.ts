import { Cursor } from '../../eval/Cursor'

export function $reduce<T, E, D>(
  source: Iterable<Cursor<T>>,
  reducer: (cur: T | E, res: D) => D,
  initial?: D,
): D {
  let result = initial
  for (let current of source) {
    result = reducer(current.value, result)
  }
  return result
}
