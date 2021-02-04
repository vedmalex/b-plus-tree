import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'

export function $every<T>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => boolean,
) {
  for (let cursor of source) {
    if (!func([cursor.key, cursor.value])) {
      return false
    }
  }
  return true
}
