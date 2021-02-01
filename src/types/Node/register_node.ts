import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'

export function register_node<T>(tree: BPlusTree<T>, node: Node<T>) {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  node.tree = tree
  node.id = tree.get_next_id()
  tree.nodes.set(node.id, node)
  // console.log(`register ${node.id}`)
}
