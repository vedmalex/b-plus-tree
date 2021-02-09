import { ValueType } from '../ValueType'
import { filter } from './filter'

export function lte<T, K extends ValueType>(key: K) {
  return filter<T, K>(([k]) => k <= key)
}
