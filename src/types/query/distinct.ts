import { reduce } from './reduce'
import type { ValueType } from '../ValueType'
import type { Cursor } from '../eval/Cursor'

export function distinct<T, K extends ValueType>(): (
  source: Generator<Cursor<T, K, T>> | AsyncGenerator<Cursor<T, K, T>>,
) => AsyncGenerator {
  return reduce<T, K, Set<T>>((res, cur) => {
    res.add(cur)
    return res
  }, new Set())
}
