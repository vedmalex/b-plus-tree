import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'

export function unregister_node(tree: BPlusTree, node: Node) {
  // console.log(`unregister ${node.id}`)
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  node.tree = undefined
  tree.nodes.delete(node.id)
}
