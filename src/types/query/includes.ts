import { ValueType } from '../ValueType'
import { filter } from './filter'

export function includes<T, K extends ValueType>(key: Array<ValueType>) {
  return filter<T, K>(([k]) => key.includes(k))
}
