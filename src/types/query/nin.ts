import { ValueType } from '../ValueType'
import { filter } from './filter'

export function nin<T, K extends ValueType>(keys: Array<ValueType>) {
  return filter<T, K>(([key]) => !keys.includes(key))
}
