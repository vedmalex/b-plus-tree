export function find_first_item(a: Array<any>, key: any) {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  while (l < r - 1) {
    // Запускаем цикл
    let m = (l + r) >> 1 // m — середина области поиска
    if (key <= a[m]) r = m
    else l = m // Сужение границ
  }
  return a[r] == key ? r : -1
}

export function find_first_item_s(array: Array<any>, value: any) {
  const len = array.length
  let res = -1
  for (let i = 0; i < len; i++) {
    if (value == array[i]) {
      res = i
      break
    }
  }
  return res
}
