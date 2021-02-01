import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'
import { get_current } from './get_current'

export function evaluate<T>(
  tree: BPlusTree<T>,
  id: number,
  pos: number,
): Cursor<T> {
  let cur = tree.nodes.get(id)
  while (cur) {
    let len = cur.pointers.length
    if (pos >= len) {
      cur = cur.right
      pos -= len
    } else if (len < 0) {
      cur = cur.left
      pos += cur.pointers.length
    } else {
      return get_current(cur, pos)
    }
  }
}
