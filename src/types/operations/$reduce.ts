import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $forwardIterator } from '../iterators/$forwardIterator'
import { $filter } from '../iterators/$filter'

export function $reduce<T, E, D>(
  tree: BPlusTree<T>,
  reducer: (cur: T | E, res: D) => D,
  filter?: (value: [ValueType, T]) => boolean,
  initial?: D,
): D {
  const iterator = filter ? $filter(tree, filter) : $forwardIterator(tree)
  let result = initial
  for (let current of iterator) {
    result = reducer(current.value, result)
  }
  return result
}
