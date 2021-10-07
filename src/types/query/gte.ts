import { Cursor } from '../eval/Cursor'
import { ValueType } from '../ValueType'
import { filter } from './filter'

export function gte<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k >= key)
}
