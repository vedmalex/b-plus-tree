import type { BPlusTree } from '../types/BPlusTree'
import type { Node } from '../types/Node'
import { remove_node } from '../types/Node/remove_node'
import { merge_with_left } from './borrow_left'
import { merge_with_right } from './borrow_right'
import { can_borrow_left } from './can_borrow_left'
import { can_borrow_right } from './can_borrow_right'
import { remove_sibling } from './chainable/remove_sibling'
import type { ValueType } from '../types/ValueType'

export function reflow<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (node) {
    if (node.key_num < tree.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      const bl = can_borrow_left(node)
      const br = can_borrow_right(node)
      // можем ли взять у соседа данных
      if (bl > 0 || br > 0) {
        // нужно взять до половины
        // берем у кого больше
        if (bl > br) {
          //1. слева есть откуда брать и количество элементов достаточно
          merge_with_left(node, left_sibling, bl)
          node.commit()
        } else {
          // 2. крайний справа элемент есть и в нем достаточно элементов для займа
          merge_with_right(node, right_sibling, br)
          node.commit()
        }
        // reflow(tree, parent)
        // if (parent != right_sibling.parent) reflow(tree, right_sibling.parent)
      } else {
        // не у кого взять данных - удаляем узел
        if (!node.isEmpty) {
          // слева не пустой элемент
          if (left_sibling) {
            merge_with_right(left_sibling, node, node.size)
            // left_sibling.removeSiblingAtRight()
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != left_sibling.parent) {
              reflow(tree, left_sibling.parent)
            } else {
              left_sibling.commit()
            }
          } else if (right_sibling) {
            merge_with_left(right_sibling, node, node.size)
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != right_sibling.parent) {
              reflow(tree, right_sibling.parent)
            }
          } else if (node.isEmpty) {
            const parent = node.parent
            if (node.right) remove_sibling(node.right, 'left')
            if (node.left) remove_sibling(node.left, 'right')
            if (parent) {
              remove_node(parent, node)
            }
            reflow(tree, parent)
            node.commit()
          }
        } else {
          // пустой узел удалить
          if (left_sibling) {
            remove_sibling(left_sibling, 'right')
          } else if (right_sibling) {
            remove_sibling(right_sibling, 'left')
          }
          const parent = node.parent
          if (parent) {
            remove_node(parent, node)
          }
          node.commit()
          if (parent) {
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
        }
        //удаляем узел
        node.delete()
      }
    } else {
      node.commit()
    }
  }
}
