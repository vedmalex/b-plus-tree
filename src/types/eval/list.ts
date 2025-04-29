import { evaluate } from './evaluate'
import { find_first } from './find_first'
import type { BPlusTree } from '../BPlusTree'
import type { Cursor } from './Cursor'
import type { SearchOptions } from './SearchOptions'
import type { ValueType } from '../ValueType'

export function list<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  options?: Partial<SearchOptions>,
): Array<T> {
  let { take = -1 } = options ?? {}
  const { skip = 0, forward = true } = options ?? {}
  const result: Array<T> = []
  const key = options.forward ? tree.min : tree.max
  const cursor = find_first(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor<T, K>
    if (skip == 0) {
      cur = cursor
    } else {
      cur = evaluate(tree, cursor.node, cursor.pos + (forward ? skip : -skip))
    }
    if (cur) {
      if (take == -1) {
        result.push(cur.value)
      } else {
        while (cur && take != 0) {
          if (cur.pos >= 0) {
            result.push(cur.value)
            take -= 1
            cur = evaluate(tree, cur.node, cur.pos + (forward ? 1 : -1))
          } else {
            break
          }
        }
      }
    }
  }
  return result
}
