import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function $every<T>(
  source: AsyncIterable<Cursor<T>>,
  func: (value: [ValueType, T]) => boolean,
) {
  for await (let cursor of source) {
    if (!func([cursor.key, cursor.value])) {
      return false
    }
  }
  return true
}
