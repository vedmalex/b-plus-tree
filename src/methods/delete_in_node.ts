import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { reflow } from './reflow'
import { find_first_item } from './find_first_item'

export function delete_in_node(
  tree: BPlusTree,
  node: Node,
  key: ValueType,
  all: boolean = false,
) {
  if (all) {
    while (find_first_item(node.keys, key) != -1) {
      node.remove(key)
    }
  } else {
    node.remove(key)
  }
  reflow(tree, node)
  if (tree.root.size == 1 && !tree.root.leaf) {
    const node = tree.root
    const nodes = node.tree.nodes
    tree.root = nodes.get(tree.root.children.pop())
    tree.root.parent = undefined
    node.delete()
  }
}
