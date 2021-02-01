import { insert_new_min } from './insert_new_min'
import { insert_new_max } from './insert_new_max'
import { update_state } from './update_state'
import { Node } from '../Node'
import { remove_sibling } from '../../methods/chainable/remove_sibling'

export function remove_node(obj: Node, item: Node): Node {
  // console.log(`remove_node:start ${obj.id} -${item.id}:`)
  // obj.print()
  const pos = obj.children.indexOf(item.id)
  obj.children.splice(pos, 1)
  if (pos == 0) {
    obj.keys.shift()
  } else {
    obj.keys.splice(pos - 1, 1)
  }
  item.parent = undefined
  if (item.right) remove_sibling(item.right, 'left')
  if (item.left) remove_sibling(item.left, 'right')

  update_state(item)

  update_state(obj)

  const nodes = obj.tree.nodes
  if (pos == 0) {
    const min = nodes.get(obj.children[0])?.min
    insert_new_min(obj, min)
  }
  // as far as we splice last item from node it is now at length position
  if (pos == obj.size) {
    const max = nodes.get(obj.children[obj.key_num])?.max
    insert_new_max(obj, max)
  }
  // console.log(`remove_node:end ${obj.id} -${item.id}:`)
  // obj.print()
  return item
}
