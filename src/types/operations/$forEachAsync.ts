import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $forwardIterator } from '../iterators/$forwardIterator'

export async function $forEachAsync<T>(
  tree: BPlusTree<T>,
  action: (value: [ValueType, T]) => Promise<void>,
) {
  const iterator = $forwardIterator(tree)
  for (let value of iterator) {
    await action([value.key, value.value])
  }
}
