import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { update } from './update'

export function delete_in_node(this: BPlusTree, node: Node, key: ValueType) {
  if (node.keys.indexOf(key) == -1) {
    return
  }

  // Ищем позицию удаляемого ключа
  let pos = 0
  while (pos < node.key_num && node.keys[pos] < key) {
    ++pos
  }

  // Удаляем ключ
  for (let i = pos; i <= node.key_num - 1; i++) {
    node.keys[i] = node.keys[i + 1]
    node.pointers[i] = node.pointers[i + 1]
  }
  for (let i = pos + 1; i <= node.key_num; i++) {
    node.children[i] = node.children[i + 1]
  }

  --node.key_num

  if (node.key_num < this.t - 1) {
    const right_sibling = node.right
    const left_sibling = node.left
    if (left_sibling != null && left_sibling.key_num > this.t - 1) {
      --left_sibling.key_num
      ++node.key_num

      // Перемещаем максимальный из left_sibling ключ на первую позицию в tec
      for (let i = 1; i <= node.key_num - 1; i++) {
        node.keys[i] = node.keys[i - 1]
        node.pointers[i] = node.pointers[i - 1]
        node.children[i] = node.children[i - 1]
      }
      node.children[node.key_num] = node.children[node.key_num - 1]
      node.keys[0] = left_sibling.keys[left_sibling.key_num]
      node.pointers[0] = left_sibling.pointers[left_sibling.key_num]
      node.children[0] = left_sibling.children[left_sibling.key_num + 1]

      update.call(node) // Обновить ключи на пути к корню
    } else if (right_sibling != null && right_sibling.key_num > this.t - 1) {
      --right_sibling.key_num
      ++node.key_num

      // Перемещаем минимальный из right_sibling ключ на последнюю позицию в tec
      node.keys[node.key_num - 1] = right_sibling.keys[0]
      node.pointers[node.key_num - 1] = right_sibling.pointers[0]
      node.children[node.key_num - 1] = right_sibling.children[0]

      update.call(node) // Обновить ключи на пути к корню
    } else if (left_sibling != null) {
      // Сливаем tec и left_sibling
      for (let i = 0; i <= node.key_num - 1; i++) {
        left_sibling.keys[left_sibling.key_num] = node.keys[i]
        left_sibling.pointers[left_sibling.key_num] = node.pointers[i]
        left_sibling.children[left_sibling.key_num + 1] = node.children[i]
        ++left_sibling.key_num
      }
      left_sibling.children[left_sibling.key_num + 1] =
        node.children[node.key_num]

      // Перенаправляем right и left указатели
      left_sibling.right = node.right
      node.right.left = left_sibling

      update.call(left_sibling) // Обновить ключи на пути к корню
      delete_in_node.call(this, node, left_sibling.parent, node.min()) // Удаляем разделительный ключ в отце
    } else {
      // Сливаем tec и right_sibling
      for (let i = 0; i <= node.key_num - 1; i++) {
        node.keys[node.key_num] = right_sibling.keys[i]
        node.pointers[node.key_num] = right_sibling.pointers[i]
        node.children[node.key_num + 1] = right_sibling.children[i]
        ++node.key_num
      }
      node.children[node.key_num + 1] =
        right_sibling.children[right_sibling.key_num]

      // Перенаправляем right и left указатели
      right_sibling.right.left = node
      node.right = right_sibling.right

      update.call(node) // Обновить ключи на пути к корню
      delete_in_node.call(this, node, node.parent, right_sibling.min()) // Удаляем разделительный ключ в отце
    }
  }
}
