import { evaluate } from './evaluate'
import { find_first } from './find_first'
import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'
import { SearchOptions } from './SearchOptions'

export function list(tree: BPlusTree, options?: Partial<SearchOptions>) {
  let { skip = 0, take = -1, forward = true } = options ?? {}
  const result = []
  const key = options.forward ? tree.min() : tree.max()
  const cursor = find_first(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor
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