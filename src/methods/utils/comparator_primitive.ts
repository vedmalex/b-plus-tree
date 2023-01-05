import { ValueType } from '../../types/ValueType'
export function compare_keys_primitive<K extends ValueType>(
  key1: K,
  key2: K,
): number {
  if (key1 < key2) {
    return -1
  } else if (key1 > key2) {
    return 1
  } else {
    return 0
  }
}
