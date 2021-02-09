import { ValueType } from '../ValueType'
import { filter } from './filter'

export function gt<T, K extends ValueType>(key: K) {
  return filter<T, K>(([k]) => k > key)
}
