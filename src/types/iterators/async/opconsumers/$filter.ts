import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function* $filter<T>(
  source: AsyncIterable<Cursor<T>>,
  filter: (value: [ValueType, T]) => boolean,
): AsyncIterable<Cursor<T>> {
  for await (let cursor of source) {
    if (filter([cursor.key, cursor.value])) {
      yield cursor
    }
  }
}
