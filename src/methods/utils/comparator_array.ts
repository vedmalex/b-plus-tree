import { ValueType } from '../../types/ValueType'
export function compare_keys_array<K extends Array<ValueType>>(
  key1: K,
  key2: K,
): number {
  // Compare the keys element by element until a difference is found
  const minLength = Math.min(key1.length, key2.length)
  for (let i = 0; i < minLength; i++) {
    if (key1[i] < key2[i]) {
      return -1
    } else if (key1[i] > key2[i]) {
      return 1
    }
  }

  // If all elements are equal, compare the lengths of the keys
  if (key1.length < key2.length) {
    return -1
  } else if (key1.length > key2.length) {
    return 1
  } else {
    return 0
  }
}
