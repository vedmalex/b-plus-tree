import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'
import { Cursor } from '../types/eval/Cursor'
import { delete_by_cursor_list } from './delete_by_cursor_list'

export function remove_specific<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  specific: (pointers: T) => boolean,
): Array<[K, T]> {
  const cursors: Array<Cursor<T, K>> = []
  for (const the_one of tree.equalsNulls(key)(tree)) {
    if (specific(the_one.value)) {
      cursors.push(the_one)
    }
  }
  return delete_by_cursor_list<T, K>(tree, cursors)
}
