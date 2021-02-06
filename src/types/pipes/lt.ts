import { filter } from './filter'
import { ValueType } from '../ValueType'

export function lt<T>(key: ValueType) {
  return filter<T>(([k]) => k < key)
}
