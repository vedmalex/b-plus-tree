import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { findPosInsert } from './findPosInsert'
import { ValueType } from '../btree'
import { reflow } from './reflow'

export function split(this: BPlusTree, node: Node) {
  //Создаем новый узел
  let new_node = node.leaf ? Node.createLeaf(this.t) : Node.createNode(this.t)
  // Перенаправляем right и left указатели
  node.addSiblingAtRight(new_node)

  // продолжаем
  if (node.leaf) {
    const keys = node.keys.splice(this.t)
    const values = node.pointers.splice(this.t)
    const data = keys.map((k, i) => [k, values[i]]) as Array<[ValueType, any]>
    new_node.insertMany(...data)
  } else {
    new_node.insertMany(...node.children.splice(this.t))
  }

  node.updateStatics()
  new_node.updateStatics()

  if (node == this.root) {
    this.root = Node.createRootFrom(this.t, node, new_node)
  } else {
    const parent = node.parent
    parent.insert(new_node)
    // reflow.call(this, new_node)
    if (parent.size >= this.t * 2) {
      split.call(this, parent)
    }
  }
  // фиксируем размеры массива освобождая память
  new_node.commit()
  node.commit()
}
