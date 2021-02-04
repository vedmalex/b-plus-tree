import { ValueType } from '../../../ValueType'
import { Cursor } from '../../../eval/Cursor'

export async function $forEach<T>(
  source: AsyncIterable<Cursor<T>>,
  action: (value: [ValueType, T]) => void,
) {
  for await (let cursor of source) {
    action([cursor.key, cursor.value])
  }
}
