import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'
import { ValueType } from '../ValueType'

export function unregister_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
) {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  node.tree = undefined
  tree.nodes.delete(node.id)
}
