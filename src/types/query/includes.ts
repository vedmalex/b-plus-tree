import { Cursor } from '../eval/Cursor'
import { ValueType } from '../ValueType'
import { filter } from './filter'

export function includes<T, K extends ValueType>(
  key: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => key.includes(k))
}
