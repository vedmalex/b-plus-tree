import { ValueType } from '../../ValueType'
import { Cursor } from '../../eval/Cursor'

export async function $forEachAsync<T>(
  source: Iterable<Cursor<T>>,
  action: (value: [ValueType, T]) => Promise<void>,
) {
  for (let value of source) {
    await action([value.key, value.value])
  }
}
