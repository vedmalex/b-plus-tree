import { Node } from '../Node'
import { Cursor } from './Cursor'
import { ValueType } from '../ValueType'

export function get_current<T, K extends ValueType>(
  cur: Node<T, K>,
  pos: number,
): Cursor<T, K> {
  const value = cur.pointers[pos]
  return {
    node: cur.id,
    pos,
    key: cur.keys[pos],
    value,
    done: value === undefined,
  }
}
