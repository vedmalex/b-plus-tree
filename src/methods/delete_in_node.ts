import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'

export function delete_in_node(this: BPlusTree, node: Node, key: ValueType) {
  if (node.keys.indexOf(key) == -1) {
    return
  }

  node.remove(key)
  node.updateStatics()

  if (node.key_num < this.t - 1) {
    const right_sibling = node.right
    const left_sibling = node.left

    //1. слева есть откуда брать и количество элементов достаточно
    if (left_sibling?.key_num > this.t - 1) {
      // занимаем крайний слева
      const item = left_sibling.remove(left_sibling.max)
      node.insert(item)
      node.updateStatics()
      left_sibling.updateStatics()
    }
    // 2. крайний справа элемент есть и в нем достаточно элементов для займа
    else if (right_sibling?.key_num > this.t - 1) {
      // Перемещаем минимальный из right_sibling ключ на последнюю позицию в tec
      const item = right_sibling.remove(right_sibling.min)
      node.insert(item)
      node.updateStatics()
      right_sibling.updateStatics()
    }
    // занять не у кого
    // слева не пустой элемент
    else {
      if (left_sibling) {
        while (!node.isEmpty) {
          const item = node.remove(node.min)
          left_sibling.insert(item)
          node.updateStatics()
          left_sibling.updateStatics()
        }

        left_sibling.removeSiblingAtRight()
        left_sibling.updateStatics()
        delete_in_node.call(this, left_sibling.parent, node.min) // Удаляем разделительный ключ в отце
      } else if (right_sibling) {
        while (right_sibling?.isEmpty) {
          const item = right_sibling.remove(node.min)
          node.insert(item)
          right_sibling.updateStatics()
          node.updateStatics()
        }

        node.removeSiblingAtRight()
        node.updateStatics()
        delete_in_node.call(this, node, node.parent, node.min) // Удаляем разделительный ключ в отце
      }
    }
    if (this.root.size == 1 && !this.root.leaf) {
      this.root = this.root.children[0]
    }
  }
}
