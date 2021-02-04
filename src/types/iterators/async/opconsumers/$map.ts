import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function* $map<T, D>(
  source: AsyncIterable<Cursor<T>>,
  func: (value: [ValueType, T]) => D,
): AsyncIterable<Cursor<D>> {
  for await (let cursor of source) {
    yield {
      ...cursor,
      value: func([cursor.key, cursor.value]),
    }
  }
}
