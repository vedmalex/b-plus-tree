import { Node, update_min_max, update_state } from '../types/Node'

// export function borrow_left(node: Node, count: number) {
//   const left_sibling = node.left

//   merge_with_left(node, left_sibling, count)

//   // node.commit()
//   // left_sibling.commit()
// }

export function merge_with_left(node: Node, left_sibling: Node, count: number) {
  console.log(`${left_sibling.id} >${count}> ${node.id}`)
  console.log(`borrow_left:before`)
  left_sibling.print()
  node.print()
  if (node.leaf) {
    node.keys.unshift(...left_sibling.keys.splice(-count))
    node.pointers.unshift(...left_sibling.pointers.splice(-count))
    // update node
    update_state(node)

    // update and push all needed max and min
    update_min_max(node)

    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    const nodeEmpty = node.keys.length == 0
    const leftEmpty = left_sibling.keys.length == 0

    if (leftEmpty) {
      node.keys.unshift(node.min)
    } else if (node.isEmpty) {
      node.keys.unshift(...left_sibling.keys.splice(-(count - 1)))
      // remove left because it is not balanced with children we have
      left_sibling.keys.pop()
    } else {
      if (node.keys.length == 0) {
        node.keys.unshift(left_sibling.min, ...left_sibling.keys.splice(-count))
        node.keys.pop()
      } else {
        node.keys.unshift(...left_sibling.keys.splice(-count))
      }
    }

    const nodes = node.tree.nodes
    node.children.unshift(
      ...left_sibling.children.splice(-count).map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)
    // update and push all needed max and min
    update_min_max(node)
    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
  console.log(`borrow_left:after`)
  left_sibling.print()
  node.print()
}

// export function merge_with_left(node: Node, left_sibling: Node) {
//   console.log(`${left_sibling.id} >>> ${node.id}`)

//   console.log(`merge_with_left:before`)
//   left_sibling.print()
//   node.print()
//   if (node.leaf) {
//     node.keys.unshift(...left_sibling.keys.splice(0))
//     node.pointers.unshift(...left_sibling.pointers.splice(0))
//     // update node
//     update_state(node)

//     // update and push all needed max and min
//     update_min_max(node)

//     // update sibling
//     update_state(left_sibling)

//     update_min_max(left_sibling)

//     // not pushin up because we in process of attaching
//     // not updating parent yet
//   } else {
//     node.keys.unshift(node.min, ...left_sibling.keys.splice(0))
//     // remove left because it is not balanced with children we have
//     // left_sibling.keys.pop()

//     const nodes = node.tree.nodes
//     node.children.unshift(
//       ...left_sibling.children.splice(0).map((c) => {
//         nodes.get(c).parent = node
//         return c
//       }),
//     )

//     // update node
//     update_state(node)
//     // update and push all needed max and min
//     update_min_max(node)
//     // update sibling
//     update_state(left_sibling)

//     update_min_max(left_sibling)
//     // not pushin up because we in process of attaching
//     // not updating parent yet
//   }
//   console.log(`merge_with_left:after`)
//   left_sibling.print()
//   node.print()
// }
