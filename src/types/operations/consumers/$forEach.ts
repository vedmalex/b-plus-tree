import { ValueType } from '../../ValueType'
import { BPlusTree } from '../../BPlusTree'
import { $forwardIterator } from '../../iterators/$forwardIterator'

export function $forEach<T>(
  tree: BPlusTree<T>,
  action: (value: [ValueType, T]) => void,
) {
  const iterator = $forwardIterator(tree)
  for (let value of iterator) {
    action([value.key, value.value])
  }
}
