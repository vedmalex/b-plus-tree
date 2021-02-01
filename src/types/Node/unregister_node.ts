import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'

export function unregister_node<T>(tree: BPlusTree<T>, node: Node<T>) {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  node.tree = undefined
  tree.nodes.delete(node.id)
}
