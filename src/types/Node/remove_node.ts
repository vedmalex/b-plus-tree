import { insert_new_min } from './insert_new_min'
import { insert_new_max } from './insert_new_max'
import { update_state } from './update_state'
import { Node } from '../Node'
import { remove_sibling } from '../../methods/chainable/remove_sibling'
import { ValueType } from '../ValueType'

export function remove_node<T, K extends ValueType>(
  obj: Node<T, K>,
  item: Node<T, K>,
): Node<T, K> {
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
  return item
}
