import { ValueType } from '../ValueType'
import { Node } from '../Node'

export function replace_min<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.min = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
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
