import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export function* $map<T, D>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => D,
): Iterable<Cursor<D>> {
  for (let cursor of source) {
    yield {
      ...cursor,
      value: func([cursor.key, cursor.value]),
    }
  }
}
