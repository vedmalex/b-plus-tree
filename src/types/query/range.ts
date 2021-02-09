import { ValueType } from '../ValueType'
import { filter } from './filter'

export function range<T, K extends ValueType>(
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
) {
  return filter<T, K>(
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}
