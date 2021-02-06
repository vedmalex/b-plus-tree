import { ValueType } from '../ValueType'
import { filter } from './filter'

export function includes<T>(key: Array<ValueType>) {
  return filter<T>(([k]) => key.includes(k))
}
