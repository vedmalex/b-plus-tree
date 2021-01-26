import { Node } from '../types/Node'

export function borrow_left(node: Node, count: number = 1) {
  let cur = node

  // while (cur) {
  const left_sibling = cur.left

  if (node.leaf) {
    node.keys.unshift(
      ...left_sibling.keys.splice(left_sibling.keys.length - count),
    )
    node.pointers.unshift(
      ...left_sibling.pointers.splice(left_sibling.pointers.length - count),
    )
  } else {
    node.keys.unshift(
      left_sibling.max,
      ...left_sibling.keys.splice(left_sibling.keys.length - count - 1),
    )
    node.children.unshift(
      ...left_sibling.children
        .splice(left_sibling.children.length - count)
        .map((c) => {
          c.parent = node
          return c
        }),
    )
  }
  left_sibling.updateStatics()
  // for (let i = 0; i < count; i++) {
  //   // занимаем крайний слева
  //   const item = left_sibling.remove(left_sibling.max)
  //   cur.insert(item)
  //   left_sibling.updateStatics()
  // }

  cur.commit()
  //   if (left_sibling.isEmpty) {
  //     cur = left_sibling
  //   } else {
  //     break
  //   }
  // }
}
