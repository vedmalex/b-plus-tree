import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function split(this: BPlusTree, node: Node) {
  let new_node = new Node() //Создаем новый узел

  // Перенаправляем right и left указатели
  new_node.right = node.right
  if (node.right) node.right.left = new_node
  node.right = new_node
  new_node.left = node

  // Перемещаем t - 1 значений и соответствующих им указателей в new_node
  const mid_key = node.keys[this.t]
  new_node.key_num = this.t - 1
  node.key_num = this.t
  for (let i = 0; i <= new_node.key_num - 1; i++) {
    new_node.keys[i] = node.keys[i + this.t + 1]
    // if (node.leaf) {
    new_node.pointers[i] = node.pointers[i + this.t + 1]
    // } else {
    new_node.children[i] = node.children[i + this.t + 1]
    // }
  }

  // похоже это если узел не является leaf ???
  new_node.children[new_node.key_num] = node.children[2 * this.t]

  if (node.leaf) {
    ++new_node.key_num
    new_node.leaf = true
    // Перемещаем в new_node оставшийся при разбиении элемент mid_key в начало
    new_node.keys.unshift(node.keys[this.t])
    new_node.pointers.unshift(node.pointers[this.t])
  }

  if (node == this.root) {
    this.root = new Node() // Создаем новый корень T.root
    this.root.keys[0] = mid_key
    this.root.children[0] = node
    this.root.children[1] = new_node
    this.root.key_num = 1
    node.parent = this.root
    new_node.parent = this.root
  } else {
    new_node.parent = node.parent
    const parent = node.parent

    // Ищем позицию mid_key в отце
    let pos = 0
    while (pos < parent.key_num && parent.keys[pos] < mid_key) {
      ++pos
    }

    // Добавляем mid_key в отца и направляем ссылку из него на new_node
    for (let i = parent.key_num; i >= pos + 1; i--) {
      parent.keys[i] = parent.keys[i - 1]
    }
    for (let i = parent.key_num + 1; i >= pos + 2; i--) {
      parent.children[i] = parent.children[i - 1]
    }
    parent.keys[pos] = mid_key
    parent.children[pos + 1] = new_node
    ++parent.key_num

    if (parent.key_num == 2 * this.t) {
      split.call(this, parent)
    }
  }
  // фиксируем размеры массива освобождая память
  new_node.commit()
  node.commit()
}
