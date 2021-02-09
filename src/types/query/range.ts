import { ValueType } from '../ValueType'
import { filter } from './filter'

export function range<T>(
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
) {
  return filter<T>(
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}
