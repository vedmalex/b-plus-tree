import { filter } from './filter'
import type { ValueType } from '../ValueType'
import type { Cursor } from '../eval/Cursor'

export function lt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k < key)
}
