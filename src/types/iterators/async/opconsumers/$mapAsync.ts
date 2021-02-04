import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function* $mapAsync<T, D>(
  source: AsyncIterable<Cursor<T>>,
  func: (value: [ValueType, T]) => Promise<D>,
): AsyncIterable<Cursor<D>> {
  for await (let cursor of source) {
    yield {
      ...cursor,
      value: await func([cursor.key, cursor.value]),
    }
  }
}
