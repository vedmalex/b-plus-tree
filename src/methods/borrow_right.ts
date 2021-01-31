import { Node, update_min_max, update_state } from '../types/Node'

// export function borrow_right(node: Node, count: number) {
//   const right_sibling = node.right
//   merge_with_right(node, right_sibling, count)
//   // node.commit()
// }

export function merge_with_right(
  node: Node,
  right_sibling: Node,
  count: number,
) {
  console.log(`${node.id} <${count}< ${right_sibling.id}`)
  console.log(`borrow_right:before`)
  node.print()
  right_sibling.print()
  if (node.leaf) {
    node.keys.push(...right_sibling.keys.splice(0, count))
    node.pointers.push(...right_sibling.pointers.splice(0, count))

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    node.keys.push(
      right_sibling.min,
      ...right_sibling.keys.splice(0, count - 1),
    )

    right_sibling.keys.shift()

    const nodes = node.tree.nodes
    node.children.push(
      ...right_sibling.children.splice(0, count).map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  }
  console.log(`borrow_right:after`)
  node.print()
  right_sibling.print()
}

// export function merge_with_right(node: Node, right_sibling: Node) {
//   console.log(`${node.id} <<< ${right_sibling.id}`)
//   console.log(`merge_with_right:before`)
//   node.print()
//   right_sibling.print()
//   if (node.leaf) {
//     node.keys.push(...right_sibling.keys)
//     node.pointers.push(...right_sibling.pointers)

//     // update node
//     update_state(node)

//     // update and push all needed max and min

//     update_min_max(node)

//     // update sibling
//     update_state(right_sibling)

//     update_min_max(right_sibling)
//     // not pushin up because we in process of attaching
//     // not updating parent yet
//   } else {
//     node.keys.push(right_sibling.min, ...right_sibling.keys.splice(0))

//     const nodes = node.tree.nodes
//     node.children.push(
//       ...right_sibling.children.splice(0).map((c) => {
//         nodes.get(c).parent = node
//         return c
//       }),
//     )

//     // update node
//     update_state(node)

//     // update and push all needed max and min

//     update_min_max(node)

//     // update sibling
//     update_state(right_sibling)

//     update_min_max(right_sibling)

//     // not pushin up because we in process of attaching
//     // not updating parent yet
//   }
//   console.log(`merge_with_right:after`)
//   node.print()
//   right_sibling.print()
// }
