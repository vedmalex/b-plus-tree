import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { borrowLeft } from './borrowLeft'
import { borrowRight } from './borrowRight'
import { canBorrowLeft } from './canBorrowLeft'
import { canBorrowRight } from './canBorrowRight'

export function reflow(this: BPlusTree, node: Node) {
  if (node) {
    if (node.key_num < this.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      //1. слева есть откуда брать и количество элементов достаточно
      if (canBorrowLeft.call(this, node)) {
        borrowLeft.call(this, node)
      }
      // 2. крайний справа элемент есть и в нем достаточно элементов для займа
      else if (canBorrowRight.call(this, node)) {
        borrowRight.call(this, node)
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
          reflow.call(this, parent)
          reflow.call(this, left_sibling.parent)
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
          reflow.call(this, parent)
          reflow.call(this, right_sibling.parent)
        } else if (node.isEmpty) {
          const parent = node.parent
          node.right?.removeSiblingAtLeft()
          node.left?.removeSiblingAtRight()
          if (parent) {
            parent.remove(node)
          }
          reflow.call(this, parent)
          node.commit()
        }
      }
    } else {
      node.commit()
    }
  }
}
