import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'
import { ValueType } from '../ValueType'

export function register_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  node.tree = tree
  node.id = tree.get_next_id()
  tree.nodes.set(node.id, node)
}
