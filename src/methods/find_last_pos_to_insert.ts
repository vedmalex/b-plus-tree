/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @param comparator compare key against current item
 * @returns the position where the value can be inserted
 */
export function find_last_pos_to_insert<T = number>(
  a: T[],
  key: T,
  comparator: (key: T, item: T) => number = (key: unknown, item: unknown) =>
    (key as number) - (item as number),
) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = Math.ceil((l + r) / 2) // m — середина области поиска
    if (comparator(key, a[m]) < 0) r = m
    else l = m // Сужение границ
  }
  return r
}
