import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export function $some<T>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => boolean,
) {
  for (let cursor of source) {
    if (func([cursor.key, cursor.value])) {
      return true
    }
  }
  return false
}
