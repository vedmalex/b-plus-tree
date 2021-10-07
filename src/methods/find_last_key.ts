import { ValueType } from '../types/ValueType'
/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key<K extends ValueType>(
  a: Array<K>,
  key: K,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (key >= a[m]) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  return r
}
