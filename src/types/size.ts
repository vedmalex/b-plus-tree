import { Node } from './Node'

export function size(node: Node) {
  let lres = 0
  let start = 0
  let i = start
  if (node.leaf) {
    return node.key_num
  } else {
    const len = node.size
    while (i < len) {
      const res = size(node.children[i])
      lres += res
      i++
    }
    return lres
  }
}
