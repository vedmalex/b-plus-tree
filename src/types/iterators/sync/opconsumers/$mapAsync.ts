import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function* $mapAsync<T, D>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => Promise<D>,
): AsyncIterable<Cursor<D>> {
  for (let cursor of source) {
    yield {
      ...cursor,
      value: await func([cursor.key, cursor.value]),
    }
  }
}
