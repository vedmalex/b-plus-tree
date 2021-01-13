import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { update } from './update'
import { findPosInsert, findFast } from './find_key'

export function delete_in_node(this: BPlusTree, node: Node, key: ValueType) {
  if (key == 13) debugger
  if (node.keys.indexOf(key) == -1) {
    return
  }

  // Ищем позицию удаляемого ключа
  let pos = findFast(node.keys, key)

  // Удаляем ключ
  node.keys.splice(pos, 1)
  node.pointers.splice(pos, 1)
  if (!node.leaf) {
    node.children.splice(pos + 1, 1)
  }

  node.updateKeyNum()

  if (node.key_num < this.t - 1) {
    const right_sibling = node.right
    const left_sibling = node.left

    //1. слева есть откуда брать и количество элементов достаточно
    if (left_sibling != null && left_sibling.key_num > this.t - 1) {
      // занимаем крайний слева
      // Перемещаем максимальный из left_sibling ключ на первую позицию в tec
      node.keys.unshift(left_sibling.keys.pop())
      node.pointers.unshift(left_sibling.pointers.pop())
      if (!node.leaf) {
        node.children.unshift(left_sibling.children.pop())
      }

      left_sibling.updateMetrics()
      node.updateMetrics()
      update.call(node) // Обновить ключи на пути к корню
    }
    // 2. крайний справа элемент есть и в нем достаточно элементов для займа
    else if (right_sibling != null && right_sibling.key_num > this.t - 1) {
      // Перемещаем минимальный из right_sibling ключ на последнюю позицию в tec

      node.keys.push(right_sibling.keys.shift())
      node.pointers.push(right_sibling.pointers.shift())
      if (!node.leaf) {
        node.children.push(right_sibling.children.shift())
      }

      right_sibling.updateMetrics()
      node.updateMetrics()
      update.call(node) // Обновить ключи на пути к корню
    }
    // занять не у кого
    // слева не пустой элемент
    else {
      if (left_sibling != null) {
        // Сливаем tec и left_sibling
        left_sibling.keys.push(...node.keys)
        left_sibling.pointers.push(...node.pointers)
        if (!node.leaf) {
          left_sibling.children.push(...node.children)
        }

        node.keys.length = 0
        node.pointers.length = 0
        if (!node.leaf) {
          node.children.length = 0
        }
        // Перенаправляем right и left указатели
        left_sibling.right = node.right
        if (node.right) node.right.left = left_sibling

        left_sibling.updateMetrics()
        update.call(left_sibling) // Обновить ключи на пути к корню
        delete_in_node.call(this, left_sibling.parent, node.min) // Удаляем разделительный ключ в отце
      } else {
        // Сливаем tec и right_sibling
        node.keys.push(...right_sibling.keys)
        node.pointers.push(...right_sibling.pointers)
        if (!node.leaf) {
          node.children.push(...right_sibling.children)
        }

        right_sibling.keys.length = 0
        right_sibling.pointers.length = 0
        if (!right_sibling.leaf) {
          right_sibling.children.length = 0
        }
        // Перенаправляем right и left указатели
        node.right = right_sibling.right
        if (right_sibling.right) right_sibling.right.left = node

        node.updateMetrics()
        update.call(node) // Обновить ключи на пути к корню
        delete_in_node.call(this, node, node.parent, node.min) // Удаляем разделительный ключ в отце
      }
    }
    // if (this.root.key_num == 0) {
    //   this.root = this.root.children[0]
    // }
  }
  node.commit()
}
