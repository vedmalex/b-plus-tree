import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'

export function* $filter<T>(
  source: Iterable<Cursor<T>>,
  filter: (value: [ValueType, T]) => boolean,
): Iterable<Cursor<T>> {
  for (let cursor of source) {
    if (filter([cursor.key, cursor.value])) {
      yield cursor
    }
  }
}
