import { Node } from '../Node'
import { remove_sibling } from '../../methods/chainable/remove_sibling'

export function push_node_up(node: Node) {
  // console.log(`push_node_up ${node.id}`)
  const child = node.tree.nodes.get(node.children.pop())
  const parent = node.parent
  // вставляем на прямо на то же место где и был
  const pos = parent.children.indexOf(node.id)
  parent.children[pos] = child.id
  child.parent = parent
  if (node.right) remove_sibling(node.right, 'left')
  if (node.left) remove_sibling(node.left, 'right')
  node.parent = undefined
  node.delete()
  parent.commit()
}
