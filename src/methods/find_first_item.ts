import { ValueType } from '../types/ValueType'
import { Comparator } from '../types/types'
/**
 * fast search in ordered array
 * @param a array
 * @param key key to find
 * @returns
 */
export function find_first_item<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (comparator(key, a[m]) > 0) {
      l = m // Сужение границ
    } else {
      r = m
    }
  }
  return comparator(a[r], key) == 0 ? r : -1
}
