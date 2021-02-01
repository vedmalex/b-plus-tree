import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { merge_with_left } from './borrow_left'
import { can_borrow_left } from './can_borrow_left'
import { attach_one_to_right_after } from './attach_one_to_right'
import { add_sibling } from './chainable/add_sibling'

export function split(tree: BPlusTree, node: Node) {
  //Создаем новый узел
  let new_node = node.leaf ? Node.createLeaf(tree) : Node.createNode(tree)
  // Перенаправляем right и left указатели
  add_sibling(node, new_node, 'right')

  let bl = can_borrow_left(new_node)
  merge_with_left(new_node, node, bl)

  if (node.id == tree.root) {
    tree.root = Node.createRootFrom(tree, node, new_node).id
  } else {
    const parent = node.parent
    attach_one_to_right_after(parent, new_node, node)
    if (parent.isFull) {
      split(tree, parent)
    }
  }
  new_node.commit()
}
