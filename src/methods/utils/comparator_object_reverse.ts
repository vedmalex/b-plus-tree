import { ValueType } from '../../types/ValueType'
export function compare_keys_object_reverse<
  K extends Record<string, ValueType>,
>(key1: K, key2: K): number {
  if (key1 != null && key2 != null) {
    // Iterate over all of the properties in the key objects
    for (const prop of Object.keys(key1)) {
      // If the second key object does not have the property, the first key is greater
      if (!(prop in key2)) {
        return -1
      }

      // If the values of the properties are not equal, return the comparison of the values
      if (key1[prop] !== key2[prop]) {
        return key1[prop] < key2[prop] ? 1 : -1
      }
    }

    // If all of the properties are equal, but the second key object has additional properties,
    // the first key is less
    if (Object.keys(key2).length > Object.keys(key1).length) {
      return 1
    }

    // If all of the properties are equal, the keys are equal
    return 0
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}
