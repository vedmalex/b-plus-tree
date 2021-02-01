import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'

export function pull_up_tree<T>(tree: BPlusTree<T>) {
  const nodes = tree.nodes
  const root = nodes.get(tree.root)
  if (root.size == 1 && !root.leaf) {
    const node = nodes.get(tree.root)
    const new_root = nodes.get(root.children.pop())
    tree.root = new_root.id
    new_root.parent = undefined
    node.delete()
  }
}
