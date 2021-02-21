import { ValueType } from '../types/ValueType'
/**
 * fast search in ordered array
 * @param a array
 * @param key key to find
 * @returns
 */
export function find_first_item<K extends ValueType>(a: Array<K>, key: K) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as any
  while (l < r - 1) {
    // Запускаем цикл
    let m = (l + r) >> 1 // !m — середина области поиска
    if (key > a[m]) {
      l = m // Сужение границ
    } else {
      r = m
    }
  }
  return a[r] == key ? r : -1
}

export function find_first_item_remove<K extends ValueType>(
  a: Array<K>,
  key: K,
) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as any
  while (l < r - 1) {
    // Запускаем цикл
    let m = (l + r) >> 1 // !m — середина области поиска
    if (key <= a[m]) {
      r = m
    } else {
      l = m // Сужение границ
    }
  }
  return a[r] == key ? r : -1
}
