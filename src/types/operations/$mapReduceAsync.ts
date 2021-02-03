import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $forwardIterator } from '../iterators/$forwardIterator'

export async function $mapReduceAsync<T, D, V, O = BPlusTree<V>>({
  tree,
  map,
  reduce,
  finalize,
}: {
  tree: BPlusTree<T>
  map: (inp: [ValueType, T]) => D | Promise<D>
  reduce: (inp: [ValueType, D]) => V | Promise<V>
  finalize?: (inp: BPlusTree<V>) => O | Promise<O>
}): Promise<O> {
  const result = new BPlusTree<V>(tree.t, tree.unique)
  const iterator = $forwardIterator(tree)
  for (let current of iterator) {
    const value = map([current.key, current.value])
    const res = reduce([
      current.key,
      value instanceof Promise ? await value : value,
    ])
    result.insert(current.key, res instanceof Promise ? await res : res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
