/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key(a: Array<any>, key: any) {
  const found = a.find((i) => key < i)
  const res = a.indexOf(found)
  return res > -1 ? res : a.length
}

export function find_last_key_s(a: Array<any>, key: any) {
  const len = a.length
  let res = len
  for (let i = 0; i < len; i++) {
    if (key < a[i]) {
      res = i
      break
    }
  }
  return res
}

export function find_last_key_f(a: Array<any>, key: any) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = Math.trunc((l + r) / 2) // m — середина области поиска
    if (key < a[m]) r = m
    else l = m // Сужение границ
  }
  return r
}
