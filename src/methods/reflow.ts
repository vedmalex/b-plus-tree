import { BPlusTree } from '../types/BPlusTree'
import { Node, remove_node } from '../types/Node'
import { borrow_left, merge_with_left } from './borrow_left'
import { borrow_right, merge_with_right } from './borrow_right'
import { can_borrow_left } from './can_borrow_left'
import { can_borrow_right } from './can_borrow_right'

export function reflow(tree: BPlusTree, node: Node) {
  if (node) {
    if (node.key_num < tree.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      let bl = can_borrow_left(node)
      let br = can_borrow_right(node)
      // можем ли взять у соседа данных
      if (bl > 0 || br > 0) {
        // нужно взять до половины
        // берем у кого больше
        if (bl > br) {
          //1. слева есть откуда брать и количество элементов достаточно
          borrow_left(node, bl)
        } else {
          // 2. крайний справа элемент есть и в нем достаточно элементов для займа
          borrow_right(node, br)
        }
      } else {
        // не у кого взять данных - удаляем узел
        if (!node.isEmpty) {
          // слева не пустой элемент
          if (left_sibling) {
            merge_with_right(left_sibling, node, node.size)
            left_sibling.removeSiblingAtRight()
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != left_sibling.parent) reflow(tree, left_sibling.parent)
          } else if (right_sibling) {
            merge_with_left(right_sibling, node, node.size)
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != right_sibling.parent)
              reflow(tree, right_sibling.parent)
          } else if (node.isEmpty) {
            const parent = node.parent
            node.right?.removeSiblingAtLeft()
            node.left?.removeSiblingAtRight()
            if (parent) {
              remove_node(parent, node)
            }
            reflow(tree, parent)
            node.commit()
          }
        } else {
          // пустой узел удалить
          if (left_sibling) {
            left_sibling.removeSiblingAtRight()
          } else if (right_sibling) {
            right_sibling.removeSiblingAtLeft()
          }
          const parent = node.parent
          if (parent) {
            remove_node(parent, node)
          }
          node.commit()
          reflow(tree, parent)
          if (left_sibling) {
            if (parent != left_sibling.parent) {
              reflow(tree, left_sibling.parent)
            }
          } else if (right_sibling) {
            if (parent != right_sibling.parent) {
              reflow(tree, right_sibling.parent)
            }
          }
        }
        //удаляем узел
        node.delete()
      }
    } else {
      node.commit()
    }
  }
}
