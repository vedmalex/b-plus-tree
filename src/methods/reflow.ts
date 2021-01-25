import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { borrow_left } from './borrow_left'
import { borrow_right } from './borrow_right'
import { can_borrow_left } from './can_borrow_left'
import { can_borrow_right } from './can_borrow_right'

export function reflow(tree: BPlusTree, node: Node) {
  if (node) {
    if (node.key_num < tree.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      //1. слева есть откуда брать и количество элементов достаточно
      if (can_borrow_left(tree, node)) {
        borrow_left(node)
      }
      // 2. крайний справа элемент есть и в нем достаточно элементов для займа
      else if (can_borrow_right(tree, node)) {
        borrow_right(node)
      }

      // занять не у кого
      // слева не пустой элемент
      else {
        if (left_sibling) {
          while (!node.isEmpty) {
            const item = node.remove(node.min)
            if (
              (item instanceof Node && !item.isEmpty) ||
              Array.isArray(item)
            ) {
              left_sibling.insert(item)
            }
            node.updateStatics()
            left_sibling.updateStatics()
          }
          left_sibling.removeSiblingAtRight()
          const parent = node.parent
          if (parent) {
            parent.remove(node)
          }
          node.commit()
          reflow(tree, parent)
          reflow(tree, left_sibling.parent)
        } else if (right_sibling) {
          while (!node.isEmpty) {
            const item = node.remove(node.min)
            right_sibling.insert(item)
            node.updateStatics()
            right_sibling.updateStatics()
          }
          right_sibling.removeSiblingAtLeft()
          const parent = node.parent
          if (parent) {
            parent.remove(node)
          }
          node.commit()
          reflow(tree, parent)
          reflow(tree, right_sibling.parent)
        } else if (node.isEmpty) {
          const parent = node.parent
          node.right?.removeSiblingAtLeft()
          node.left?.removeSiblingAtRight()
          if (parent) {
            parent.remove(node)
          }
          reflow(tree, parent)
          node.commit()
        }
      }
    } else {
      node.commit()
    }
  }
}
