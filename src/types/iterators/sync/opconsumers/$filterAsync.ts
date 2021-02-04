import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function* $filterAsync<T>(
  source: Iterable<Cursor<T>>,
  filter: (value: [ValueType, T]) => Promise<boolean>,
): AsyncIterable<Cursor<T>> {
  for (let cursor of source) {
    if (await filter([cursor.key, cursor.value])) {
      yield cursor
    }
  }
}
