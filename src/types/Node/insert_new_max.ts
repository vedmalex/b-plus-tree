import { ValueType } from '../ValueType'
import { Node } from '../Node'

export function insert_new_max<T>(node: Node<T>, key: ValueType) {
  // console.log(`insert_new_max ${node.id} ${key}`)
  node.max = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    if (parent.children.indexOf(cur.id) == parent.key_num) {
      parent.max = key
      cur = parent
    } else break
  }
}
