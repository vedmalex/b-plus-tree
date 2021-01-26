import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { BPlusTree } from '../types/BPlusTree'
import { get_items } from './get_items'
import { get_items_from_array } from './get_items_from_array'
import { find_first_node } from './find_first_node'
import { find_last_node } from './find_last_node'

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
        find_first_node(tree, tree.min())
      : // или последний
        find_last_node(tree, tree.max())
  } else {
    // ищем заданный элемент
    node = forward ? find_first_node(tree, key) : find_last_node(tree, key)
  }
  let result = []
  let toBeSkipped = skip
  let taken = take
  do {
    const lres = get_items(node, key)
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
      node = forward ? node.right : node.left
      // break
    }
  } while (node != null)
  return result
}
