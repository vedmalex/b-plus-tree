import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function canBorrowLeft(this: BPlusTree, node: Node) {
  let cur = node
  while (cur) {
    if (node.left?.key_num > this.t - 1 && node.left?.key_num > 1) {
      return true
    }
    cur = cur.left
  }
  return false
}
export function canBorrowRight(this: BPlusTree, node: Node) {
  let cur = node
  while (cur) {
    if (node.right?.key_num > this.t - 1 && node.right?.key_num > 1) {
      return true
    }
    cur = cur.right
  }
  return false
}

export function borrowLeft(this: BPlusTree, node: Node, count: number = 1) {
  let cur = node
  while (cur) {
    const left_sibling = node.left
    for (let i = 0; i < count; i++) {
      // занимаем крайний слева
      const item = left_sibling.remove(left_sibling.max)
      node.insert(item)
      left_sibling.updateStatics()
    }
    node.commit()
    if (left_sibling.isEmpty) {
      cur = left_sibling
    } else {
      break
    }
  }
}

export function borrowLeftR(this: BPlusTree, node: Node) {
  const left_sibling = node.left
  // занимаем крайний слева
  const item = left_sibling.remove(left_sibling.max)
  node.insert(item)
  node.updateStatics()
  left_sibling.updateStatics()
  if (left_sibling.isEmpty) {
    borrowLeftR.call(this, left_sibling)
  }
  left_sibling.commit()
}

export function borrowRight(this: BPlusTree, node: Node, count: number = 1) {
  let cur = node
  while (cur) {
    const right_sibling = node.right
    for (let i = 0; i < count; i++) {
      // занимаем крайний слева
      const item = right_sibling.remove(right_sibling.min)
      node.insert(item)
      right_sibling.updateStatics()
    }
    node.commit()
    if (right_sibling.isEmpty) {
      cur = right_sibling
    } else {
      break
    }
  }
}

export function borrowRightR(this: BPlusTree, node: Node) {
  const right_sibling = node.right
  // Перемещаем минимальный из right_sibling ключ на последнюю позицию в tec
  const item = right_sibling.remove(right_sibling.min)
  node.insert(item)
  node.updateStatics()
  right_sibling.updateStatics()
  if (right_sibling.isEmpty) {
    borrowRightR.call(this, right_sibling)
  }
  right_sibling.commit()
}

export function reflow(this: BPlusTree, node: Node) {
  if (node) {
    if (node.key_num < this.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      //1. слева есть откуда брать и количество элементов достаточно
      // if ( left_sibling?.key_num > this.t - 1) {
      if (canBorrowLeft.call(this, node)) {
        borrowLeft.call(this, node)
      }
      // 2. крайний справа элемент есть и в нем достаточно элементов для займа
      // else if (right_sibling?.key_num > this.t - 1) {
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
          // node.removeSiblingAtLeft()
          const parent = node.parent
          if (parent) {
            parent.remove(node)
          }
          node.commit()
          reflow.call(this, parent)
          reflow.call(this, left_sibling.parent)
          // delete_in_node.call(this, left_sibling.parent, node.min) // Удаляем разделительный ключ в отце
        } else if (right_sibling) {
          while (!node.isEmpty) {
            const item = node.remove(node.min)
            right_sibling.insert(item)
            node.updateStatics()
            right_sibling.updateStatics()
          }
          // node.removeSiblingAtRight()
          const parent = node.parent
          if (parent) {
            parent.remove(node)
          }
          node.commit()
          reflow.call(this, parent)
          reflow.call(this, right_sibling.parent)
          // delete_in_node.call(this, right_sibling.parent, right_sibling.min) // Удаляем разделительный ключ в отце
        } else if (node.isEmpty) {
          const parent = node.parent
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
