import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'

export function $every<T>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => boolean,
) {
  for (let current of source) {
    if (!func([current.key, current.value])) {
      return false
    }
  }
  return true
}
