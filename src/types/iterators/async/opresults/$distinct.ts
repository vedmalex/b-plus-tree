import { $reduce } from './$reduce'
import { Cursor } from '../../../eval/Cursor'

export function $distinct<T>(source: AsyncIterable<Cursor<T>>) {
  return $reduce<T, Set<T>>(
    source,
    (cur, res) => {
      res.add(cur)
      return res
    },
    new Set(),
  )
}
