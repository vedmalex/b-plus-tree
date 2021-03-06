import { ValueType } from '../ValueType'
import { evaluate } from './evaluate'
import { find_first } from './find_first'
import { BPlusTree } from '../BPlusTree'
import { Cursor } from './Cursor'
import { SearchOptions } from './SearchOptions'

// можно сделать мемоизацию на операцию, кэш значений для поиска

export function find<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  options?: Partial<SearchOptions>,
) {
  const { skip = 0, forward = true, take: initial_take = -1 } = options ?? {}
  let { take = -1 } = options ?? {}
  const result: Array<T> = []
  const cursor = find_first<T, K>(tree, key, forward)
  if (cursor.pos >= 0) {
    let cur: Cursor<T, K>
    if (skip == 0) {
      cur = cursor
    } else {
      cur = evaluate(tree, cursor.node, cursor.pos + (forward ? skip : -skip))
    }
    if (!cur.done) {
      if (cur.key == key) {
        if (take == -1 && initial_take != -1) {
          result.push(cur.value)
        } else {
          while (cur || take == 0) {
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
  }
  return result
}
