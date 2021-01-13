import { ValueType } from '../btree'
/**
 * fast search of item index in ordered array of items
 * @param a ordered array to find value
 * @param key value to find
 * @param comparator compare key against current item
 * @returns result element
 */
export function findFast<T>(
  a: T[],
  key: T,
  comparator: (key, item) => number = (key, item) => key - item,
) {
  // l, r — левая и правая границы
  let l = -1
  let r = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = Math.ceil((l + r) / 2) // m — середина области поиска
    if (comparator(key, a[m]) > 0) l = m
    else r = m // Сужение границ
  }
  return a[r] == key ? r : -1
}
