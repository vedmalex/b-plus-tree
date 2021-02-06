import { ValueType } from '../ValueType'
import { filter } from './filter'

export function nin<T>(keys: Array<ValueType>) {
  return filter<T>(([key]) => !keys.includes(key))
}
