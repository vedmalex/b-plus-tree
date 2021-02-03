import { BPlusTree } from '../BPlusTree'
import { $forwardIterator } from '../iterators/$forwardIterator'

// принимает курсор одного типа возвращает курсор другого типа
// и возвращаемое знанчение
export function $mapReduce<T, D, V, O = BPlusTree<V>>({
  tree,
  map,
  reduce,
  finalize,
}: {
  tree: BPlusTree<T>
  map: (inp: T) => D
  reduce: (inp: D) => V
  finalize?: (inp: BPlusTree<V>) => O
}): O {
  const result = new BPlusTree<V>(tree.t, tree.unique)
  const iterator = $forwardIterator(tree)
  for (let current of iterator) {
    const value = map(current.value)
    const res = reduce(value)
    result.insert(current.key, res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
