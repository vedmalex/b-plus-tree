import { filter } from './filter'
import { ValueType } from '../ValueType'

export function lt<T, K extends ValueType>(key: K) {
  return filter<T, K>(([k]) => k < key)
}
