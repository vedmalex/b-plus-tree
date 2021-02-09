import { reduce } from './reduce'

export function distinct<T>() {
  return reduce<T, Set<T>>((res, cur) => {
    res.add(cur)
    return res
  }, new Set())
}
