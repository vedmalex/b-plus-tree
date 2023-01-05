import { ValueType } from '../types/ValueType'

export function find_first_item_remove<K extends ValueType>(
  a: Array<K>,
  key: K,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (key <= a[m]) {
      r = m
    } else {
      l = m // Сужение границ
    }
  }
  return a[r] == key ? r : -1
}
