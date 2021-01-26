/**
 * search index of first appearance of the item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_first_key(a: Array<any>, key: any) {
  const len = a.length
  let res = len
  for (let i = 0; i < len; i++) {
    if (key <= a[i]) {
      res = i
      break
    }
  }
  return res
}
