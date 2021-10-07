import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../types/ValueType'

export function try_to_pull_up_tree<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
): void {
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
