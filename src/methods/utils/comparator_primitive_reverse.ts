import type { ValueType } from '../../types/ValueType'
export function compare_keys_primitive_reverse<K extends ValueType>(
  key1?: K,
  key2?: K,
): number {
  if (key1 != null && key2 != null) {
    if (key1 < key2) {
      return 1
    } else if (key1 > key2) {
      return -1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}
