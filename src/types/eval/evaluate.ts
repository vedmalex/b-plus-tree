import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'
import { get_current } from './get_current'
import { ValueType } from '../ValueType'

export function evaluate<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  let cur = tree.nodes.get(id)
  while (cur) {
    const len = cur.pointers.length
    if (pos >= len) {
      cur = cur.right
      pos -= len
    } else if (pos < 0) {
      cur = cur.left
      if (cur) {
        pos += cur.pointers.length
      }
    } else {
      return get_current(cur, pos)
    }
  }
  return {
    node: undefined,
    pos: undefined,
    key: undefined,
    value: undefined,
    done: true,
  }
}
