export function find_first_item(array: Array<any>, value: any) {
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
