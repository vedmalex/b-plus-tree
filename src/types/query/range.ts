import type { Cursor } from '../eval/Cursor'
import type { ValueType } from '../ValueType'
import { filter } from './filter'

export function range<T, K extends ValueType>(
  from: ValueType,
  to: ValueType,
  fromIncl = true,
  toIncl = true,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}
