import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function $forEachAsync<T>(
  source: Iterable<Cursor<T>>,
  action: (value: [ValueType, T]) => Promise<void>,
) {
  for (let cursor of source) {
    await action([cursor.key, cursor.value])
  }
}
