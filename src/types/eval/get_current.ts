import { Node } from '../Node'
import { Cursor } from './Cursor'

export function get_current<T>(cur: Node<T>, pos: number): Cursor<T> {
  const value = cur.pointers[pos]
  return {
    node: cur.id,
    pos,
    key: cur.keys[pos],
    value,
    done: value === undefined,
  }
}
