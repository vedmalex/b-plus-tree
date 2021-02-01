import { ValueType } from '../types/ValueType'
/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key(a: Array<ValueType>, key: ValueType) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = (l + r) >> 1 // m — середина области поиска
    if (key < a[m]) r = m
    else l = m // Сужение границ
  }
  return r
}
