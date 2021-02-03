import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $reduce } from './$reduce'

export function $distinct<T>(
  tree: BPlusTree<T>,
  filter?: (value: [ValueType, T]) => boolean,
) {
  return $reduce(
    tree,
    (cur, res) => {
      res.add(cur)
      return res
    },
    filter,
    new Set(),
  )
}
