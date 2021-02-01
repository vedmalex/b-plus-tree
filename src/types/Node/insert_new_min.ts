import { ValueType } from '../ValueType'
import { Node } from '../Node'

export function insert_new_min<T>(node: Node<T>, key: ValueType) {
  // console.log(`insert_new_min ${node.id}`)
  node.min = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}
