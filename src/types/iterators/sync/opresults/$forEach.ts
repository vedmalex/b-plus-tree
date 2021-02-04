import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export function $forEach<T>(
  source: Iterable<Cursor<T>>,
  action: (value: [ValueType, T]) => void,
) {
  for (let cursor of source) {
    action([cursor.key, cursor.value])
  }
}
