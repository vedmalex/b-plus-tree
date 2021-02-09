import { ValueType } from '../ValueType'
import { filter } from './filter'

export function ne<T>(key: ValueType) {
  return filter<T>(([k]) => k != key)
}
