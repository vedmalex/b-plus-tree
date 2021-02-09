export function get_items_from_array_slice<T, K>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}) {
  let result: T[]
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    result = array.slice(start, end)
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    result = array.slice(start, end)
    result.reverse()
  }
  return result
}

export function get_items_from_Array<T>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}) {
  const result = []
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    for (let i = start; i < end; i++) result.push(array[i])
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    for (let i = start; i > end; i--) result.push(array[i])
  }
  return result
}
