import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $forwardAsyncIterator } from '../iterators/$forwardAsyncIterator'
import { $filterAsync } from '../iterators/$filterAsync'

export async function $reduceAsync<T, E, D>(
  tree: BPlusTree<T>,
  reducer: (cur: T | E, res: D) => D,
  extractor: (value: [ValueType, T]) => Promise<E>,
  filter?: (value: [ValueType, T]) => Promise<boolean>,
  initial?: D,
): Promise<D> {
  const iterator = filter
    ? $filterAsync(tree, filter)
    : $forwardAsyncIterator(tree, extractor)
  let result = initial
  for await (let current of iterator) {
    result = reducer(current.value, result)
  }
  return result
}
