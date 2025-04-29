import type { Cursor } from '../eval/Cursor'
import type { ValueType } from '../ValueType'
import { filter } from './filter'

export function nin<T, K extends ValueType>(
  keys: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([key]) => !keys.includes(key))
}
