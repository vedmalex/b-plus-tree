import { reduce } from './reduce'
import { ValueType } from '../ValueType'

export function distinct<T, K extends ValueType>() {
  return reduce<T,K, Set<T>>((res, cur) => {
    res.add(cur)
    return res
  }, new Set())
}
