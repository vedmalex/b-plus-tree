import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { findLastPosToInsert } from './findLastPosToInsert'
import { ValueType } from '../btree'
import { reflow } from './reflow'

export function split(tree: BPlusTree, node: Node) {
  //Создаем новый узел
  let new_node = node.leaf ? Node.createLeaf(tree.t) : Node.createNode(tree.t)
  // Перенаправляем right и left указатели
  node.addSiblingAtRight(new_node)

  // продолжаем
  if (node.leaf) {
    const keys = node.keys.splice(tree.t)
    const values = node.pointers.splice(tree.t)
    const data = keys.map((k, i) => [k, values[i]]) as Array<[ValueType, any]>
    new_node.insertMany(...data)
  } else {
    new_node.insertMany(...node.children.splice(tree.t))
  }

  node.updateStatics()
  new_node.updateStatics()

  if (node == tree.root) {
    tree.root = Node.createRootFrom(tree.t, node, new_node)
  } else {
    const parent = node.parent
    parent.insert(new_node)
    // reflow(this, new_node)
    if (parent.size >= tree.t * 2) {
      split(tree, parent)
    }
  }
  // фиксируем размеры массива освобождая память
  new_node.commit()
  node.commit()
}
