import { ValueType } from '../../ValueType'
import { Cursor } from 'src/types/eval/Cursor'

export function $forEach<T>(
  source: Iterable<Cursor<T>>,
  action: (value: [ValueType, T]) => void,
) {
  for (let value of source) {
    action([value.key, value.value])
  }
}
