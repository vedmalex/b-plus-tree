import { ValueType } from '../types/ValueType'
export function find_last_item(a: Array<ValueType>, key: ValueType) {
  const len = a.length
  let res = len
  for (let i = len - 1; i >= 0; i--) {
    if (key === a[i]) {
      res = i
      break
    }
  }
  return res
}
