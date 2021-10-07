import { filter } from './filter'
import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'

export function lt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k < key)
}
