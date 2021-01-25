import { Node } from './Node'
import { ValueType } from '../btree'
import { BPlusTree } from './BPlusTree'
import { getItems } from './getItems'

function get_items_from_array({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<any>
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

// сравнить reverse() и обход с конца и с начала
export function walkthrought({
  tree,
  key = undefined,
  skip = 0,
  take = -1,
  forward = false,
}: {
  tree: BPlusTree
  key?: ValueType
  skip?: number
  take?: number
  forward?: boolean
}) {
  let node: Node
  if (key === undefined) {
    // если ключ поиска не задан
    node = forward
      ? // ищем первый элемент
        tree.find_first_node(tree.min())
      : // или последний
        tree.find_last_node(tree.max())
  } else {
    // ищем заданный элемент
    node = forward ? tree.find_first_node(key) : tree.find_last_node(key)
  }
  let result = []
  let toBeSkipped = skip
  let taken = take
  do {
    const lres = getItems(node, key)
    // const lres = getData(node)
    if (lres.length > 0) {
      const resLen = lres.length
      let lskip = toBeSkipped
      if (toBeSkipped > 0) {
        lskip -= resLen
      }
      if (lskip <= 0) {
        if (taken == -1) {
          // или берем все или только часть вырезаем
          if (toBeSkipped == 0) {
            result.push(...get_items_from_array({ forward, array: lres }))
          } else {
            // вырезаем от начального элемента
            result.push(
              ...get_items_from_array({
                forward,
                array: lres,
                skip: toBeSkipped,
              }),
            )
            // следующий слок читаем сначала
            toBeSkipped = 0
          }
        } else {
          if (toBeSkipped + taken > 0 && toBeSkipped + taken < resLen) {
            result.push(
              ...get_items_from_array({
                forward,
                array: lres,
                skip: toBeSkipped,
                take: taken,
              }),
            )
            taken = 0
            break
          } else if (toBeSkipped + taken > 0 && toBeSkipped + taken >= resLen) {
            if (toBeSkipped == 0) {
              result.push(...get_items_from_array({ forward, array: lres }))
            } else {
              result.push(
                ...get_items_from_array({
                  forward,
                  array: lres,
                  skip: toBeSkipped,
                }),
              )
            }
            taken -= resLen - toBeSkipped
            toBeSkipped = 0
          } else {
            // skipped + taken == 0
            // мы полуили все что нужно
            // и тут оказались случайно
            break
          }
        }
      } else {
        toBeSkipped = lskip
      }
      node = forward ? node.right : node.left
    } else {
      // первый элемент не найден в дереве
      break
    }
  } while (node != null)
  return result
}
