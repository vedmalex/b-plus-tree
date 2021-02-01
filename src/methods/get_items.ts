import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'
import { find_first_item } from './find_first_item'

export function get_items<T>(
  node: Node<T>,
  key: ValueType = undefined,
): Array<T> {
  let start = find_first_item(node.keys, key)
  let i = start
  if (node.leaf) {
    if (key === undefined) {
      return node.pointers
    } else {
      const lres = []
      while (node.keys[i] == key) {
        lres.push(node.pointers[i])
        i++
      }
      return lres
    }
  } else throw new Error('can be uses on leaf nodes only')
}
