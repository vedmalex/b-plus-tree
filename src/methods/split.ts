import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { borrow_left } from './borrow_left'
import { can_borrow_left } from './can_borrow_left'
import { attach_one_to_right_after } from './attach_one_to_right'

export function split(tree: BPlusTree, node: Node) {
  //Создаем новый узел
  let new_node = node.leaf ? Node.createLeaf(tree) : Node.createNode(tree)
  // Перенаправляем right и left указатели
  node.addSiblingAtRight(new_node)

  let bl = can_borrow_left(new_node)
  borrow_left(new_node, bl)

  node.updateStatics()
  new_node.updateStatics()

  if (node == tree.root) {
    tree.root = Node.createRootFrom(tree, node, new_node)
  } else {
    const parent = node.parent
    attach_one_to_right_after(parent, new_node, node)
    if (parent.isFull) {
      // if (parent.size >= tree.t * 2) {
      split(tree, parent)
    }
  }
  // фиксируем размеры массива освобождая память
  new_node.commit()
  node.commit()
}
