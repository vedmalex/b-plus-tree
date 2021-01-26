import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function borrow_right(node: Node, count: number = 1) {
  let cur = node
  while (cur) {
    const right_sibling = cur.right

    if (node.leaf) {
      node.keys.push(...right_sibling.keys.splice(0, count))
      node.pointers.push(...right_sibling.pointers.splice(0, count))
    } else {
      node.keys.push(
        right_sibling.min,
        ...right_sibling.keys.splice(0, count - 1),
      )
      node.children.push(
        ...right_sibling.children.splice(0, count).map((c) => {
          c.parent = node
          return c
        }),
      )
    }
    right_sibling.updateStatics()

    // for (let i = 0; i < count; i++) {
    //   // занимаем крайний слева
    //   const item = right_sibling.remove(right_sibling.min)
    //   cur.insert(item)
    //   right_sibling.updateStatics()
    // }
    cur.commit()
    if (right_sibling.isEmpty) {
      cur = right_sibling
    } else {
      break
    }
  }
}
