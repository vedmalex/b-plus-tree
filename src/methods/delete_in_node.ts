import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { reflow } from './reflow'

export function delete_in_node(
  tree: BPlusTree,
  node: Node,
  key: ValueType,
  all: boolean = false,
) {
  if (all) {
    while (node.keys.indexOf(key) != -1) {
      node.remove(key)
    }
  } else {
    node.remove(key)
  }
  reflow(tree, node)
  if (tree.root.size == 1 && !tree.root.leaf) {
    const node = tree.root
    tree.root = tree.root.children.pop()
    tree.root.parent = undefined
    node.delete()
  }
}
