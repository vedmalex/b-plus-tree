import { ValueType } from '../ValueType'
import { Node } from '../Node'

export function replace_max<T, K extends ValueType>(node: Node<T, K>, key: K) {
  node.max = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos == parent.children.length - 1) {
      parent.max = key
      cur = parent
    } else break
  }
}
