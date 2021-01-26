import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { find_last_pos_to_insert } from './find_last_pos_to_insert'
import { ValueType } from '../btree'
import { reflow } from './reflow'
import { borrow_left } from './borrow_left'
import { can_borrow_left } from './can_borrow_left'

export function split(tree: BPlusTree, node: Node) {
  //Создаем новый узел
  let new_node = node.leaf ? Node.createLeaf(tree.t) : Node.createNode(tree.t)
  // Перенаправляем right и left указатели
  node.addSiblingAtRight(new_node)

  let bl = can_borrow_left(new_node)
  borrow_left(new_node, bl)

  node.updateStatics()
  new_node.updateStatics()

  if (node == tree.root) {
    tree.root = Node.createRootFrom(tree.t, node, new_node)
  } else {
    const parent = node.parent
    parent.insert(new_node)
    if (parent.size >= tree.t * 2) {
      split(tree, parent)
    }
  }
  // фиксируем размеры массива освобождая память
  new_node.commit()
  node.commit()
}
