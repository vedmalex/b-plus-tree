/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key(a: Array<any>, key: any) {
  const len = a.length
  let res = len
  for (let i = len - 1; i >= 0; i--) {
    if (key < a[i]) {
      res = i
      break
    }
  }
  return res
}
